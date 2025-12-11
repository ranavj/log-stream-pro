# 1. Base Image: Node.js ka halka version use karenge
FROM node:18-alpine

# 2. Container ke andar folder banayenge
WORKDIR /app

# 3. Pehle sirf package files copy karenge (Caching ke liye)
COPY package*.json ./

# 4. Dependencies install karenge
RUN npm install

# 5. Baaki saara code copy karenge
COPY . .

# 6. TypeScript ko JavaScript mein build karenge
# (Ensure karein ki aapke package.json mein 'build' script hai)
RUN npm run build

# 7. Port expose karenge
EXPOSE 4000

# 8. Server start karenge
CMD ["npm", "start"]