# Deploying Family Events

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- (Optional) A [Cloudflare](https://dash.cloudflare.com/) account + domain for tunnel access

## Quick Start

```bash
# Clone the repo and cd into it
git clone <your-repo-url>
cd family-events

# Create your environment file
cp .env.local.example .env
# Edit .env and set a strong SESSION_SECRET (32+ characters)

# Build and start
docker compose up -d

# The app is now running at http://localhost:3000
# First run auto-seeds the database with an admin account.
```

### Default Admin Credentials

- **Email:** `dan@family-events.local`
- **Password:** `admin123`

Change the password after first login.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SESSION_SECRET` | Yes | Random string, 32+ characters. Used to encrypt session cookies. |
| `GMAIL_USER` | No | Gmail address for sending invite emails. |
| `GMAIL_APP_PASSWORD` | No | Gmail App Password ([how to get one](https://support.google.com/accounts/answer/185833)). |

Set these in a `.env` file in the project root, or pass them directly in `docker-compose.yml`.

## Cloudflare Tunnel (Custom Domain)

Cloudflare Tunnel lets you expose the app on your domain without opening ports or having a static IP.

### Option A: Quick Tunnel (temporary URL)

Edit `docker-compose.override.yml`, uncomment the "Option A" tunnel service, then:

```bash
docker compose up -d
```

Check the tunnel container logs for your temporary `*.trycloudflare.com` URL:

```bash
docker compose logs tunnel
```

### Option B: Named Tunnel (your domain)

1. Install `cloudflared` on your local machine:
   ```bash
   # macOS
   brew install cloudflared

   # Windows
   winget install Cloudflare.cloudflared
   ```

2. Authenticate with Cloudflare:
   ```bash
   cloudflared tunnel login
   ```

3. Create a tunnel:
   ```bash
   cloudflared tunnel create family-events
   ```

4. Set up the config directory:
   ```bash
   mkdir -p cloudflared
   ```

5. Copy the credentials file that was created (usually at `~/.cloudflared/<tunnel-id>.json`):
   ```bash
   cp ~/.cloudflared/<tunnel-id>.json cloudflared/credentials.json
   ```

6. Create `cloudflared/config.yml`:
   ```yaml
   tunnel: <tunnel-id>
   credentials-file: /etc/cloudflared/credentials.json

   ingress:
     - hostname: family.yourdomain.com
       service: http://app:3000
     - service: http_status:404
   ```

7. Add a DNS CNAME record pointing `family.yourdomain.com` to `<tunnel-id>.cfargotunnel.com`:
   ```bash
   cloudflared tunnel route dns family-events family.yourdomain.com
   ```

8. Edit `docker-compose.override.yml`, uncomment the "Option B" tunnel service.

9. Start everything:
   ```bash
   docker compose up -d
   ```

Your app is now live at `https://family.yourdomain.com`.

## Backups

The app stores two types of data that should be backed up:

- **Database:** `data/family-events.db` (SQLite)
- **Photos:** `uploads/photos/` directory

If using Docker volumes, you can back them up with:

```bash
# Backup database
docker compose exec app cp data/family-events.db /tmp/backup.db
docker compose cp app:/tmp/backup.db ./backup-$(date +%Y%m%d).db

# Backup photos (tar the volume)
docker run --rm -v family-events_app-photos:/data -v $(pwd):/backup alpine \
  tar czf /backup/photos-$(date +%Y%m%d).tar.gz -C /data .
```

Or mount bind directories instead of named volumes in `docker-compose.yml` for easier access:

```yaml
volumes:
  - ./data:/app/data
  - ./uploads/photos:/app/uploads/photos
```

## Updating

```bash
git pull
docker compose build
docker compose up -d
```

The database schema is created via `CREATE TABLE IF NOT EXISTS`, so updates are safe. The seed script only runs if the database file doesn't exist.
