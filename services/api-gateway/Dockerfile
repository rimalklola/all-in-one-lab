# ---- Stage 1: The "Builder" ----
    FROM node:20-alpine AS builder
    WORKDIR /app
    COPY package*.json ./
    RUN npm ci --only=production
    
    # ---- Stage 2: The "Final" Production Image ----
    FROM node:20-alpine
    WORKDIR /app
    USER node
    COPY --from=builder /app/node_modules ./node_modules
    COPY index.js .
    
    # Expose the gateway port
    EXPOSE 8080
    
    CMD ["node", "index.js"]