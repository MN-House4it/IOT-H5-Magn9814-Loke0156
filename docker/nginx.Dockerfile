# syntax=docker/dockerfile:1.4
FROM nginx:alpine

# Copy the Nginx configuration file into the container
COPY config/nginx.conf /etc/nginx/nginx.conf
COPY config/01-mqtt.stream /etc/nginx/conf.d/01-mqtt.stream

# Create the directory for the SSL certificates
RUN mkdir -p /etc/nginx/certs

# Copy custom entry script
COPY docker/nginx.entrypoint.sh /usr/local/bin/entrypoint.sh

# Set execution permissions
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT [ "/usr/local/bin/entrypoint.sh" ]
CMD [ "nginx", "-g", "daemon off;" ]