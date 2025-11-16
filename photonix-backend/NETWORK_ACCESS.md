# Network Access Guide

## Local Network Access (Development)

### Your Mac's Local IP Address
**Current IP: 192.168.0.164**

### How to Access from Other Devices on Same WiFi

**1. Start Docker containers:**
```bash
docker-compose up
```

**2. Access from any device on the same WiFi:**
- **Admin Dashboard:** http://192.168.0.164:3000
- **API Endpoint:** http://192.168.0.164:3000/api/v1

**3. Update Settings in Admin Dashboard:**
- Login to: http://192.168.0.164:3000/admin/login
- Go to Settings
- Update "Server URL" to: `http://192.168.0.164:3000`
- Save Settings

**4. Generate QR Codes:**
- QR codes will now use `http://192.168.0.164:3000`
- Mobile app users on same WiFi can scan and login

### Testing from Mobile Phone

**iOS/Android:**
1. Connect your phone to the same WiFi network as your Mac
2. Open browser on phone
3. Visit: http://192.168.0.164:3000
4. You should see the Photonix login page

### Important Notes

- Both devices must be on the **same WiFi network**
- Your Mac must have Docker running
- If your Mac's IP changes (reconnects to WiFi), update the Settings again
- Firewall on Mac must allow connections on port 3000

### Find Your IP Address Anytime

```bash
# On Mac
ipconfig getifaddr en0
# or
ipconfig getifaddr en1
```

---

## Production Domain Access (Deployment)

### When deploying to production with a domain:

**1. Set Environment Variable:**
```bash
# In your production environment
export ALLOWED_HOSTS=photos.yourdomain.com,www.photos.yourdomain.com
```

**2. Update Settings:**
- Login to admin dashboard
- Go to Settings
- Update "Server URL" to: `https://photos.yourdomain.com`
- Save Settings

**3. Configure SSL:**
- Use a reverse proxy (Nginx, Caddy) for SSL termination
- Or enable `force_ssl` in production.rb

**4. Docker Deployment:**
Update your production `docker-compose.yml` or deployment config:
```yaml
environment:
  ALLOWED_HOSTS: photos.yourdomain.com,www.photos.yourdomain.com
  RAILS_ENV: production
```

---

## Troubleshooting

### "This site can't be reached" on mobile

**Check:**
1. Both devices on same WiFi?
   ```bash
   # On Mac, check network
   networksetup -getinfo Wi-Fi

   # On phone, check WiFi settings
   ```

2. Docker running?
   ```bash
   docker-compose ps
   ```

3. Port 3000 accessible?
   ```bash
   lsof -i :3000
   ```

4. Firewall blocking?
   ```bash
   # On Mac, check Firewall in System Preferences > Security & Privacy
   ```

### IP Address Changed

If your Mac reconnects to WiFi and gets a new IP:

1. Find new IP: `ipconfig getifaddr en0`
2. Update Settings with new IP
3. Regenerate QR codes if needed

### Cannot Access from Outside WiFi

- Local network access only works on same WiFi
- For internet access, deploy to production with a domain
- Or use ngrok for temporary public access (not recommended for production)

---

## Quick Reference

| Access Type | URL Format | When to Use |
|-------------|-----------|-------------|
| Localhost | http://localhost:3000 | Testing on your Mac only |
| Local Network | http://192.168.0.164:3000 | Testing on multiple devices (same WiFi) |
| Production | https://photos.yourdomain.com | Public deployment |

