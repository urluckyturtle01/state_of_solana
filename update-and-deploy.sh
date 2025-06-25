#!/bin/bash
echo "🔄 Updating temp files locally..."
node public/temp/fetch-charts.js
node public/temp/fetch-chart-data.js

echo "📝 Committing updated temp files..."
git add public/temp/chart-configs/ public/temp/chart-data/
git commit -m "Update temp files with latest chart configs and data"

echo "🚀 Ready to deploy! Run: git push"
