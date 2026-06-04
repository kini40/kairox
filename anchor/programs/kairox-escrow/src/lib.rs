//! ──────────────────────────────────────────────────────────
//!  KAIROX Escrow Program  (Anchor 0.30)
//!
//!  PDAs used
//!  ─────────
//!  GameState   : ["game_state"]
//!  PlayerVault : ["player_vault", player_pubkey]
//!  RoundVault  : ["round_vault",  round_id_bytes]   ← holds wagers for one round
//! ──────────────────────────────────────────────────────────

use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("KRXescrow11111111111111111111111111111111111");

// ─── Constants ──────────────────────────────────────────────

pub const MIN_DEPOSIT_LAMPORTS: u64 = 100_000_000;   // 0.1 SOL
pub const MIN_WAGER_LAMPORTS:   u64 =   1_000_000;   // 0.001 SOL
pub const MAX_WAGER_LAMPORTS:   u64 = 10_000_000_000; // 10 SOL
pub const WHALE_THRESHOLD:      u64 =  1_000_000_000; // 1 SOL
pub const HOUSE_EDGE_BPS:       u64 = 750;            // 7.5%  (basis points)
pub const BASE_PAYOUT_BPS:      u64 = 18_500;         // 1.85× (basis points, 10_000 = 1×)
pub const SEEDS_GAME_STATE:     &[u8] = b"game_state";
pub const SEEDS_PLAYER_VAULT:   &[u8] = b"player_vault";
pub const SEEDS_ROUND_VAULT:    &[u8] = b"round_vault";

// ─── Program ────────────────────────────────────────────────

#[program]
pub mod kairox_escrow {
    use super::*;

    // ── Admin: Initialise game state ─────────────────────────

    pub fn initialize(ctx: Context<Initialize>, treasury: Pubkey) -> Result<()> {
        let gs = &mut ctx.accounts.game_state;
        gs.authority      = ctx.accounts.authority.key();
        gs.treasury       = treasury;
        gs.total_wagered  = 0;
        gs.total_paid_out = 0;
        gs.is_paused      = false;
        gs.bump           = ctx.bumps.game_state;
        emit!(GameInitialized { authority: gs.authority, treasury });
        Ok(())
    }

    // ── Player: Deposit SOL into their vault ─────────────────

