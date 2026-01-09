#!/bin/ash
set -e

CERT_PATH="/etc/letsencrypt/live/$DOMAIN"

mosquitto_passwd -c -b /mosquitto/config/pwfile iot1 12345678
mosquitto_passwd -b /mosquitto/config/pwfile iot2 12345678
mosquitto_passwd -b /mosquitto/config/pwfile iot3 12345678
mosquitto_passwd -b /mosquitto/config/pwfile iot4 12345678
mosquitto_passwd -b /mosquitto/config/pwfile $MQTT_ADMIN_USERNAME $MQTT_ADMIN_PASSWORD

# Fix permissions
chown root /mosquitto/config/pwfile
chgrp root /mosquitto/config/pwfile

if [ ! -d "/mosquitto/certs" ]; then
  mkdir -p /mosquitto/certs
fi

# Get cert if not already present
if [ "$NODE_ENV" == "development" ]; then
  echo "[INFO] Development environment, skipping cert generation..."
elif [ -z "$(ls $CERT_PATH/fullchain.pem 2>/dev/null)" ]; then
  echo "[INFO] Requesting Let's Encrypt cert for $DOMAIN..."
  echo $NODE_ENV
  if [[ "$NODE_ENV" == "staging" ]]; then
    echo "[INFO] Using staging server..."
    certbot certonly -v --standalone --non-interactive --agree-tos --test-cert --email example@gmail.com -d $DOMAIN
  else
    certbot certonly -v --standalone --non-interactive --agree-tos --email phgu03@gmail.com -d $DOMAIN
  fi
  echo "[INFO] Copying certs to /mosquitto/certs/"
  cp "$CERT_PATH"/* /mosquitto/certs/
elif [ ! -f "/mosquitto/certs/fullchain.pem" ]; then
  echo "[INFO] Copying certs to /mosquitto/certs/"
  cp "$CERT_PATH"/* /mosquitto/certs/
fi

echo "[INFO] Fixing permissions..."
# Desired user and group
expected_user="mosquitto"
expected_group="mosquitto"

# Space-separated list of directories
dirs="/mosquitto/data /mosquitto/log /mosquitto/certs /mosquitto/config"

for dir in $dirs; do
  if [ -d "$dir" ]; then
    current_user=$(stat -c "%U" "$dir")
    current_group=$(stat -c "%G" "$dir")

    if [ "$current_user" != "$expected_user" ] || [ "$current_group" != "$expected_group" ]; then
      echo "Fixing ownership for $dir (was $current_user:$current_group)"
      chown -R "$expected_user:$expected_group" "$dir"
    else
      echo "Ownership for $dir is already correct ($current_user:$current_group)"
    fi
  else
    echo "[WARN] Directory $dir does not exist, skipping."
  fi
done

chmod 600 /mosquitto/config/pwfile
find /mosquitto/certs -type f -exec chmod 600 {} \;
find /mosquitto/certs -type d -exec chmod 700 {} \;

# Set permissions
user="$(id -u)"
if [ "$user" = '0' ]; then
	[ -d "/mosquitto" ] && chown -R mosquitto:mosquitto /mosquitto || true
fi

exec "$@"