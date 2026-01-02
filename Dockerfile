# Use Node.js 20 LTS
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm install
RUN cd backend && npm install

# Copy source code
COPY . .

# Generate Prisma client
RUN cd backend && npx prisma generate

# Expose port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]