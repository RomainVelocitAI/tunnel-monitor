#!/bin/bash

echo "Checking Playwright installation..."

# Check if Playwright browsers are installed
if [ ! -d "$HOME/.cache/ms-playwright" ] || [ -z "$(ls -A $HOME/.cache/ms-playwright 2>/dev/null)" ]; then
    echo "Playwright browsers not found. Installing..."
    npx playwright install chromium
    echo "Playwright installation complete"
else
    echo "Playwright browsers already installed"
fi

# Start the application
echo "Starting application..."
npm start