    pub fn deposit(ctx: Context<Deposit>, amount_lamports: u64) -> Result<()> {
        require!(!ctx.accounts.game_state.is_paused, KairoxError::GamePaused);
        require!(amount_lamports >= MIN_DEPOSIT_LAMPORTS, KairoxError::DepositTooSmall);

        let vault = &mut ctx.accounts.player_vault;
        if vault.player == Pubkey::default() {
            // First deposit — initialise vault fields
            vault.player    = ctx.accounts.player.key();
            vault.balance   = 0;
            vault.bump      = ctx.bumps.player_vault;
        }

        // Transfer SOL: player → player_vault PDA
        let cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.player.to_account_info(),
                to:   ctx.accounts.player_vault.to_account_info(),
            },
        );
        system_program::transfer(cpi_ctx, amount_lamports)?;

        vault.balance = vault.balance
            .checked_add(amount_lamports)
            .ok_or(KairoxError::Overflow)?;

        emit!(Deposited {
            player:  vault.player,
            amount:  amount_lamports,
            balance: vault.balance,
        });
        Ok(())
    }

    // ── Player: Withdraw SOL from their vault ────────────────
    //  Server must co-sign (authority) to authorise the withdrawal.

    pub fn withdraw(
        ctx:    Context<Withdraw>,
        amount: u64,
    ) -> Result<()> {
        require!(!ctx.accounts.game_state.is_paused, KairoxError::GamePaused);

        let vault = &mut ctx.accounts.player_vault;
        require!(vault.balance >= amount, KairoxError::InsufficientBalance);

        vault.balance = vault.balance
            .checked_sub(amount)
            .ok_or(KairoxError::Overflow)?;

        // Transfer SOL: player_vault PDA → player
        // PDA signs via seeds
        let player_key = vault.player;
        let seeds: &[&[u8]] = &[SEEDS_PLAYER_VAULT, player_key.as_ref(), &[vault.bump]];
        let signer_seeds     = &[seeds];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.player_vault.to_account_info(),
                to:   ctx.accounts.player.to_account_info(),
            },
            signer_seeds,
        );
        system_program::transfer(cpi_ctx, amount)?;

        emit!(Withdrawn {
            player:  player_key,
            amount,
            balance: vault.balance,
        });
        Ok(())
    }

    // ── Player: Place wager into round vault ─────────────────
    //  Moves SOL from player_vault → round_vault atomically.

    pub fn place_wager(
        ctx:      Context<PlaceWager>,
        round_id: [u8; 32],
        amount:   u64,
        direction: u8,   // 0 = UP, 1 = DOWN
    ) -> Result<()> {
        require!(!ctx.accounts.game_state.is_paused,  KairoxError::GamePaused);
        require!(amount >= MIN_WAGER_LAMPORTS,         KairoxError::WagerTooSmall);
        require!(amount <= MAX_WAGER_LAMPORTS,         KairoxError::WagerTooLarge);
        require!(direction == 0 || direction == 1,     KairoxError::InvalidDirection);

        let vault = &mut ctx.accounts.player_vault;
        require!(vault.balance >= amount, KairoxError::InsufficientBalance);
        require!(!vault.has_active_wager, KairoxError::WagerAlreadyActive);

        // Debit player vault
        vault.balance = vault.balance.checked_sub(amount).ok_or(KairoxError::Overflow)?;
        vault.has_active_wager = true;
        vault.active_round_id  = round_id;
        vault.active_wager     = amount;

        // Credit round vault
        let rv = &mut ctx.accounts.round_vault;
        if rv.round_id == [0u8; 32] {
            rv.round_id = round_id;
            rv.bump     = ctx.bumps.round_vault;
        }
        rv.total_wagered = rv.total_wagered.checked_add(amount).ok_or(KairoxError::Overflow)?;
        if direction == 0 {
            rv.pool_up   = rv.pool_up.checked_add(amount).ok_or(KairoxError::Overflow)?;
        } else {
            rv.pool_down = rv.pool_down.checked_add(amount).ok_or(KairoxError::Overflow)?;
        }

        // Update global stats
        ctx.accounts.game_state.total_wagered = ctx.accounts.game_state.total_wagered
            .checked_add(amount).ok_or(KairoxError::Overflow)?;

        let is_whale = amount >= WHALE_THRESHOLD;
        emit!(WagerPlaced {
            player:    ctx.accounts.player.key(),
            round_id,
            amount,
            direction,
            is_whale,
        });
        Ok(())
    }

    // ── Authority: Settle round — pay winners, keep losses ───
    //  Called by server after round close.
    //  `winners` is a list of (player_pubkey, payout_lamports) tuples.
    //  Server validates outcomes off-chain; program only moves money.

    pub fn settle_round(
        ctx:      Context<SettleRound>,
        round_id: [u8; 32],
    ) -> Result<()> {
        require!(
            ctx.accounts.round_vault.round_id == round_id,
            KairoxError::RoundMismatch
        );
        require!(
            !ctx.accounts.round_vault.settled,
            KairoxError::AlreadySettled
        );

        ctx.accounts.round_vault.settled = true;

        // Residual (losses + house edge) flows to treasury.
        // Individual payouts are processed via pay_winner CPI calls.
        emit!(RoundSettled { round_id });
        Ok(())
    }

    // ── Authority: Pay a single winner ───────────────────────
    //  Server calls this once per winning player after settle_round.

    pub fn pay_winner(
        ctx:      Context<PayWinner>,
        round_id: [u8; 32],
        payout:   u64,
    ) -> Result<()> {
        require!(ctx.accounts.round_vault.settled, KairoxError::RoundNotSettled);
        require!(ctx.accounts.round_vault.round_id == round_id, KairoxError::RoundMismatch);

        let vault = &mut ctx.accounts.player_vault;

        // Credit payout into player vault
        vault.balance = vault.balance.checked_add(payout).ok_or(KairoxError::Overflow)?;
        vault.has_active_wager = false;

        // Update round vault balance
        ctx.accounts.round_vault.total_wagered = ctx.accounts.round_vault.total_wagered
            .checked_sub(payout).unwrap_or(0);

        ctx.accounts.game_state.total_paid_out = ctx.accounts.game_state.total_paid_out
            .checked_add(payout).ok_or(KairoxError::Overflow)?;

        emit!(WinnerPaid {
            player: ctx.accounts.player.key(),
            round_id,
            payout,
        });
        Ok(())
    }

    // ── Authority: Drain losses to treasury ──────────────────

    pub fn drain_to_treasury(
        ctx:    Context<DrainToTreasury>,
        amount: u64,
    ) -> Result<()> {
        let rv   = &mut ctx.accounts.round_vault;
        require!(rv.settled, KairoxError::RoundNotSettled);

        let round_id = rv.round_id;
        let seeds: &[&[u8]] = &[SEEDS_ROUND_VAULT, &round_id, &[rv.bump]];
        let signer          = &[seeds];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.round_vault.to_account_info(),
                to:   ctx.accounts.treasury.to_account_info(),
            },
            signer,
        );
        system_program::transfer(cpi_ctx, amount)?;

        emit!(DrainedToTreasury { round_id, amount });
        Ok(())
    }

    // ── Admin: Pause / unpause ───────────────────────────────

    pub fn set_paused(ctx: Context<AdminOnly>, paused: bool) -> Result<()> {
        ctx.accounts.game_state.is_paused = paused;
        Ok(())
    }
}

