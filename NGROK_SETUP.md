# ngrok Setup Guide for OAuth Testing

This guide shows you how to set up ngrok (free tier) to test Apple Sign In and Google OAuth with your local development server.

## Prerequisites

- Fastify OAuth API running locally
- Apple Developer Account (for Apple Sign In)
- Google Cloud Console project (for Google OAuth)

---

## Part 1: Install and Configure ngrok

### Step 1: Install ngrok

```bash
# Add ngrok repository
curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list

# Update and install
sudo apt update && sudo apt install ngrok
```

### Step 2: Create ngrok Account

1. Go to https://dashboard.ngrok.com/signup
2. Sign up with Google or GitHub
3. Navigate to https://dashboard.ngrok.com/get-started/your-authtoken
4. Copy your authtoken

### Step 3: Configure ngrok

```bash
# Add your authtoken (replace with your actual token)
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
```

### Step 4: Start ngrok Tunnel

```bash
# Start tunnel to admin panel (port 3000)
ngrok http 3000
```

**Output will look like:**
```
Forwarding  https://abc123def456.ngrok-free.app -> http://localhost:3000
```

**⚠️ IMPORTANT: Copy the full HTTPS URL!**
- Example: `https://abc123def456.ngrok-free.app`
- This is your **ngrok URL** - you'll need it for all next steps
- **Keep this terminal window open!**

---

## Part 2: Apple Developer Setup

### Step 1: Create App ID

1. Go to https://developer.apple.com/account/resources/identifiers/list
2. Click **+** button
3. Select **App IDs** → Continue
4. Select **App** → Continue
5. Fill in:
   - **Description**: `Fastify OAuth API`
   - **Bundle ID**: `com.yourcompany.fastifyoauth` (choose your own)
   - **Capabilities**: Check ✅ **Sign In with Apple**
6. Click **Continue** → **Register**

### Step 2: Create Service ID (Web Configuration)

1. Click **+** button
2. Select **Services IDs** → Continue
3. Fill in:
   - **Description**: `Fastify OAuth Sign In Service`
   - **Identifier**: `com.yourcompany.fastifyoauth.signin`
   - Check ✅ **Sign In with Apple**
4. Click **Continue** → **Register**
5. Click on your newly created Service ID
6. Click **Configure** button next to "Sign In with Apple"
7. Configure Web Authentication:
   - **Primary App ID**: Select the App ID you created in Step 1
   - **Domains and Subdomains**: Enter ONLY the subdomain part
     - ✅ Correct: `abc123def456.ngrok-free.app`
     - ❌ Wrong: `https://abc123def456.ngrok-free.app`
   - **Return URLs**: Enter the full callback URL
     - ✅ Correct: `https://abc123def456.ngrok-free.app/api/auth/apple/callback`
8. Click **Save** → **Continue** → **Save**

**📝 Note down your Service ID - this is your `APPLE_CLIENT_ID`**

### Step 3: Create Sign In Key

1. Go to https://developer.apple.com/account/resources/authkeys/list
2. Click **+** button
3. Fill in:
   - **Key Name**: `Fastify OAuth Sign In Key`
   - Check ✅ **Sign In with Apple**
4. Click **Configure** → Select your App ID → **Save**
5. Click **Continue** → **Register**
6. **⚠️ DOWNLOAD THE .p8 FILE IMMEDIATELY** (only shown once!)
7. **📝 Note down the Key ID** (shown on page, 10 characters like `XYZ987ABC1`)

### Step 4: Get Team ID

1. Go to https://developer.apple.com/account
2. Find **Team ID** in the Membership section
3. **📝 Note down your Team ID** (10 characters like `ABC123DEFG`)

### Step 5: Save Apple Private Key

```bash
# Move the downloaded .p8 file to keys directory
# Replace "AuthKey_XYZ987ABC1.p8" with your actual filename
mv ~/Downloads/AuthKey_XYZ987ABC1.p8 keys/apple-private-key.p8

# Verify it's there
ls -l keys/apple-private-key.p8
```

---

## Part 3: Google OAuth Setup

### Step 1: Update Google Cloud Console

