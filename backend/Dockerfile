# backend/Dockerfile

# Use official Node.js image
FROM node:18-alpine

# Set working directory inside the container
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the backend code
COPY . .

# Expose the port Express runs on
EXPOSE 5000

# Start the server
CMD ["node", "server.js"]