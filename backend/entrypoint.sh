#!/bin/sh
set -e
mkdir -p /app/uploads/avatars /app/uploads/rooms
chown -R node:node /app/uploads
exec su-exec node dumb-init -- "$@"
