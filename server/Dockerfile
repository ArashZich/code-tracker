FROM node:16-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy the rest of the code
COPY . .

# Expose the port
EXPOSE 3000

# Start the app
CMD ["npm", "start"]