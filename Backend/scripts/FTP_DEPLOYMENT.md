# FTP Deployment Scripts

Scripts for managing deployment to ftp.crosscoin.in using explicit FTPS on port 21.

## Files

### `ftp-test.js`
Tests FTP connection and basic operations.

**Usage:**
```bash
node scripts/ftp-test.js
```

**What it tests:**
- ✅ Connection to ftp.crosscoin.in
- ✅ Authentication
- ✅ Directory listing
- ✅ Can create/write files
- ✅ Can write to /Backend/tmp/restart.txt

**Output:**
```
🔗 Testing FTP connection to ftp.crosscoin.in...

📋 Connection Details:
   Host: ftp.crosscoin.in
   Port: 21
   User: crosscoin
   Secure: EXPLICIT

🔐 Connecting...
✅ Connected successfully

📂 Current directory: /
📋 Listing /Backend/ directory:
   Found 15 items:
   📁 config
   📁 controller
   📁 model
   📁 services
   📄 package.json
   ...

✅ All FTP tests passed!
```

---

### `ftp-restart.js`
Triggers a graceful restart of the Node.js app on the production server.

**Usage:**
```bash
node scripts/ftp-restart.js
```

**How it works:**
1. Connects to FTP server
2. Creates `/Backend/tmp/` directory if needed
3. Writes `/Backend/tmp/restart.txt` with timestamp
4. cPanel's Phusion Passenger detects the file change
5. Next HTTP request triggers graceful worker recycle
6. No downtime; auto-scales with traffic

**Output:**
```
🚀 Triggering Passenger restart...

📡 Connecting to ftp.crosscoin.in:21...
✅ Connected

📁 Ensuring /Backend/tmp/ exists...
✅ Directory ready

📝 Writing /Backend/tmp/restart.txt...
✅ File written

🎯 Passenger restart triggered!
   Next HTTP request will recycle the Node.js process
   Restart time: 2026-05-26T15:30:45.123Z
```

---

## Environment Variables

Create a `.env` file in the `Backend/` directory:

```env
FTP_SERVER=ftp.crosscoin.in
FTP_PORT=21
FTP_USER=crosscoin
FTP_PASSWORD=Rishi@1995
FTP_SECURE=explicit
FTP_BASE_DIR=/Backend/
```

Or set them in your shell:
```bash
export FTP_SERVER=ftp.crosscoin.in
export FTP_USER=crosscoin
export FTP_PASSWORD=Rishi@1995
export FTP_SECURE=explicit
```

## GitHub Actions Integration

The workflow file `.github/workflows/backend-deploy-ftp.yml` automatically:
1. Deploys Backend/ code to FTP on every push to main
2. Runs syntax checks before upload
3. Excludes `.env`, `node_modules`, `.git`, etc.
4. Uploads only changed files (diff-based)

**GitHub Secrets required:**
- `FTP_SERVER` = ftp.crosscoin.in
- `FTP_USERNAME` = crosscoin
- `FTP_PASSWORD` = Rishi@1995
- `FTP_SERVER_DIR` = /Backend/

## Testing

### Quick test
```bash
node scripts/ftp-test.js
```

### With npm test
```bash
npm test -- ftp-deployment.test.js
```

### Manual restart
```bash
node scripts/ftp-restart.js
```

## Troubleshooting

### "FTP_PASSWORD not set"
```bash
# Add to .env or set environment variable
export FTP_PASSWORD=Rishi@1995
```

### "Connection refused" on port 21
- Check if firewall allows outbound port 21
- Verify FTP server is running: `telnet ftp.crosscoin.in 21`
- Confirm FTPS is enabled on the server

### "Authentication failed"
- Verify username: `crosscoin`
- Verify password is correct
- Check for extra spaces in .env

### "tmp/restart.txt permission denied"
- Check `/Backend/tmp/` directory permissions
- Ensure FTP user can write to `/Backend/tmp/`
- May need cPanel to create or chmod the directory

## Deployment Workflow

```
1. Make changes → commit → git push origin main
         ↓
2. GitHub Actions triggered (Backend/ changed)
         ↓
3. Syntax check all .js files
         ↓
4. Connect to ftp.crosscoin.in via FTPS
         ↓
5. Upload only changed files to /Backend/
         ↓
6. Touch /Backend/tmp/restart.txt
         ↓
7. Phusion Passenger detects change
         ↓
8. Next HTTP request recycles Node.js process
         ↓
9. New code is live ✅
```

## Performance Notes

- **Diff-based uploads**: Only changed files are sent (GitHub Actions tracks state)
- **Graceful restart**: No downtime; new requests use new code
- **Auto-scaling**: Passenger scales workers up/down with traffic
- **Typical deployment time**: 30-60 seconds from push to live
