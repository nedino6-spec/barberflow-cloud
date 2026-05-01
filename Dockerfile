# ==========================================
# DOCKERFILE PROFISSIONAL - BARBERFLOW CLOUD
# ==========================================

# Estágio 1: Build do Frontend
FROM node:18-alpine AS builder
WORKDIR /app
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Estágio 2: Runner
FROM node:18-alpine
RUN apk add --no-cache python3 make g++ 

WORKDIR /app

# Criar pastas para persistência de dados (Railway Volume)
RUN mkdir -p /app/data

# Copia dependências do Backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install --production

# Copia o código do Backend
COPY backend/ ./backend/

# Copia o build do Frontend
COPY --from=builder /app/frontend/dist ./frontend/dist

# Define variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_PATH=/app/data/database.sqlite
ENV SESSION_PATH=/app/data/session_data

# Expõe a porta
EXPOSE 3001

# Comando de inicialização
WORKDIR /app/backend
CMD ["node", "server.js"]