// ─── Account structs ────────────────────────────────────────

#[account]
#[derive(Default)]
pub struct GameState {
    pub authority:      Pubkey,   // 32
    pub treasury:       Pubkey,   // 32
    pub total_wagered:  u64,      //  8
    pub total_paid_out: u64,      //  8
    pub is_paused:      bool,     //  1
    pub bump:           u8,       //  1
}
impl GameState { pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 1 + 1 + 64; }

#[account]
#[derive(Default)]
pub struct PlayerVault {
    pub player:           Pubkey,   // 32
    pub balance:          u64,      //  8
    pub has_active_wager: bool,     //  1
    pub active_round_id:  [u8; 32], // 32
    pub active_wager:     u64,      //  8
    pub bump:             u8,       //  1
}
impl PlayerVault { pub const LEN: usize = 8 + 32 + 8 + 1 + 32 + 8 + 1 + 64; }

#[account]
#[derive(Default)]
pub struct RoundVault {
    pub round_id:      [u8; 32],  // 32
    pub total_wagered: u64,       //  8
    pub pool_up:       u64,       //  8
    pub pool_down:     u64,       //  8
    pub settled:       bool,      //  1
    pub bump:          u8,        //  1
}
impl RoundVault { pub const LEN: usize = 8 + 32 + 8 + 8 + 8 + 1 + 1 + 64; }

// ─── Instruction contexts ────────────────────────────────────

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer  = authority,
        space  = GameState::LEN,
        seeds  = [SEEDS_GAME_STATE],
        bump,
    )]
    pub game_state: Account<'info, GameState>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(seeds = [SEEDS_GAME_STATE], bump = game_state.bump)]
    pub game_state: Account<'info, GameState>,

    #[account(
        init_if_needed,
        payer = player,
        space = PlayerVault::LEN,
        seeds = [SEEDS_PLAYER_VAULT, player.key().as_ref()],
        bump,
    )]
    pub player_vault: Account<'info, PlayerVault>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(seeds = [SEEDS_GAME_STATE], bump = game_state.bump)]
    pub game_state: Account<'info, GameState>,

    #[account(
        mut,
        seeds = [SEEDS_PLAYER_VAULT, player.key().as_ref()],
        bump  = player_vault.bump,
        has_one = player,
    )]
    pub player_vault: Account<'info, PlayerVault>,

    /// Server authority must co-sign withdrawals
    #[account(constraint = authority.key() == game_state.authority @ KairoxError::Unauthorized)]
    pub authority: Signer<'info>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(round_id: [u8; 32])]
pub struct PlaceWager<'info> {
    #[account(mut, seeds = [SEEDS_GAME_STATE], bump = game_state.bump)]
    pub game_state: Account<'info, GameState>,

    #[account(
        mut,
        seeds = [SEEDS_PLAYER_VAULT, player.key().as_ref()],
        bump  = player_vault.bump,
        has_one = player,
    )]
    pub player_vault: Account<'info, PlayerVault>,

    #[account(
        init_if_needed,
        payer = player,
        space = RoundVault::LEN,
        seeds = [SEEDS_ROUND_VAULT, &round_id],
        bump,
    )]
    pub round_vault: Account<'info, RoundVault>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(round_id: [u8; 32])]
