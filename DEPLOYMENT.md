# Deploying to AWS EC2 (Free Tier)

This guide sets up MobileFix Portal on a single free-tier EC2 instance: Node.js app + PostgreSQL
on the same box, Nginx in front as a reverse proxy, PM2 keeping the app alive, and free SSL via
Let's Encrypt if you have a domain.

**Free tier reality check:** AWS's free tier terms changed in mid-2025 — check the **Billing →
Free Tier** page in your AWS account to confirm what you're entitled to (traditionally: 750
hrs/month of `t2.micro`/`t3.micro` and 30GB of EBS storage for 12 months on a new account). An
Elastic IP is free *only* while it's attached to a running instance — if you stop the instance
without releasing the IP, it starts costing money.

## Phase 1 — Launch the instance (AWS Console)

1. Log into the [AWS Console](https://console.aws.amazon.com/) → **EC2** → **Launch instance**.
2. **Name**: `mobile-shop-portal`.
3. **AMI**: Ubuntu Server 24.04 LTS (free tier eligible).
4. **Instance type**: `t2.micro` or `t3.micro` (free tier eligible — pick whichever your account
   shows as eligible).
5. **Key pair**: create a new one, download the `.pem` file, and keep it safe — you can't
   re-download it later.
6. **Network settings** → Edit security group rules, allow:
   - SSH (22) — source: *My IP* (not "Anywhere", to keep it locked to you)
   - HTTP (80) — source: Anywhere (0.0.0.0/0)
   - HTTPS (443) — source: Anywhere (0.0.0.0/0)
   - Do **not** open 5432 (Postgres) to the internet — it only needs to be reachable from the
     instance itself.
7. **Storage**: 30GB gp3 (still within free tier).
8. Launch it, wait for it to show "Running", and note its **Public IPv4 address**.
9. Optional but recommended: **EC2 → Elastic IPs → Allocate**, then associate it with the
   instance, so the IP survives reboots.

Once you've got a public IP, tell me and I'll walk you through Phase 2 (server setup) —
I can either hand you the exact commands to paste in over SSH, or run them for you directly if
you share the IP and confirm you want me to SSH in.

## Phase 2 — Server setup (run over SSH)

```bash
ssh -i your-key.pem ubuntu@YOUR_PUBLIC_IP

sudo apt update && sudo apt upgrade -y

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL, Nginx, git, build tools
sudo apt install -y postgresql postgresql-contrib nginx git

# PM2 (process manager, keeps the app running + restarts on crash/reboot)
sudo npm install -g pm2

# Swap space — a t2/t3.micro only has 1GB RAM, and `npm run build` needs more.
# This adds 2GB of disk-backed swap so the build doesn't get killed (OOM).
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## Phase 3 — Database setup

```bash
sudo -u postgres psql <<'EOF'
CREATE ROLE mobileshop_app LOGIN PASSWORD 'choose-a-strong-password-here';
CREATE DATABASE mobileshop OWNER mobileshop_app;
GRANT ALL PRIVILEGES ON DATABASE mobileshop TO mobileshop_app;
EOF
```

Postgres listens on `localhost` only by default — leave it that way. The app on the same box
connects to it via `127.0.0.1`, so it never needs to be exposed externally.

## Phase 4 — Deploy the app

```bash
cd ~
git clone https://github.com/pvnrg/mobile-shop-job-portal.git
cd mobile-shop-job-portal
npm install

# Create the production env file
cat > .env.local <<'EOF'
DATABASE_URL="postgres://mobileshop_app:choose-a-strong-password-here@localhost:5432/mobileshop"
AUTH_SECRET="GENERATE_A_NEW_RANDOM_SECRET_HERE"
NEXTAUTH_URL="http://YOUR_PUBLIC_IP_OR_DOMAIN"
UPLOAD_DIR="./uploads"
EOF
```

Generate a real `AUTH_SECRET` (don't reuse the one from your local `.env.local`) with:
```bash
openssl rand -base64 32
```

Then set up the database schema and data, and build:
```bash
npm run db:push
npm run db:seed
npm run db:seed-devices
npm run build
```

If `npm run build` still gets killed, double check the swap file from Phase 2 is active with
`free -h` (you should see ~2GB under "Swap").

## Phase 5 — Run it with PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup    # follow the printed instructions (it gives you a command to run with sudo)
```

`pm2 startup` wires PM2 into systemd so the app comes back up automatically if the instance
reboots. From now on:
- `pm2 logs mobile-shop-portal` — view logs
- `pm2 restart mobile-shop-portal` — restart after a code change
- `pm2 status` — check it's running

## Phase 6 — Nginx reverse proxy

```bash
sudo tee /etc/nginx/sites-available/mobile-shop-portal <<'EOF'
server {
    listen 80;
    server_name YOUR_PUBLIC_IP_OR_DOMAIN;

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
EOF

sudo ln -s /etc/nginx/sites-available/mobile-shop-portal /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
```

At this point `http://YOUR_PUBLIC_IP` should load the login page.

## Phase 7 — Free SSL (only if you have a domain pointed at the instance)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

Certbot edits the Nginx config for you and sets up auto-renewal. If you're only using the raw
IP address (no domain), skip this — you can't get a real SSL cert for a bare IP, so the app runs
over plain HTTP. That's an acceptable trade-off for an internal shop tool but not for anything
handling sensitive data over the open internet, so a domain + SSL is worth it if this will be
used outside a trusted network.

If you do add a domain later, update `NEXTAUTH_URL` in `.env.local` to `https://yourdomain.com`
and `pm2 restart mobile-shop-portal`.

## After deployment

- Log in with the seeded admin (`admin@mobileshop.local` / `Admin@12345`) and **change the
  password immediately** — add a new admin from Settings → Staff and disable the default one.
- Uploaded files (`uploads/`, `public/uploads/logo/`) live on the instance's disk. If you ever
  need to move to a bigger/different instance, remember to copy these directories along with a
  `pg_dump` of the database — they won't come from git.

## Redeploying after code changes

```bash
cd ~/mobile-shop-job-portal
git pull
npm install
npm run build
pm2 restart mobile-shop-portal
```

If the schema changed, also run `npm run db:push` before the build.
