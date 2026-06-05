FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
RUN npm install -g tsx
COPY . .
EXPOSE ${PORT:-4000}
CMD ["tsx", "src/index.ts"]