pub struct SettleRound<'info> {
    #[account(seeds = [SEEDS_GAME_STATE], bump = game_state.bump)]
    pub game_state: Account<'info, GameState>,

    #[account(
        mut,
        seeds = [SEEDS_ROUND_VAULT, &round_id],
        bump  = round_vault.bump,
    )]
    pub round_vault: Account<'info, RoundVault>,

    #[account(constraint = authority.key() == game_state.authority @ KairoxError::Unauthorized)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(round_id: [u8; 32])]
pub struct PayWinner<'info> {
    #[account(mut, seeds = [SEEDS_GAME_STATE], bump = game_state.bump)]
    pub game_state: Account<'info, GameState>,

    #[account(
        mut,
        seeds = [SEEDS_ROUND_VAULT, &round_id],
        bump  = round_vault.bump,
    )]
    pub round_vault: Account<'info, RoundVault>,

    #[account(
        mut,
        seeds = [SEEDS_PLAYER_VAULT, player.key().as_ref()],
        bump  = player_vault.bump,
    )]
    pub player_vault: Account<'info, PlayerVault>,

    /// CHECK: server validates player address
    pub player: AccountInfo<'info>,

    #[account(constraint = authority.key() == game_state.authority @ KairoxError::Unauthorized)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DrainToTreasury<'info> {
    #[account(seeds = [SEEDS_GAME_STATE], bump = game_state.bump)]
    pub game_state: Account<'info, GameState>,

    #[account(mut)]
    pub round_vault: Account<'info, RoundVault>,

    /// CHECK: treasury address validated against game_state.treasury
    #[account(mut, constraint = treasury.key() == game_state.treasury @ KairoxError::Unauthorized)]
    pub treasury: AccountInfo<'info>,

    #[account(constraint = authority.key() == game_state.authority @ KairoxError::Unauthorized)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdminOnly<'info> {
    #[account(mut, seeds = [SEEDS_GAME_STATE], bump = game_state.bump)]
    pub game_state: Account<'info, GameState>,

    #[account(constraint = authority.key() == game_state.authority @ KairoxError::Unauthorized)]
    pub authority: Signer<'info>,
}

// ─── Errors ─────────────────────────────────────────────────

#[error_code]
pub enum KairoxError {
    #[msg("Game is currently paused")]        GamePaused,
    #[msg("Deposit too small (min 0.1 SOL)")] DepositTooSmall,
    #[msg("Wager too small (min 0.001 SOL)")] WagerTooSmall,
    #[msg("Wager too large (max 10 SOL)")]    WagerTooLarge,
    #[msg("Insufficient vault balance")]      InsufficientBalance,
    #[msg("Invalid direction (0=UP 1=DOWN)")] InvalidDirection,
    #[msg("Player already has active wager")] WagerAlreadyActive,
    #[msg("Round ID mismatch")]               RoundMismatch,
    #[msg("Round already settled")]           AlreadySettled,
    #[msg("Round not yet settled")]           RoundNotSettled,
    #[msg("Arithmetic overflow")]             Overflow,
    #[msg("Unauthorized")]                    Unauthorized,
}

// ─── Events ─────────────────────────────────────────────────

#[event] pub struct GameInitialized { pub authority: Pubkey, pub treasury: Pubkey }
#[event] pub struct Deposited        { pub player: Pubkey, pub amount: u64, pub balance: u64 }
#[event] pub struct Withdrawn        { pub player: Pubkey, pub amount: u64, pub balance: u64 }
#[event] pub struct WagerPlaced      { pub player: Pubkey, pub round_id: [u8; 32], pub amount: u64, pub direction: u8, pub is_whale: bool }
#[event] pub struct RoundSettled     { pub round_id: [u8; 32] }
#[event] pub struct WinnerPaid       { pub player: Pubkey, pub round_id: [u8; 32], pub payout: u64 }
#[event] pub struct DrainedToTreasury{ pub round_id: [u8; 32], pub amount: u64 }
