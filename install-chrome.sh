#!/bin/bash

# Exit on error
set -e

echo "Installing Chrome dependencies..."
apt-get update
apt-get install -y wget gnupg

echo "Adding Chrome repository..."
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list

echo "Installing Chrome..."
apt-get update
apt-get install -y google-chrome-stable fonts-freefont-ttf

echo "Chrome installation complete"
echo "Chrome path: $(which google-chrome-stable)"

# Verify Chrome is working
echo "Chrome version:"
google-chrome-stable --version

echo "Installation script completed"
