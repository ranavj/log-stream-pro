# ----------------------------
# STAGE 1: Build Angular App
# ----------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Dependencies install karo
COPY package*.json ./
RUN npm install --legacy-peer-deps
# Saara code copy karo
COPY . .

# Production Build banao
# Note: Humara output path 'dist/log-stream-pro/browser' hai
RUN npm run build --configuration=production

# ----------------------------
# STAGE 2: Serve with Nginx
# ----------------------------
FROM nginx:alpine

# Step 1 se build folder copy karo Nginx ke folder mein
# NOTE: 'log-stream-pro' ki jagah apne project ka naam check kar lena (angular.json mein)
COPY --from=build /app/dist/log-stream-pro/browser /usr/share/nginx/html

# Custom Nginx Config copy karo (Jo hum Step B mein banayenge)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Port 80 expose karo
EXPOSE 80

# Nginx start karo
CMD ["nginx", "-g", "daemon off;"]