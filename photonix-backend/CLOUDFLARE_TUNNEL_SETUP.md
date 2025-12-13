# Cloudflare Tunnel Setup Guide

This guide will help you expose your Photonix backend to the internet using Cloudflare Tunnel (formerly Argo Tunnel), allowing your mobile app to connect from anywhere.

## Prerequisites

1. A Cloudflare account (free tier works)
2. A domain name added to Cloudflare
3. Docker and Docker Compose installed
4. Your backend running locally

## Step 1: Install Cloudflare Tunnel (cloudflared)

### On macOS:
```bash
brew install cloudflared
```

### On Linux:
```bash
# Download and install
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
sudo chmod +x /usr/local/bin/cloudflared
```

### Verify installation:
```bash
cloudflared --version
```

## Step 2: Authenticate with Cloudflare

```bash
cloudflared tunnel login
```

This will:
1. Open your browser
2. Ask you to select a domain from your Cloudflare account
3. Authorize the tunnel to create DNS records

## Step 3: Create a Tunnel

```bash
# Create a named tunnel
cloudflared tunnel create photonix-backend
```

This creates a tunnel and saves credentials. Note the tunnel ID that's displayed.

## Step 4: Create Tunnel Configuration

Create a config file for your tunnel:

```bash
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

Add the following configuration (replace `yourdomain.com` with your actual domain):

```yaml
tunnel: <YOUR_TUNNEL_ID>
credentials-file: /Users/ravi/.cloudflared/<TUNNEL_ID>.json

ingress:
  # Route API requests to your Rails backend
  - hostname: api.yourdomain.com
    service: http://localhost:3000
  
  # Route admin dashboard to your Rails backend
  - hostname: photos.yourdomain.com
    service: http://localhost:3000
  
  # Catch-all rule (must be last)
  - service: http_status:404
```

**Alternative: If using Nginx (recommended for production):**

```yaml
tunnel: <YOUR_TUNNEL_ID>
credentials-file: /Users/ravi/.cloudflared/<TUNNEL_ID>.json

ingress:
  # Route all traffic through Nginx (which proxies to Rails)
  - hostname: api.yourdomain.com
    service: http://localhost:80
  
  - hostname: photos.yourdomain.com
    service: http://localhost:80
  
  # Catch-all rule (must be last)
  - service: http_status:404
