FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Default command, can be overridden
CMD ["npx", "prisma", "studio"]