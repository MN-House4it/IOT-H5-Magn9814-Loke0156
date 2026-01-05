# syntax=docker/dockerfile:1.4
FROM node:22.9-alpine AS base

# Setting the timezone
RUN apk add -U tzdata
RUN cp /usr/share/zoneinfo/Europe/Copenhagen /etc/localtime

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package.json ./
RUN npm install

# Copy other application files
COPY . .

# Generate Prisma types
RUN npx prisma generate

# Ensure entrypoint.sh is executable
RUN chmod +x ./entrypoint.sh

# Expose port 3001 for HTTPS
EXPOSE 3001

# Command to start the application (using HTTPS on port 3001)
ENTRYPOINT ["./entrypoint.sh"]
