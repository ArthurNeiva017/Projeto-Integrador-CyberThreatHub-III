FROM node:20-alpine

WORKDIR /app

# Copy package.json to install dependencies first
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# Copy all project files
COPY . .

# Set permissions so the Node app can read/write the SQLite database and .env file
RUN mkdir -p /app/backend/src/database && \
    chown -R node:node /app

USER node

EXPOSE 3001

# Start the application from the backend directory
WORKDIR /app/backend
CMD ["node", "src/server.js"]