```

**To find your tunnel ID:**
```bash
cloudflared tunnel list
```

**To find your credentials file:**
```bash
ls ~/.cloudflared/*.json
```

## Step 5: Create DNS Records

Create DNS records pointing to your tunnel:

```bash
# For API subdomain
cloudflared tunnel route dns photonix-backend api.yourdomain.com

# For main domain (optional, for admin dashboard)
cloudflared tunnel route dns photonix-backend photos.yourdomain.com
```

Or create them manually in Cloudflare Dashboard:
1. Go to Cloudflare Dashboard → DNS → Records
2. Add CNAME record:
   - Name: `api` (or `photos`)
   - Target: `<TUNNEL_ID>.cfargotunnel.com`
   - Proxy: Enabled (orange cloud)

## Step 6: Start the Tunnel

### Option A: Run directly (for testing)
```bash
cloudflared tunnel run photonix-backend
```

### Option B: Run as a service (recommended for production)

**On macOS (using launchd):**

1. Create a plist file:
```bash
nano ~/Library/LaunchAgents/com.cloudflare.cloudflared.plist
```

2. Add this content:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.cloudflare.cloudflared</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/cloudflared</string>
        <string>tunnel</string>
        <string>run</string>
        <string>photonix-backend</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/cloudflared.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/cloudflared.error.log</string>
</dict>
</plist>
```

3. Load the service:
```bash
launchctl load ~/Library/LaunchAgents/com.cloudflare.cloudflared.plist
```

4. Start the service:
```bash
launchctl start com.cloudflare.cloudflared
```

5. Check status:
```bash
launchctl list | grep cloudflared
```

**On Linux (using systemd):**

1. Install as a service:
```bash
sudo cloudflared service install
```

2. Edit the config:
```bash
sudo nano /etc/cloudflared/config.yml
```

3. Start the service:
```bash
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

4. Check status:
```bash
sudo systemctl status cloudflared
```

## Step 7: Update Mobile App Configuration

Update your mobile app to use the Cloudflare domain:

### Update `photonix-mobile/src/config/api.ts`:

```typescript
// API Configuration
export const API_CONFIG = {
  BASE_URL: __DEV__
    ? 'https://api.yourdomain.com/api/v1'  // Cloudflare Tunnel URL
    : 'https://api.yourdomain.com/api/v1', // Production URL
  TIMEOUT: 30000, // 30 seconds
};
```

Replace `yourdomain.com` with your actual domain.

## Step 7: Update Backend CORS Configuration

If you're running in production mode, update CORS to allow your Cloudflare domain:

**Option A: Environment Variable (Recommended)**

Add to your `docker-compose.yml`:
```yaml
  web:
    environment:
      # ... existing vars ...
      ALLOWED_ORIGINS: "https://api.yourdomain.com,https://photos.yourdomain.com"
```

**Option B: Update CORS Config Directly**

Edit `config/initializers/cors.rb`:
```ruby
else
  # Add your Cloudflare domains
  origins ENV.fetch("ALLOWED_ORIGINS", "https://api.yourdomain.com,https://photos.yourdomain.com").split(",")
  # ... rest of config ...
end
```

## Step 8: Update Backend Settings

1. Access your admin dashboard: `https://photos.yourdomain.com/admin/login`
2. Go to Settings
3. Update "Server URL" to: `https://api.yourdomain.com`
4. Save Settings

## Step 9: Quick Setup Script

For faster setup, you can use the provided script:

```bash
cd photonix-backend
./setup-cloudflare-tunnel.sh
```

This interactive script will guide you through all the steps above.

## Step 10: Test the Connection

1. **Test from browser:**
   - Visit: `https://api.yourdomain.com/api/v1/health` (if you have a health endpoint)
   - Visit: `https://photos.yourdomain.com/admin/login`

2. **Test from mobile app:**
   - Update the API config as shown above
   - Rebuild the app
   - Try logging in

## Step 11: Update Docker Compose (Optional)

If you want to run the tunnel inside Docker, add this to your `docker-compose.yml`:

```yaml
  cloudflared:
    image: cloudflare/cloudflared:latest
    command: tunnel run photonix-backend
    volumes:
      - ~/.cloudflared:/etc/cloudflared
    restart: unless-stopped
    depends_on:
      - web
      - nginx
```

**Note:** You'll need to copy your tunnel credentials into the container or mount them as volumes.

## Troubleshooting

### Tunnel not connecting
- Check tunnel is running: `cloudflared tunnel list`
- Check logs: `tail -f /tmp/cloudflared.log`
- Verify DNS records are correct in Cloudflare dashboard
- Ensure your backend is running on localhost:3000

### SSL/HTTPS issues
- Cloudflare Tunnel automatically provides HTTPS
- Make sure your backend handles the `X-Forwarded-Proto` header correctly
- Check Nginx config includes: `proxy_set_header X-Forwarded-Proto https;`

### CORS issues
- Update Rails CORS config to allow your Cloudflare domain
- Check `config/initializers/cors.rb` or similar

### Mobile app can't connect
- Verify the API URL in `api.ts` uses `https://` not `http://`
- Check network security config for Android (allows cleartext traffic)
- Test the API endpoint in a browser first

### View tunnel logs
```bash
# macOS
tail -f /tmp/cloudflared.log

# Linux
sudo journalctl -u cloudflared -f
```

## Security Considerations

1. **Authentication:** Your backend should still require authentication
2. **Rate Limiting:** Consider enabling Cloudflare rate limiting
3. **Firewall:** Your local server doesn't need to expose ports to the internet
4. **SSL:** Cloudflare provides free SSL certificates automatically

## Benefits of Cloudflare Tunnel

- ✅ No need to open ports on your router
- ✅ Free SSL certificates
- ✅ DDoS protection
- ✅ Works behind NAT/firewall
- ✅ No need for dynamic DNS
- ✅ Access from anywhere

## Next Steps

1. Set up automatic tunnel restart on system boot
2. Configure Cloudflare caching rules (if needed)
3. Set up monitoring/alerting for tunnel status
4. Consider using Cloudflare Access for additional security

