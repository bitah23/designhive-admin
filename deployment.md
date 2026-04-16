# VPS Deployment Setup Guide

This guide covers everything that must be configured on the VPS before the GitHub Actions CI/CD pipeline can deploy successfully. The pipeline builds Docker images, pushes them to GHCR (GitHub Container Registry), then SSHes into the VPS to pull and run them.

---

## Architecture on the VPS

```
Internet → Port 80/443 (Nginx or direct) → Port 3000 (Frontend container, Nginx inside)
                                                 ↓ /api/* proxy
                                            Port 5000 (Backend container, Express)
```

The frontend container runs its own Nginx that handles SPA routing and proxies `/api/*` to the backend container over Docker's internal network (`designhive-network`). No host-level Nginx is required, but you may add one for SSL termination (see optional section).

---

## Step 1 — Provision the VPS

- Recommended: Ubuntu 22.04 LTS or 24.04 LTS, minimum 1 vCPU / 1 GB RAM
- Open firewall ports: **22** (SSH), **80** (HTTP), **443** (HTTPS if using SSL), **3000** (app if not using a host Nginx)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 3000/tcp   # or 80/443 if using host Nginx for SSL
sudo ufw enable
sudo ufw status
```

---

## Step 2 — Install Docker Engine + Docker Compose V2

Docker Compose V2 ships as a Docker CLI plugin (`docker compose`, not `docker-compose`).

```bash
# Remove old packages if any
sudo apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Install prerequisites
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key and repo
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine + Compose plugin
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verify
docker --version
docker compose version
```

---

## Step 3 — Allow the Deploy User to Run Docker Without sudo

The SSH user that GitHub Actions connects as must be in the `docker` group, otherwise every `docker` command in the deploy script will fail with "permission denied".

```bash
# Replace <deploy-user> with the actual SSH username (e.g., ubuntu, root, deployer)
sudo usermod -aG docker <deploy-user>

# Log out and back in for the group change to take effect, OR run:
newgrp docker

# Verify
docker ps   # should not require sudo
```

> If your deploy user is `root`, this step is not needed.

---

## Step 4 — Install Git

```bash
sudo apt-get install -y git
git --version
```

---

## Step 5 — Create the Deployment Directory

The deploy script clones the repo here on first run, so the directory just needs to exist with the right ownership.

```bash
sudo mkdir -p /var/www/designhive-admin
sudo chown <deploy-user>:<deploy-user> /var/www/designhive-admin
```

---

## Step 6 — Configure SSH Key Authentication for GitHub Actions

GitHub Actions SSHes into the VPS using the private key stored in the `VPS_SSH_KEY` secret.

**On your local machine**, generate a dedicated deploy key pair:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/designhive_deploy
# Leave passphrase empty when prompted
```

This produces:
- `~/.ssh/designhive_deploy` — private key (goes into GitHub Secrets)
- `~/.ssh/designhive_deploy.pub` — public key (goes onto the VPS)

**On the VPS**, add the public key to the deploy user's authorized_keys:

```bash
# As the deploy user on the VPS:
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "<paste contents of designhive_deploy.pub here>" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

**Test the connection from your local machine:**

```bash
ssh -i ~/.ssh/designhive_deploy <deploy-user>@<VPS_HOST> echo "SSH OK"
```

---

## Step 7 — Configure GitHub Repository Secrets

Go to your GitHub repo → **Settings → Secrets and variables → Actions → New repository secret** and add each of the following:

| Secret Name | Description |
|---|---|
| `VPS_HOST` | IP address or hostname of the VPS |
| `VPS_USER` | SSH username on the VPS (e.g. `ubuntu`) |
| `VPS_SSH_KEY` | Full contents of the private key file (`designhive_deploy`) |
| `GHCR_TOKEN` | GitHub Personal Access Token with `read:packages` and `write:packages` scopes |
| `SUPABASE_URL` | Supabase project URL (`https://<project>.supabase.co`) |
| `SUPABASE_KEY` | Supabase `anon` public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (keep private) |
| `GMAIL_CLIENT_ID` | Google OAuth2 client ID |
| `GMAIL_CLIENT_SECRET` | Google OAuth2 client secret |
| `GMAIL_REFRESH_TOKEN` | Gmail OAuth2 refresh token |
| `GMAIL_SENDER_EMAIL` | Sender email address (e.g. `support@designhiveai.com.au`) |
| `GMAIL_SENDER_NAME` | Display name for outgoing emails (e.g. `DesignHive`) |
| `JWT_SECRET` | Long random string used to sign JWTs — generate with `openssl rand -hex 64` |

### Generating a GHCR_TOKEN

1. GitHub → Your profile → **Settings → Developer settings → Personal access tokens → Tokens (classic)**
2. Click **Generate new token (classic)**
3. Scopes: check `read:packages`, `write:packages`, `delete:packages`
4. Copy the token and save it as the `GHCR_TOKEN` secret

---

## Step 8 — Make the GHCR Package Visibility Public (Optional but Recommended)

By default GHCR packages are private and require auth to pull. The deploy script logs in with `GHCR_TOKEN` before pulling, so private packages work. However, making packages public removes the dependency on the token for pulls:

1. GitHub → Your profile → **Packages** → select the package
2. **Package settings → Change visibility → Public**

Repeat for both `frontend` and `backend` packages once they exist (after the first successful CI run).

---

## Step 9 — Verify the Initial Deploy

After all secrets are set and the VPS is configured, push any commit to `main` or trigger the workflow manually via **Actions → CI/CD - Build & Deploy → Run workflow**.

Monitor progress in the Actions tab. On success, the app will be accessible at:

```
http://<VPS_HOST>:3000
```

---

## Step 10 — (Optional) Host-Level Nginx + SSL with Let's Encrypt

If you want to serve the app on port 80/443 with a domain name and HTTPS, install Nginx on the host to reverse-proxy to port 3000.

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx

# Create site config
sudo nano /etc/nginx/sites-available/designhive
```

Paste (replace `yourdomain.com`):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/designhive /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Issue SSL cert
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

After setting up SSL, update firewall:
```bash
sudo ufw allow 'Nginx Full'
sudo ufw delete allow 3000/tcp   # no longer needs to be exposed directly
```

---

## Troubleshooting

### Check running containers
```bash
docker ps
docker compose -f /var/www/designhive-admin/docker-compose.yml ps
```

### Tail container logs
```bash
docker logs designhive-frontend --tail 50 -f
docker logs designhive-backend  --tail 50 -f
```

### Re-run the deploy manually on the VPS
```bash
cd /var/www/designhive-admin
docker compose pull
docker compose up -d --pull always --force-recreate
```

### Check the .env file was written correctly
```bash
cat /var/www/designhive-admin/.env
```

### Disk space (clean up old images)
```bash
docker system prune -af
```

### Check Docker group membership takes effect
If `docker ps` still requires `sudo` after `usermod -aG docker <user>`, log out and back in, or run `newgrp docker`.

---

## How the CI/CD Pipeline Works

1. **Build job**: On every push to `main`, GitHub Actions builds the frontend and backend Docker images using `Dockerfile.frontend` and `Dockerfile.backend`. Both are tagged with `:latest` and the exact commit SHA, then pushed to GHCR.
2. **Deploy job**: SSHes into the VPS, pulls the image by the **exact commit SHA** (not `:latest`) to guarantee the newly built code is what runs, re-tags it as `:latest`, then recreates the containers with `docker compose up -d --pull always --force-recreate`.

Pulling by SHA is the critical detail that prevents stale deployments — Docker's local image cache can cause `docker compose pull :latest` to skip downloading a newer image if the tag name matches what's already cached.
