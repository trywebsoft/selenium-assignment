# Use a base image with Node.js installed
FROM node:alpine

# Install necessary packages (including curl, Chromium, and Chromedriver)
RUN apk update && \
    apk add --no-cache curl chromium chromium-chromedriver

# Set an environment variable to fix Chromium issues
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to install dependencies
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your application code into the container
COPY . .

# Start your application
CMD ["node", "index.js"]
