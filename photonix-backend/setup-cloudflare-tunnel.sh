#!/bin/bash

# Cloudflare Tunnel Quick Setup Script for Photonix
# This script helps you set up Cloudflare Tunnel quickly

set -e

echo "🚀 Cloudflare Tunnel Setup for Photonix"
echo "========================================"
echo ""

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "❌ cloudflared is not installed."
    echo "   Install it with: brew install cloudflared (macOS) or visit:"
    echo "   https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
    exit 1
fi

echo "✅ cloudflared is installed"
echo ""

# Step 1: Login
echo "Step 1: Authenticating with Cloudflare..."
echo "   This will open your browser to authorize the tunnel."
read -p "   Press Enter to continue..."
cloudflared tunnel login

# Step 2: Create tunnel
echo ""
echo "Step 2: Creating tunnel..."
read -p "   Enter a name for your tunnel (default: photonix-backend): " TUNNEL_NAME
TUNNEL_NAME=${TUNNEL_NAME:-photonix-backend}

TUNNEL_OUTPUT=$(cloudflared tunnel create "$TUNNEL_NAME" 2>&1)
TUNNEL_ID=$(echo "$TUNNEL_OUTPUT" | grep -oP '(?<=Created tunnel )[a-f0-9-]+' || echo "")

if [ -z "$TUNNEL_ID" ]; then
    echo "   ⚠️  Could not extract tunnel ID. Please run 'cloudflared tunnel list' to find it."
    read -p "   Enter your tunnel ID manually: " TUNNEL_ID
fi

echo "   ✅ Tunnel created: $TUNNEL_ID"
echo ""

# Step 3: Get domain
echo "Step 3: Domain configuration..."
read -p "   Enter your Cloudflare domain (e.g., yourdomain.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
    echo "   ❌ Domain is required"
    exit 1
fi

read -p "   Enter API subdomain (default: api): " API_SUBDOMAIN
API_SUBDOMAIN=${API_SUBDOMAIN:-api}

read -p "   Enter admin subdomain (default: photos): " ADMIN_SUBDOMAIN
ADMIN_SUBDOMAIN=${ADMIN_SUBDOMAIN:-photos}

API_HOSTNAME="${API_SUBDOMAIN}.${DOMAIN}"
ADMIN_HOSTNAME="${ADMIN_SUBDOMAIN}.${DOMAIN}"

echo "   ✅ API will be at: https://${API_HOSTNAME}"
echo "   ✅ Admin will be at: https://${ADMIN_HOSTNAME}"
echo ""

# Step 4: Find credentials file
CREDS_FILE=$(ls ~/.cloudflared/*.json 2>/dev/null | grep -i "$TUNNEL_ID" | head -1)
if [ -z "$CREDS_FILE" ]; then
    echo "   ⚠️  Could not find credentials file automatically."
    read -p "   Enter path to credentials file: " CREDS_FILE
fi

echo "   ✅ Using credentials: $CREDS_FILE"
echo ""

# Step 5: Create config
CONFIG_DIR="$HOME/.cloudflared"
CONFIG_FILE="$CONFIG_DIR/config.yml"

echo "Step 4: Creating tunnel configuration..."
mkdir -p "$CONFIG_DIR"

# Ask if using Nginx or direct Rails
read -p "   Use Nginx (port 80) or direct Rails (port 3000)? [nginx/rails] (default: nginx): " PROXY_CHOICE
PROXY_CHOICE=${PROXY_CHOICE:-nginx}
PORT=80
if [ "$PROXY_CHOICE" = "rails" ]; then
    PORT=3000
fi

cat > "$CONFIG_FILE" << EOF
tunnel: $TUNNEL_ID
credentials-file: $CREDS_FILE

ingress:
  # API endpoint
  - hostname: $API_HOSTNAME
    service: http://localhost:$PORT
  
  # Admin dashboard
  - hostname: $ADMIN_HOSTNAME
    service: http://localhost:$PORT
  
  # Catch-all rule (must be last)
  - service: http_status:404
EOF

echo "   ✅ Configuration saved to: $CONFIG_FILE"
echo ""

# Step 6: Create DNS records
echo "Step 5: Creating DNS records..."
cloudflared tunnel route dns "$TUNNEL_NAME" "$API_HOSTNAME"
cloudflared tunnel route dns "$TUNNEL_NAME" "$ADMIN_HOSTNAME"
echo "   ✅ DNS records created"
echo ""

# Step 7: Update CORS (optional)
echo "Step 6: CORS configuration..."
read -p "   Update CORS config to allow your domain? [y/N]: " UPDATE_CORS
if [ "$UPDATE_CORS" = "y" ] || [ "$UPDATE_CORS" = "Y" ]; then
    CORS_FILE="config/initializers/cors.rb"
    if [ -f "$CORS_FILE" ]; then
        # Check if domain is already in ALLOWED_ORIGINS
        if ! grep -q "$API_HOSTNAME\|$ADMIN_HOSTNAME" "$CORS_FILE"; then
            echo "   ⚠️  Please manually update $CORS_FILE to include:"
            echo "      ALLOWED_ORIGINS=\"https://${API_HOSTNAME},https://${ADMIN_HOSTNAME}\""
            echo "      Or set it as an environment variable in docker-compose.yml"
        else
            echo "   ✅ CORS already configured"
        fi
    fi
fi
echo ""

# Step 8: Summary
echo "=========================================="
echo "✅ Setup Complete!"
echo ""
echo "📋 Summary:"
echo "   Tunnel Name: $TUNNEL_NAME"
echo "   Tunnel ID: $TUNNEL_ID"
echo "   API URL: https://${API_HOSTNAME}"
echo "   Admin URL: https://${ADMIN_HOSTNAME}"
echo "   Config: $CONFIG_FILE"
echo ""
echo "🚀 Next Steps:"
echo "   1. Start your backend: docker-compose up"
echo "   2. Start the tunnel: cloudflared tunnel run $TUNNEL_NAME"
echo "   3. Update mobile app API config to: https://${API_HOSTNAME}/api/v1"
echo "   4. Test: Visit https://${ADMIN_HOSTNAME}/admin/login"
echo ""
echo "💡 To run tunnel as a service:"
echo "   macOS: See CLOUDFLARE_TUNNEL_SETUP.md for launchd setup"
echo "   Linux: sudo cloudflared service install"
echo ""

