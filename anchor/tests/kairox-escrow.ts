import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { KairoxEscrow } from "../target/types/kairox_escrow";
import { PublicKey, Keypair, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

const SEEDS_GAME_STATE   = Buffer.from("game_state");
const SEEDS_PLAYER_VAULT = Buffer.from("player_vault");
const SEEDS_ROUND_VAULT  = Buffer.from("round_vault");
const PROGRAM_ID         = new PublicKey("KRXescrow11111111111111111111111111111111111");

function roundIdBytes(id: string): number[] {
  const b = Buffer.alloc(32);
  Buffer.from(id).copy(b);
  return Array.from(b);
}

async function getPDA(seeds: Buffer[], programId: PublicKey) {
  return PublicKey.findProgramAddressSync(seeds, programId);
}

describe("kairox-escrow", () => {
  const provider  = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program   = anchor.workspace.KairoxEscrow as Program<KairoxEscrow>;
  const authority = provider.wallet as anchor.Wallet;
  const player    = Keypair.generate();
  const treasury  = Keypair.generate();

  let gameStatePDA: PublicKey;
  let playerVaultPDA: PublicKey;
  let roundVaultPDA: PublicKey;
  const roundId = roundIdBytes("test_round_0001");

  before(async () => {
    // Airdrop to player
    const sig = await provider.connection.requestAirdrop(player.publicKey, 5 * LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(sig);

    [gameStatePDA]   = await getPDA([SEEDS_GAME_STATE], PROGRAM_ID);
    [playerVaultPDA] = await getPDA([SEEDS_PLAYER_VAULT, player.publicKey.toBuffer()], PROGRAM_ID);
    [roundVaultPDA]  = await getPDA([SEEDS_ROUND_VAULT, Buffer.from(roundId)], PROGRAM_ID);
  });

  it("initializes game state", async () => {
    await program.methods.initialize(treasury.publicKey)
      .accounts({ gameState: gameStatePDA, authority: authority.publicKey, systemProgram: SystemProgram.programId })
      .rpc();

    const gs = await program.account.gameState.fetch(gameStatePDA);
    assert.ok(gs.authority.equals(authority.publicKey));
    assert.ok(gs.treasury.equals(treasury.publicKey));
    assert.equal(gs.totalWagered.toNumber(), 0);
    assert.equal(gs.isPaused, false);
  });

  it("player deposits SOL", async () => {
    const depositLamports = 0.5 * LAMPORTS_PER_SOL;
    await program.methods.deposit(new anchor.BN(depositLamports))
      .accounts({
        gameState: gameStatePDA,
        playerVault: playerVaultPDA,
        player: player.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([player])
      .rpc();

    const vault = await program.account.playerVault.fetch(playerVaultPDA);
    assert.equal(vault.balance.toNumber(), depositLamports);
    assert.ok(vault.player.equals(player.publicKey));
  });

  it("player places a wager (UP)", async () => {
    const wager = 0.1 * LAMPORTS_PER_SOL;
    await program.methods.placeWager(roundId, new anchor.BN(wager), 0)
      .accounts({
        gameState:   gameStatePDA,
        playerVault: playerVaultPDA,
        roundVault:  roundVaultPDA,
        player:      player.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([player])
      .rpc();

    const vault = await program.account.playerVault.fetch(playerVaultPDA);
    assert.equal(vault.balance.toNumber(), 0.4 * LAMPORTS_PER_SOL);
    assert.ok(vault.hasActiveWager);

    const rv = await program.account.roundVault.fetch(roundVaultPDA);
    assert.equal(rv.poolUp.toNumber(), wager);
    assert.equal(rv.poolDown.toNumber(), 0);
  });

  it("authority settles round", async () => {
    await program.methods.settleRound(roundId)
      .accounts({
        gameState:  gameStatePDA,
        roundVault: roundVaultPDA,
        authority:  authority.publicKey,
      })
      .rpc();

    const rv = await program.account.roundVault.fetch(roundVaultPDA);
    assert.ok(rv.settled);
  });

  it("authority pays winner", async () => {
    const payout = new anchor.BN(0.185 * LAMPORTS_PER_SOL); // 1.85×
    await program.methods.payWinner(roundId, payout)
      .accounts({
        gameState:   gameStatePDA,
        roundVault:  roundVaultPDA,
        playerVault: playerVaultPDA,
        player:      player.publicKey,
        authority:   authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const vault = await program.account.playerVault.fetch(playerVaultPDA);
    assert.equal(vault.balance.toNumber(), (0.4 + 0.185) * LAMPORTS_PER_SOL);
    assert.equal(vault.hasActiveWager, false);
  });

  it("player withdraws SOL", async () => {
    const withdrawAmt = new anchor.BN(0.2 * LAMPORTS_PER_SOL);
    await program.methods.withdraw(withdrawAmt)
      .accounts({
        gameState:   gameStatePDA,
        playerVault: playerVaultPDA,
        player:      player.publicKey,
        authority:   authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([player])
      .rpc();

    const vault = await program.account.playerVault.fetch(playerVaultPDA);
    assert.equal(vault.balance.toNumber(), (0.4 + 0.185 - 0.2) * LAMPORTS_PER_SOL);
  });

  it("rejects double wager in same round", async () => {
    try {
      await program.methods.placeWager(roundId, new anchor.BN(0.05 * LAMPORTS_PER_SOL), 1)
        .accounts({
          gameState:   gameStatePDA,
          playerVault: playerVaultPDA,
          roundVault:  roundVaultPDA,
          player:      player.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([player])
        .rpc();
      assert.fail("Should have thrown");
    } catch (e: any) {
      assert.include(e.toString(), "AlreadySettled");
    }
  });
});
