#!/bin/sh
# Reconstruit app.js à partir de src/ (three.js inclus, aucun serveur nécessaire)
cd "$(dirname "$0")" && npx esbuild src/main.js --bundle --minify --format=iife --target=es2020 --outfile=app.js \
 && sed -i '' -E "s#src=\"app\.js[^\"]*\"#src=\"app.js?v=$(date +%s)\"#; s#href=\"styles\.css[^\"]*\"#href=\"styles.css?v=$(date +%s)\"#" index.html
python3 bundle.py
