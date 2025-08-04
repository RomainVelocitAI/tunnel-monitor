#!/bin/bash

echo "Installing Playwright browsers..."
npx playwright install chromium
npx playwright install-deps chromium
echo "Playwright browsers installed successfully"