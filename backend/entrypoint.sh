#!/bin/sh
# no verbose
set +x

npm run build:tsc

# Automatic deploy to prod database
npx prisma db push

# Go forward
exec "$@"