# Build stage
FROM node:23.3.0-slim AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
COPY tsconfig.json ./

RUN npm install
COPY . .
RUN npm run prisma:generate
RUN npm run build

# Production stage
FROM node:23.3.0-slim

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Install only production dependencies
RUN apt-get update -y && apt-get install -y openssl
RUN npm ci --only=production

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs
USER nodejs

EXPOSE 4000

CMD ["node", "dist/server.js"]
