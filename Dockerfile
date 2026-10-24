# Multi-stage Dockerfile for ShopScale Frontend
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
# Set API base url for relative proxying in production
ENV VITE_API_BASE_URL=/api/v1
RUN npm run build

# Nginx production web server
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
