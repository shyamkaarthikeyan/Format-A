#!/bin/bash

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r server/requirements.txt

# Install Node.js dependencies and build
echo "Installing Node.js dependencies..."
npm install

echo "Building application..."
npm run build