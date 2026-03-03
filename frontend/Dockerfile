# frontend/Dockerfile

# ── Stage 1: Build the React app ──────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all frontend source code
COPY . .

# Build the production React bundle
RUN npm run build

# ── Stage 2: Serve with Nginx ──────────────────────────────────
FROM nginx:alpine

# Copy the built React files into nginx's web root
COPY --from=builder /app/build /usr/share/nginx/html

# Copy our custom nginx config (handles React routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]