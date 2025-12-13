# Cloudflare Tunnel Setup Status

## ✅ Completed Steps

1. **Tunnel Configuration Updated**
   - Config file: `~/.cloudflared/config.yml`
   - Tunnel: `asharedclick-app` (ID: `9d8541a7-46cb-4996-bca1-9cfcddd71bde`)
   - Routes configured:
     - `api.asharedclick.com` → `http://127.0.0.1:80`
     - `photos.asharedclick.com` → `http://127.0.0.1:80`

2. **Tunnel Running**
   - Process is active and connected to Cloudflare edge
   - Logs: `/tmp/cloudflared.log`

3. **Mobile App Updated**
   - File: `photonix-mobile/src/config/api.ts`
   - API URL: `https://api.asharedclick.com/api/v1`

4. **Backend CORS Updated**
   - File: `docker-compose.yml`
   - Added: `ALLOWED_ORIGINS: "https://api.asharedclick.com,https://photos.asharedclick.com"`

## ⚠️ Action Required: DNS Records

The DNS records need to be created in your Cloudflare dashboard. The tunnel route commands may have created records under a different domain.

### Manual DNS Setup (Recommended)

1. **Go to Cloudflare Dashboard**
   - Visit: https://dash.cloudflare.com
   - Select your domain (likely `asharedclick.com` or `dailzy.com`)

2. **Create CNAME Records**
   
   **For API subdomain:**
   - Type: `CNAME`
   - Name: `api`
   - Target: `9d8541a7-46cb-4996-bca1-9cfcddd71bde.cfargotunnel.com`
   - Proxy status: **Proxied** (orange cloud ☁️)
   - TTL: Auto

   **For Photos subdomain:**
   - Type: `CNAME`
   - Name: `photos`
   - Target: `9d8541a7-46cb-4996-bca1-9cfcddd71bde.cfargotunnel.com`
   - Proxy status: **Proxied** (orange cloud ☁️)
   - TTL: Auto

3. **Wait for DNS Propagation**
   - Usually takes 1-5 minutes
   - Check with: `nslookup api.asharedclick.com`

## 🧪 Testing

### Test API Endpoint
```bash
curl https://api.asharedclick.com/api/v1/health
```

### Test Admin Dashboard
```bash
curl -I https://photos.asharedclick.com/admin/login
```

### Check Tunnel Status
```bash
cloudflared tunnel info asharedclick-app
```

### View Tunnel Logs
```bash
tail -f /tmp/cloudflared.log
```

## 🔄 Restart Tunnel (if needed)

```bash
# Stop tunnel
pkill -f "cloudflared tunnel run"

# Start tunnel
cloudflared tunnel run asharedclick-app > /tmp/cloudflared.log 2>&1 &
```

## 📱 Mobile App Testing

1. **Rebuild the mobile app** to pick up the new API URL
2. **Test login** from anywhere (not just local network)
3. **Verify** photos can be uploaded/downloaded

## 🐛 Troubleshooting

### DNS not resolving
- Check Cloudflare dashboard for correct CNAME records
- Ensure records are **Proxied** (orange cloud)
- Wait a few minutes for DNS propagation

### 502 Bad Gateway
- Check if backend is running: `docker-compose ps`
- Check tunnel logs: `tail -f /tmp/cloudflared.log`
- Verify tunnel is connected (should show multiple edge locations)

### CORS errors
- Restart Docker containers: `docker-compose restart web`
- Verify `ALLOWED_ORIGINS` in `docker-compose.yml`
- Check browser console for specific CORS error

### Connection timeout
- Verify tunnel is running: `ps aux | grep cloudflared`
- Check tunnel logs for errors
- Ensure backend is accessible on `localhost:80`

## 📝 Next Steps

1. ✅ Create DNS records in Cloudflare dashboard
2. ✅ Wait for DNS propagation (1-5 minutes)
3. ✅ Test API endpoint from browser/curl
4. ✅ Test admin dashboard
5. ✅ Rebuild mobile app
6. ✅ Test mobile app connection from different network

## 🔐 Security Notes

- Cloudflare Tunnel provides automatic HTTPS
- No need to expose ports on your router
- DDoS protection included
- Free SSL certificates

