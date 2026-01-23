# Use Node.js 20 LTS
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port (Railway will set PORT env var)
EXPOSE $PORT

# Start the application
CMD ["npm", "start"]