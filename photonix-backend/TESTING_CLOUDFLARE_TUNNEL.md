# Testing Cloudflare Tunnel

## ✅ Setup Complete

- DNS records added in Cloudflare dashboard
- Tunnel is running and connected
- Backend services are running
- Mobile app configured

## 🧪 Testing Steps

### 1. Test from Browser (Recommended)

Open these URLs in your browser:

**API Health Check:**
```
https://api.asharedclick.com/api/v1/health
```

**Admin Dashboard:**
```
https://photos.asharedclick.com/admin/login
```

**Expected Results:**
- Should load without SSL errors
- API should return JSON response
- Admin dashboard should show login page

### 2. Test from Mobile Device

1. **Rebuild the mobile app** to pick up the new API URL
2. **Test login** from your phone (on any network, not just local WiFi)
3. **Verify** you can:
   - Login successfully
   - Upload photos
   - View photos
   - Create albums

### 3. Test from Different Network

Try accessing from:
- Your phone's mobile data (not WiFi)
- A different computer/network
- This confirms the tunnel is working from outside your local network

### 4. Check Tunnel Status

```bash
# View tunnel info
cloudflared tunnel info asharedclick-app

# View tunnel logs
tail -f /tmp/cloudflared.log
```

### 5. Verify DNS Propagation

```bash
# Check DNS resolution
nslookup api.asharedclick.com
nslookup photos.asharedclick.com

# Should show Cloudflare IPs (104.21.x.x or 172.67.x.x)
```

## 🐛 Troubleshooting

### "Could not resolve host" in curl
- **Cause:** Local DNS cache
- **Fix:** Wait a few minutes, or test from browser/phone instead
- **Alternative:** Use `dig` or `nslookup` to verify DNS

### 502 Bad Gateway
- **Check:** Is backend running? `docker-compose ps`
- **Check:** Is tunnel running? `ps aux | grep cloudflared`
- **Check:** Tunnel logs for errors: `tail -f /tmp/cloudflared.log`

### SSL Certificate Error
- Cloudflare provides SSL automatically
- If you see errors, check Cloudflare dashboard → SSL/TLS settings
- Ensure SSL/TLS encryption mode is "Full" or "Full (strict)"

### CORS Errors
- **Check:** `ALLOWED_ORIGINS` in `docker-compose.yml`
- **Restart:** `docker-compose restart web`
- **Verify:** Backend logs show CORS headers

### Mobile App Can't Connect
- **Verify:** API URL in `photonix-mobile/src/config/api.ts` is correct
- **Rebuild:** The app after changing API config
- **Check:** Network security config for Android (should allow HTTPS)

## ✅ Success Indicators

You'll know it's working when:
1. ✅ Browser can access both URLs
2. ✅ Mobile app can login from any network
3. ✅ Photos can be uploaded/downloaded
4. ✅ No "connection refused" or "timeout" errors

## 📝 Next Steps

Once testing confirms everything works:
1. ✅ Keep tunnel running (or set up as service)
2. ✅ Update admin dashboard settings with new URL
3. ✅ Share the mobile app - it will work from anywhere!

