# syntax=docker/dockerfile:1.4
FROM eclipse-mosquitto

WORKDIR /

# Copy custom entry script
COPY docker/mqtt5-entrypoint.sh /usr/local/bin/entrypoint.sh

# Set execution permissions
RUN chmod +x /usr/local/bin/entrypoint.sh

RUN apk add certbot

# Set entrypoint
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["/usr/sbin/mosquitto", "-c", "/mosquitto/config/mosquitto.conf"]