#!/bin/bash

# Determine the absolute path of startServer.sh
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
START_CLIENT_SCRIPT="$SCRIPT_DIR/startServer.sh"
chmod +x "$SCRIPT_DIR/startServer.sh"

# Get the home directory of the user running this script
HOME_DIR=$(eval echo ~$USER)

# Create the systemd service file
SERVICE_FILE=/etc/systemd/system/scraxserviceServer.service
echo "[Unit]
Description=scraxsystemServer Service

[Service]
# Set the working directory to the user's home directory
WorkingDirectory=$HOME_DIR
ExecStart=$START_CLIENT_SCRIPT
Restart=always
# Restart service after 10 seconds if the node service crashes:
RestartSec=10

[Install]
WantedBy=multi-user.target" | sudo tee $SERVICE_FILE

# Reload systemd to apply new changes and enable the service
sudo systemctl daemon-reload
sudo systemctl enable scraxserviceServer.service

echo "Service created and enabled successfully."
