# syntax=docker/dockerfile:1.4
FROM nginx:alpine

# Copy the Nginx configuration file into the container
COPY config/nginx.conf /etc/nginx/nginx.conf