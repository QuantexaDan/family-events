# Deploying to Oracle Cloud Always Free

A completely free deployment using Oracle Cloud's Always Free ARM instance. No Docker required.

## 1. Create an Oracle Cloud Account

1. Go to [cloud.oracle.com](https://cloud.oracle.com/) and click **Sign Up**
2. Choose your **Home Region** (pick the closest to your family — this can't be changed later)
3. Complete verification (credit card required for identity, but you won't be charged on Always Free resources)

> **Tip:** If signup fails with "unable to complete" or similar, try a different browser, clear cookies, or try again later. Oracle occasionally restricts new signups by region.

## 2. Create an ARM VM Instance

1. From the Oracle Cloud dashboard, go to **Compute > Instances > Create Instance**
2. Configure:
   - **Name:** `family-events`
   - **Image:** Ubuntu 24.04 (or latest LTS)
   - **Shape:** Click **Change Shape** > **Ampere** > **VM.Standard.A1.Flex**
     - OCPUs: **1** (can use up to 4 free)
     - Memory: **6 GB** (can use up to 24 GB free)
   - **Networking:** Accept defaults (creates a VCN + public subnet)
   - **Add SSH keys:** Upload your public key or let Oracle generate one (**download the private key!**)
3. Click **Create**

> **Note:** ARM instances are popular — if creation fails with "Out of capacity", try again later or use a different availability domain. Some people use automation to retry, but patience usually works within a day or two.

## 3. Open Firewall Ports

### Oracle Cloud Security List

1. Go to **Networking > Virtual Cloud Networks** > your VCN > **Security Lists** > default
2. Add an **Ingress Rule:**
   - Source CIDR: `0.0.0.0/0`
   - Destination Port: `3000`
   - (Or use `80` and `443` if setting up Caddy — see step 7)

### VM Firewall (iptables)

SSH into your instance, then open the port in the OS firewall too:

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT
sudo netfilter-persistent save
```

## 4. Install Node.js and Build Tools

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install build tools (needed for bcrypt, better-sqlite3, sharp)
sudo apt install -y build-essential python3 git

# Install Node.js 22 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node -v   # should show v22.x
npm -v
```

## 5. Clone and Build the App

```bash
# Clone your repo (replace with your actual repo URL)
cd ~
git clone <your-repo-url> family-events
cd family-events

# Install dependencies
npm ci

# Create environment file
cp .env.local.example .env
# Edit and set a strong SESSION_SECRET:
nano .env
```

Your `.env` should contain at minimum:

```
SESSION_SECRET=<random-32-char-string>
# Optional: Gmail for invite emails
# GMAIL_USER=your@gmail.com
# GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

Generate a random secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Now build and seed:

```bash
# Build the standalone output
npm run build

# Seed the database (creates admin account)
npm run seed

# Test it works
npm start
# Visit http://<your-vm-public-ip>:3000
# Ctrl+C to stop
```

## 6. Run as a Systemd Service

Create a service so the app starts automatically and restarts on failure:

```bash
sudo nano /etc/systemd/system/family-events.service
```

Paste:

```ini
[Unit]
Description=Family Events App
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/family-events
ExecStart=/usr/bin/node .next/standalone/server.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000
EnvironmentFile=/home/ubuntu/family-events/.env

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable family-events
sudo systemctl start family-events

# Check it's running
sudo systemctl status family-events

# View logs
sudo journalctl -u family-events -f
```

## 7. HTTPS Setup (Pick One)

### Option A: Cloudflare Tunnel (recommended — no ports to open)

This gives you a custom domain with HTTPS and hides your server's IP. You can skip the firewall step for port 3000 entirely.

```bash
# Install cloudflared
curl -fsSL https://pkg.cloudflare.com/cloudflared-ascii.repo | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt update && sudo apt install -y cloudflared

# Authenticate
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create family-events

# Configure
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: <tunnel-id-from-above>
credentials-file: /home/ubuntu/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: family.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
EOF

# Add DNS record
cloudflared tunnel route dns family-events family.yourdomain.com

# Install as a service
sudo cloudflared service install

# Start
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

### Option B: Caddy (automatic HTTPS, no domain registrar needed if you have a domain)

If you have a domain pointed at your VM's public IP:

```bash
# Install Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy

# Configure
sudo nano /etc/caddy/Caddyfile
```

```
family.yourdomain.com {
    reverse_proxy localhost:3000
}
```

```bash
# Open ports 80 and 443
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 7 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save

# Also add ingress rules in Oracle Cloud Security List for ports 80 and 443

sudo systemctl restart caddy
```

### Option C: Quick Tunnel (no domain needed — free temporary URL)

For testing or if you don't have a domain:

```bash
sudo apt install -y cloudflared
cloudflared tunnel --url http://localhost:3000
```

This gives you a random `*.trycloudflare.com` URL. It changes every time you restart, so it's best for testing.

## 8. Static Files for Standalone Mode

Next.js standalone output doesn't include the `public/` or `.next/static/` directories. Copy them into place:

```bash
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
```

Add this to your update script (see below) so it happens automatically after each build.

## 9. Updating the App

```bash
cd ~/family-events
git pull
npm ci
npm run build
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
sudo systemctl restart family-events
```

Or create a helper script:

```bash
cat > ~/update-app.sh << 'SCRIPT'
#!/bin/bash
set -e
cd ~/family-events
git pull
npm ci
npm run build
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
sudo systemctl restart family-events
echo "Updated and restarted."
SCRIPT
chmod +x ~/update-app.sh
```

Then just run `~/update-app.sh` whenever you push changes.

## 10. Backups

```bash
# Backup database
cp ~/family-events/data/family-events.db ~/backups/db-$(date +%Y%m%d).db

# Backup photos
tar czf ~/backups/photos-$(date +%Y%m%d).tar.gz -C ~/family-events/uploads/photos .
```

Set up a weekly cron job:

```bash
mkdir -p ~/backups
crontab -e
```

Add:

```
0 3 * * 0 cp ~/family-events/data/family-events.db ~/backups/db-$(date +\%Y\%m\%d).db
0 3 * * 0 tar czf ~/backups/photos-$(date +\%Y\%m\%d).tar.gz -C ~/family-events/uploads/photos .
```

## Costs

All Always Free. Zero charges as long as you use:
- **VM.Standard.A1.Flex** shape (up to 4 OCPUs / 24 GB total across all ARM instances)
- **Boot volume** up to 200 GB total
- **Outbound data** up to 10 TB/month

This is more than enough for a family events app.

## Troubleshooting

**"Out of capacity" when creating the instance:**
ARM instances are popular. Try a different availability domain, reduce to 1 OCPU / 6 GB, or try again in a few hours.

**App crashes with `better-sqlite3` or `bcrypt` errors:**
Make sure `build-essential` and `python3` are installed before `npm ci`. These native modules compile from source on ARM.

**Can't connect to port 3000:**
Check both the Oracle Security List *and* the OS-level iptables rules — you need both.

**Standalone server can't find static files:**
Make sure you copied `public/` and `.next/static/` into `.next/standalone/` (step 8).
