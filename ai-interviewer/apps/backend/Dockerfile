FROM oven/bun:1-slim AS base
WORKDIR /app

# Copy dependency manifests
COPY package.json bun.lock* ./
COPY prisma ./prisma/

# Install dependencies and generate Prisma client
RUN bun install
RUN bunx prisma generate

# Copy application files
COPY . .

# Expose backend port
EXPOSE 3001

ENV PORT=3001
ENV NODE_ENV=production

# Start backend server
CMD ["bun", "index.ts"]
