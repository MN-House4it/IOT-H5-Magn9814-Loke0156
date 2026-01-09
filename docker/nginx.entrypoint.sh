#!/bin/sh
set -e

# Decode and save certs
echo "$CLIENT_CERT" | tr -d '\r' | base64 -d > /etc/nginx/certs/ca.pem
echo "$CLIENT_KEY" | tr -d '\r' | base64 -d > /etc/nginx/certs/ca.key
echo "$ORIGIN_CERT" | tr -d '\r' | base64 -d > /etc/nginx/certs/origin.pem
echo "$ORIGIN_KEY" | tr -d '\r' | base64 -d > /etc/nginx/certs/origin.key

# Formatting certs to linux
sed -i 's/\r$//' /etc/nginx/certs/ca.pem
sed -i 's/ *$//' /etc/nginx/certs/ca.pem
sed -i 's/\r$//' /etc/nginx/certs/ca.key
sed -i 's/ *$//' /etc/nginx/certs/ca.key
sed -i 's/\r$//' /etc/nginx/certs/origin.pem
sed -i 's/ *$//' /etc/nginx/certs/origin.pem
sed -i 's/\r$//' /etc/nginx/certs/origin.key
sed -i 's/ *$//' /etc/nginx/certs/origin.key

# Fix perms 
chmod 600 /etc/nginx/certs/origin.key
chmod 644 /etc/nginx/certs/origin.pem /etc/nginx/certs/ca.pem
chown root:root /etc/nginx/certs/*

# Overwrite and unset cert env variables
CLIENT_CERT="***"
CLIENT_KEY="***"
ORIGIN_CERT="***"
ORIGIN_KEY="***"

unset CLIENT_CERT
unset CLIENT_KEY
unset ORIGIN_CERT
unset ORIGIN_KEY

exec "$@"
