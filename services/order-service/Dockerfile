FROM node:20-alpine AS builder 
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY index.js ./
EXPOSE 8082
CMD ["node", "index.js"]
