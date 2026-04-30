#!/bin/bash
set -e

echo "========================================="
echo "  Family Events — Cloudflare Tunnel Setup"
echo "========================================="
echo ""
echo "This sets up a Cloudflare Tunnel so your app is"
echo "accessible via HTTPS on your own domain."
echo ""
echo "Choose an option:"
echo "  1) Quick Tunnel — free random URL, no domain needed"
echo "  2) Named Tunnel — your own domain (e.g., family.yourdomain.com)"
echo ""
read -p "Enter 1 or 2: " OPTION

echo ""
echo "Installing cloudflared..."
if ! command -v cloudflared &> /dev/null; then
  curl -fsSL https://pkg.cloudflare.com/cloudflared-ascii.repo | sudo tee /etc/apt/sources.list.d/cloudflared.list > /dev/null
  sudo apt update && sudo apt install -y cloudflared
fi

if [ "$OPTION" = "1" ]; then
  echo ""
  echo "Starting quick tunnel..."
  echo "Your temporary URL will appear below. Press Ctrl+C to stop."
  echo ""
  cloudflared tunnel --url http://localhost:3000
  exit 0
fi

if [ "$OPTION" = "2" ]; then
  echo ""
  echo "Authenticating with Cloudflare..."
  echo "A browser window will open — log in and authorize."
  cloudflared tunnel login

  echo ""
  read -p "Enter a hostname for your app (e.g., family.yourdomain.com): " HOSTNAME

  echo ""
  echo "Creating tunnel..."
  TUNNEL_OUTPUT=$(cloudflared tunnel create family-events 2>&1)
  echo "$TUNNEL_OUTPUT"
  TUNNEL_ID=$(echo "$TUNNEL_OUTPUT" | grep -oP 'Created tunnel family-events with id \K[a-f0-9-]+')

  if [ -z "$TUNNEL_ID" ]; then
    echo "Could not extract tunnel ID. Check the output above."
    echo "You may need to run: cloudflared tunnel list"
    read -p "Enter your tunnel ID manually: " TUNNEL_ID
  fi

  echo ""
  echo "Configuring tunnel $TUNNEL_ID -> $HOSTNAME..."
  mkdir -p ~/.cloudflared
  cat > ~/.cloudflared/config.yml << EOF
tunnel: $TUNNEL_ID
credentials-file: $HOME/.cloudflared/$TUNNEL_ID.json

ingress:
  - hostname: $HOSTNAME
    service: http://localhost:3000
  - service: http_status:404
EOF

  echo ""
  echo "Adding DNS record..."
  cloudflared tunnel route dns family-events "$HOSTNAME"

  echo ""
  echo "Installing as system service..."
  sudo cloudflared service install
  sudo systemctl start cloudflared
  sudo systemctl enable cloudflared

  echo ""
  echo "========================================="
  echo "  Tunnel setup complete!"
  echo "========================================="
  echo ""
  echo "  Your app is live at: https://$HOSTNAME"
  echo ""
  echo "  Useful commands:"
  echo "    sudo systemctl status cloudflared  — check tunnel status"
  echo "    cloudflared tunnel list             — list tunnels"
  echo ""
fi
