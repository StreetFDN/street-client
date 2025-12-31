# Build stage
FROM node:18-bullseye-slim AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

# Generate Prisma Client
RUN npm run generate

# Build TypeScript
RUN npm run build


# Production stage
FROM node:18-bullseye-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

# Railway sets PORT dynamically; EXPOSE can be 8080 or omitted
EXPOSE 8080

CMD ["npm", "start"]

