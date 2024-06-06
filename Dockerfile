FROM node:18

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install the application's dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port the application runs on (change this if your app runs on a different port)
EXPOSE 8080

# Command to run the application
CMD ["node", "index.js"]