1. Go to https://console.cloud.google.com/apis/credentials
2. Select your OAuth 2.0 Client ID (or create new one if needed)
3. Under **Authorized redirect URIs**, click **+ ADD URI**
4. Enter your ngrok callback URL:
   ```
   https://abc123def456.ngrok-free.app/api/auth/google/callback
   ```
   (Replace with your actual ngrok URL)
5. Click **Save**

---

## Part 4: Update Environment Variables

### Step 1: Update Backend .env

Open `.env` file and update these variables:

```bash
# ==========================================
# NGROK OAUTH CONFIGURATION
# ==========================================
# Set HOST_URL to your ngrok URL - all redirect URIs use this automatically!
HOST_URL=https://abc123def456.ngrok-free.app

# OAuth redirect URIs automatically use ${HOST_URL}:
# GOOGLE_REDIRECT_URI=${HOST_URL}/api/auth/google/callback
# APPLE_REDIRECT_URI=${HOST_URL}/api/auth/apple/callback
# CORS_ORIGIN=http://localhost:3000,${HOST_URL}

# Apple OAuth credentials
APPLE_CLIENT_ID=com.yourcompany.fastifyoauth.signin
APPLE_TEAM_ID=ABC123DEFG
APPLE_KEY_ID=XYZ987ABC1
APPLE_PRIVATE_KEY_PATH=./keys/apple-private-key.p8

# Super Admin (set to your Google email for auto-promotion)
SUPER_ADMIN_EMAIL=youremail@gmail.com
```

**💡 Pro Tip:** You only need to update `HOST_URL`! The redirect URIs automatically use `${HOST_URL}` variable interpolation, so changing one variable updates all OAuth configurations.

### Step 2: Verify Admin Panel API Key

Ensure root `.env` has your API key:

```bash
VITE_ADMIN_PANEL_API_KEY=your_admin_panel_api_key_here
```

If you don't have an API key, generate one:

```bash
npm run db:seed:superadmin
# Copy the admin_panel_api_key from the output
```

---

## Part 5: Start All Services

### Terminal 1: ngrok
```bash
ngrok http 3000
# Keep this running! Note the HTTPS URL!
```

### Terminal 2: Docker Services
```bash
npm run docker:start
# Wait for services to be healthy
```

### Terminal 3: Backend API
```bash
npm run dev
# Should start on http://localhost:1337
```

### Terminal 4: Admin Panel
```bash
cd admin
npm run dev
# Should start on http://localhost:3000
```

---

## Part 6: Test OAuth

### Step 1: Access Admin Panel

1. Open browser
2. Go to your ngrok URL: `https://abc123def456.ngrok-free.app/admin`
3. **ngrok warning page appears**: Click **"Visit Site"** button
4. You should see the admin login page

### Step 2: Test Google OAuth

1. Click **"Continue with Google"** button
2. Redirects to Google login
3. Sign in with your Google account
4. **ngrok warning appears again**: Click **"Visit Site"**
5. Should redirect to admin dashboard
6. If your email matches `SUPER_ADMIN_EMAIL`, you'll be superadmin

### Step 3: Test Apple OAuth

1. Click **"Continue with Apple"** button (if implemented in UI)
2. Redirects to Apple login
3. Sign in with your Apple ID
4. **ngrok warning appears again**: Click **"Visit Site"**
5. Should redirect to admin dashboard

---

## Troubleshooting

### Issue: ngrok warning page doesn't redirect

**Symptoms**: Clicking "Visit Site" does nothing

**Fix**:
- Ensure your ngrok tunnel is still running
- Verify the URL hasn't changed
- Try refreshing the page

### Issue: "API key is required" error

**Symptoms**: 401 error when accessing admin panel

**Fix**:
```bash
# Verify API key is set in root .env
cat .env | grep VITE_ADMIN_PANEL_API_KEY

# If empty, run seed and copy the key
npm run db:seed:superadmin
```

### Issue: CORS error

**Symptoms**: Browser console shows CORS policy error

**Fix**:
- Verify `CORS_ORIGIN` in `.env` includes your ngrok URL
- Restart the API after updating `.env`

### Issue: OAuth redirect fails

**Symptoms**: "redirect_uri_mismatch" or similar error

**Fix**:
- Verify redirect URI in Apple Developer Console **exactly** matches ngrok URL
- Verify redirect URI in Google Cloud Console **exactly** matches ngrok URL
- Check for typos, trailing slashes, http vs https

