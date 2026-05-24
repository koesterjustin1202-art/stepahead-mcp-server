# Use the official Node.js runtime as the base image
FROM node:22-alpine

# Set the working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy the rest of the source
COPY src/ ./src/

# Expose the default port
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Default services (can be overridden)
ENV QDRANT_URL=http://qdrant:6333
ENV OLLAMA_URL=http://ollama:11434
ENV SEARXNG_URL=http://searxng:8080
ENV NEXTCLOUD_URL=http://nextcloud:8001

# Run the server
CMD ["node", "src/index.js"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1