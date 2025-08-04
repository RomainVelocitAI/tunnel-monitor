#!/usr/bin/env bash
# Build script for Render
# This script installs Chrome dependencies and Playwright

echo "Starting Render build script..."

# Update package list
apt-get update -qq

# Install dependencies for Chrome (without requiring root)
apt-get install -y -qq --no-install-recommends \
  libnss3 \
  libatk-bridge2.0-0 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libasound2 \
  libxss1 \
  libgtk-3-0 \
  2>/dev/null || echo "Warning: Some dependencies could not be installed"

# Install npm dependencies
echo "Installing npm dependencies..."
npm install

# Install Playwright browsers
echo "Installing Playwright browsers..."
npx playwright install chromium || echo "Warning: Playwright installation encountered issues"

echo "Build script completed!"