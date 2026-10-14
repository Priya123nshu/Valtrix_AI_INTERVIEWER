FROM oven/bun:1-slim AS base
WORKDIR /app

# Copy dependency manifests
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install

# Copy application files
COPY . .

# Expose frontend port
EXPOSE 3002

ENV PORT=3002
ENV NODE_ENV=production

# Start Bun frontend server
CMD ["bun", "src/index.ts"]
