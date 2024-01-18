#!/bin/bash

# Determine the absolute path of startClient.sh
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
START_CLIENT_SCRIPT="$SCRIPT_DIR/startClient.sh"

# Create the systemd service file
SERVICE_FILE=/etc/systemd/system/scraxserviceClient.service
echo "[Unit]
Description=My Custom Client Service

[Service]
ExecStart=$START_CLIENT_SCRIPT
Restart=on-failure
# Restart service after 10 seconds if the node service crashes:
RestartSec=10

[Install]
WantedBy=multi-user.target" | sudo tee $SERVICE_FILE

# Reload systemd to apply new changes and enable the service
sudo systemctl daemon-reload
sudo systemctl enable scraxserviceClient.service

echo "Service created and enabled successfully."
echo "The Service has to be started manually the first time."
echo "use: systemctl start scraxserviceClient.service"