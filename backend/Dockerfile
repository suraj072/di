# Stage 1: install production deps (oracledb v6 is pure-JS in Thin mode — no native build tools needed)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Stage 2: lean runtime image
FROM node:20-alpine
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY src/ ./src/

# Create uploads dirs so the volume mount doesn't obscure them
RUN mkdir -p /app/uploads/api-docs /app/uploads/media

EXPOSE 3001
CMD ["node", "src/server.js"]
