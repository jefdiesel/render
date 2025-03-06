# Use the official Node.js 23.9.0 image as the base
FROM node:23.9.0

# Set working directory in the container
WORKDIR /app

# Install Chromium and required dependencies
RUN apt-get update && apt-get install -y \
  chromium \
  libx11-xcb1 \
  libnss3 \
  libxss1 \
  libasound2 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libgbm1 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  && rm -rf /var/lib/apt/lists/*  # Clean up to reduce image size

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of your app
COPY . .

# Command to start your app (adjust based on your setup)
CMD ["node", "server.js"]
