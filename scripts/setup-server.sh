#!/bin/bash
set -e

echo "========================================="
echo "  Family Events — Server Setup"
echo "========================================="
echo ""

REPO_URL="${1:-}"
if [ -z "$REPO_URL" ]; then
  read -p "Enter your Git repo URL: " REPO_URL
fi

if [ -z "$REPO_URL" ]; then
  echo "Error: repo URL is required."
  echo "Usage: ./setup-server.sh <git-repo-url>"
  exit 1
fi

echo ""
echo "[1/7] Updating system and installing dependencies..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential python3 git

echo ""
echo "[2/7] Installing Node.js 22..."
if ! command -v node &> /dev/null || [[ "$(node -v)" != v22* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt install -y nodejs
fi
echo "Node $(node -v), npm $(npm -v)"

echo ""
echo "[3/7] Cloning repository..."
cd ~
if [ -d "family-events" ]; then
  echo "Directory already exists, pulling latest..."
  cd family-events
  git pull
else
  git clone "$REPO_URL" family-events
  cd family-events
fi

echo ""
echo "[4/7] Installing npm packages and building..."
npm ci
npm run build
cp -r public .next/standalone/public 2>/dev/null || true
cp -r .next/static .next/standalone/.next/static

echo ""
echo "[5/7] Creating environment file..."
if [ ! -f .env ]; then
  SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  cat > .env << EOF
SESSION_SECRET=$SECRET
# GMAIL_USER=your@gmail.com
# GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
EOF
  echo "Generated .env with random SESSION_SECRET"
else
  echo ".env already exists, skipping"
fi

echo ""
echo "[6/7] Seeding database..."
if [ ! -f data/family-events.db ]; then
  mkdir -p data
  npm run seed
else
  echo "Database already exists, skipping seed"
fi

echo ""
echo "[7/7] Setting up systemd service..."
sudo tee /etc/systemd/system/family-events.service > /dev/null << EOF
[Unit]
Description=Family Events App
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$HOME/family-events
ExecStart=/usr/bin/node .next/standalone/server.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000
EnvironmentFile=$HOME/family-events/.env

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable family-events
sudo systemctl start family-events

echo ""
echo "[+] Opening firewall port 3000..."
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT
sudo netfilter-persistent save 2>/dev/null || true

echo ""
echo "[+] Creating update script..."
cat > ~/update-app.sh << 'SCRIPT'
#!/bin/bash
set -e
cd ~/family-events
git pull
npm ci
npm run build
cp -r public .next/standalone/public 2>/dev/null || true
cp -r .next/static .next/standalone/.next/static
sudo systemctl restart family-events
echo "Updated and restarted."
SCRIPT
chmod +x ~/update-app.sh

echo ""
echo "[+] Setting up weekly backups..."
mkdir -p ~/backups
(crontab -l 2>/dev/null; echo "0 3 * * 0 cp ~/family-events/data/family-events.db ~/backups/db-\$(date +\\%Y\\%m\\%d).db") | sort -u | crontab -
(crontab -l 2>/dev/null; echo "5 3 * * 0 tar czf ~/backups/photos-\$(date +\\%Y\\%m\\%d).tar.gz -C ~/family-events/uploads/photos . 2>/dev/null || true") | sort -u | crontab -

echo ""
echo "========================================="
echo "  Setup complete!"
echo "========================================="
echo ""
echo "  App running at: http://$(curl -s ifconfig.me 2>/dev/null || echo '<your-vm-ip>'):3000"
echo ""
echo "  Admin login:"
echo "    Email:    dan@family-events.local"
echo "    Password: admin123"
echo ""
echo "  Next steps:"
echo "    1. Open port 3000 in Oracle Cloud Security List"
echo "       (Networking > VCN > Security Lists > Add Ingress Rule)"
echo "    2. Set up HTTPS — run: ./setup-tunnel.sh"
echo "    3. Change the default admin password!"
echo ""
echo "  Useful commands:"
echo "    sudo systemctl status family-events  — check status"
echo "    sudo journalctl -u family-events -f  — view logs"
echo "    ~/update-app.sh                      — pull & redeploy"
echo ""
