#!/bin/bash

# Cache Update Script for Production
# This script should be run hourly via cron job
# Example crontab entry: 0 * * * * /path/to/update-cache-cron.sh

# Set your production URL here
API_URL="${API_URL:-http://localhost:3000}"

echo "$(date): Updating API cache..."

# Call the cache update endpoint
curl -X POST "${API_URL}/api/update-api-cache" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\nTotal time: %{time_total}s\n" \
  >> /var/log/api-cache-update.log 2>&1

if [ $? -eq 0 ]; then
  echo "$(date): Cache update completed successfully" >> /var/log/api-cache-update.log
else
  echo "$(date): Cache update failed" >> /var/log/api-cache-update.log
fi 