### Issue: Apple "invalid_client" error

**Symptoms**: Apple returns invalid_client error

**Fix**:
- Verify `APPLE_CLIENT_ID` matches Service ID from Apple Developer Console
- Verify `APPLE_TEAM_ID` is correct (10 characters)
- Verify `APPLE_KEY_ID` is correct (10 characters)
- Verify `.p8` file exists: `ls -l keys/apple-private-key.p8`

---

## When ngrok URL Changes

**Every time you restart ngrok, the URL changes!** Follow these steps:

### Step 1: Get New URL
```bash
# Restart ngrok
ngrok http 3000

# Copy the new URL (e.g., https://xyz789new123.ngrok-free.app)
```

### Step 2: Update Apple Developer Console

1. Go to https://developer.apple.com/account/resources/identifiers/list/serviceId
2. Click your Service ID
3. Click **Configure** next to Sign In with Apple
4. Update:
   - **Domain**: `xyz789new123.ngrok-free.app` (new subdomain only)
   - **Return URL**: `https://xyz789new123.ngrok-free.app/api/auth/apple/callback`
5. Save → Continue → Save

### Step 3: Update Google Cloud Console

1. Go to https://console.cloud.google.com/apis/credentials
2. Click your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**:
   - Remove old ngrok URL
   - Add new: `https://xyz789new123.ngrok-free.app/api/auth/google/callback`
4. Save

### Step 4: Update .env (Easy Way!)

**Option A: Use the helper script** (Recommended)
```bash
npm run ngrok:update
# Enter your new ngrok URL when prompted
# Script automatically updates HOST_URL and shows checklist
```

**Option B: Manual update**
```bash
# Open .env and update just ONE line:
HOST_URL=https://xyz789new123.ngrok-free.app

# That's it! The redirect URIs automatically update via ${HOST_URL}
```

### Step 5: Restart API

```bash
# In terminal where API is running, press Ctrl+C
# Then restart:
npm run dev
```

---

## Upgrade to Hobbyist (Recommended)

**Tired of updating configs every restart?**

Upgrade to ngrok Hobbyist ($8/month) for:
- ✅ **Static custom domain** - Never changes!
- ✅ **No interstitial page** - Clean OAuth flow
- ✅ 5GB bandwidth, 100k requests
- ✅ Set up once, test forever

**How to upgrade:**
1. Go to https://dashboard.ngrok.com/billing/choose-a-plan
2. Select **Hobbyist** plan
3. Set custom domain (e.g., `myapp.ngrok.io`)
4. Update OAuth configs once with static domain
5. Never update again!

---

## Free Tier Limitations

### What Works:
- ✅ Full OAuth functionality
- ✅ 1GB bandwidth (plenty for testing)
- ✅ 20k HTTP/S requests
- ✅ Up to 3 endpoints

### Limitations:
- ⚠️ Interstitial warning page (extra click required)
- ⚠️ URL changes on every restart
- ⚠️ Must update OAuth configs repeatedly
- ⚠️ Not suitable for production

---

## Quick Reference

### ngrok Commands
```bash
# Start tunnel
ngrok http 3000

# Check ngrok status
curl http://localhost:4040/api/tunnels

# View web interface
# Open browser: http://localhost:4040
```

### Important URLs
- **Apple Developer**: https://developer.apple.com/account
- **Google Console**: https://console.cloud.google.com/apis/credentials
- **ngrok Dashboard**: https://dashboard.ngrok.com

### Environment Variables to Update
```bash
# Just update this ONE variable - everything else uses ${HOST_URL} interpolation!
HOST_URL=https://YOUR-NGROK-URL

# Apple credentials (set once, don't change)
APPLE_CLIENT_ID=com.yourcompany.yourapp.signin
APPLE_TEAM_ID=YOUR_TEAM_ID
APPLE_KEY_ID=YOUR_KEY_ID

# Super admin email (set once, don't change)
SUPER_ADMIN_EMAIL=youremail@gmail.com
```

---

## Need Help?

- ngrok docs: https://ngrok.com/docs
- Apple Sign In docs: https://developer.apple.com/sign-in-with-apple/
- Google OAuth docs: https://developers.google.com/identity/protocols/oauth2
