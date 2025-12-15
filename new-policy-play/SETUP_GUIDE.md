# PolicyPlay - One-Time Setup Guide 🚀

This guide will help you set up PolicyPlay on your local machine or server. Follow these steps carefully.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Setup (Docker)](#quick-setup-docker-recommended)
3. [Local Development Setup](#local-development-setup)
4. [Environment Configuration](#environment-configuration)
5. [Running the Application](#running-the-application)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

1. **Docker Desktop** (Recommended)
   - Download: https://www.docker.com/products/docker-desktop
   - Version: 20.10 or higher
   - Includes Docker Compose

2. **Git** (for cloning repository)
   - Download: https://git-scm.com/downloads

### Required Accounts & Keys

1. **MongoDB Atlas Account** (Free tier works)
   - Sign up: https://www.mongodb.com/cloud/atlas/register
   - Create a free cluster
   - Get connection string

2. **GROQ API Key** (Free tier available)
   - Sign up: https://console.groq.com/
   - Create API key from dashboard

---

## Quick Setup (Docker - Recommended)

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd new-policy-play
```

### Step 2: Create Environment File

Create a `.env` file in the root directory:

**On Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
# Or create manually: New-Item .env
```

**On Mac/Linux:**
```bash
cp .env.example .env
```

### Step 3: Configure Environment Variables

Open `.env` file and fill in your credentials:

```env
# MongoDB Connection String
# Format: mongodb+srv://username:password@cluster.mongodb.net/database
MONGO_URI=mongodb+srv://your-username:your-password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority

# GROQ API Key
# Get from: https://console.groq.com/
GROQ_API_KEY=gsk_your_groq_api_key_here

# CORS Origins (for local development)
CORS_ORIGINS=http://localhost:3000,http://localhost:8000

# Environment
ENVIRONMENT=development

# Frontend API URL (for local development)
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

**How to get MongoDB URI:**
1. Go to MongoDB Atlas dashboard
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Copy the connection string
5. Replace `<password>` with your actual password
6. Add database name if needed: `mongodb+srv://.../policyplay`

**How to get GROQ API Key:**
1. Go to https://console.groq.com/
2. Sign up/Login
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `gsk_`)

### Step 4: Start the Application

```bash
# Build and start all containers
docker compose -f Docker-compose.yml up -d --build

# View logs (optional)
docker compose -f Docker-compose.yml logs -f
```

**First build may take 5-10 minutes** as it downloads images and installs dependencies.

### Step 5: Verify Installation

1. **Check containers are running:**
   ```bash
   docker compose -f Docker-compose.yml ps
   ```
   You should see `policyplay-backend` and `policyplay-frontend` running.

2. **Test backend:**
   - Open: http://localhost:8000/health
   - Should return: `{"status":"healthy"}`

3. **Test frontend:**
   - Open: http://localhost:3000
   - Should see PolicyPlay homepage

**🎉 Setup Complete!** You can now use the application.

---

## Local Development Setup

If you prefer to run without Docker:

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run backend
python main.py
```

Backend will run on http://localhost:8000

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Frontend will run on http://localhost:3000

**Note:** Make sure MongoDB is accessible and `.env` file is configured.

---

## Environment Configuration

### For Local Development

```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database
GROQ_API_KEY=your_groq_api_key
CORS_ORIGINS=http://localhost:3000,http://localhost:8000
ENVIRONMENT=development
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### For Production/EC2 Deployment

```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database
GROQ_API_KEY=your_groq_api_key
CORS_ORIGINS=http://your-server-ip:3000,http://your-server-ip:8000
ENVIRONMENT=production
NEXT_PUBLIC_API_URL=http://your-server-ip:8000/api
```

**Important:** Replace `your-server-ip` with your actual server IP address or domain name.

---

## Running the Application

### Start Services

```bash
docker compose -f Docker-compose.yml up -d
```

### Stop Services

```bash
docker compose -f Docker-compose.yml down
```

### View Logs

```bash
# All services
docker compose -f Docker-compose.yml logs -f

# Specific service
docker compose -f Docker-compose.yml logs -f backend
docker compose -f Docker-compose.yml logs -f frontend
```

### Rebuild After Code Changes

```bash
docker compose -f Docker-compose.yml down
docker compose -f Docker-compose.yml up -d --build
```

### Check Service Status

```bash
docker compose -f Docker-compose.yml ps
```

---

## Verification

### 1. Backend Health Check

Open browser: http://localhost:8000/health

**Expected:** `{"status":"healthy"}`

### 2. Frontend Access

Open browser: http://localhost:3000

**Expected:** PolicyPlay homepage with login/signup options

### 3. API Documentation

Open browser: http://localhost:8000/docs

**Expected:** Swagger UI with all API endpoints

### 4. Test User Registration

1. Go to http://localhost:3000/signup
2. Create a test account
3. Login at http://localhost:3000/login

### 5. Test Admin Access

1. Go to http://localhost:3000/admin/login
2. Login with admin credentials
3. Access admin dashboard

**Note:** Admin account needs to be created first (see backend `create_admin.py` script)

---

## Troubleshooting

### Issue: Docker containers won't start

**Solution:**
```bash
# Check if ports are in use
# Windows:
netstat -ano | findstr :3000
netstat -ano | findstr :8000

# Mac/Linux:
lsof -i :3000
lsof -i :8000

# Stop conflicting services or change ports in Docker-compose.yml
```

### Issue: Backend can't connect to MongoDB

**Check:**
1. MongoDB URI is correct in `.env`
2. MongoDB Atlas IP whitelist includes your IP (or `0.0.0.0/0` for testing)
3. Username and password are correct
4. Network allows outbound connections

**Test MongoDB connection:**
```bash
# From backend container
docker compose -f Docker-compose.yml exec backend python -c "from app.utils.db import connect_to_mongo; import asyncio; asyncio.run(connect_to_mongo())"
```

### Issue: Frontend can't connect to backend

**Check:**
1. `NEXT_PUBLIC_API_URL` in `.env` matches backend URL
2. Backend is running: http://localhost:8000/health
3. CORS settings include frontend URL
4. Rebuild frontend after changing `.env`:
   ```bash
   docker compose -f Docker-compose.yml build frontend
   docker compose -f Docker-compose.yml up -d frontend
   ```

### Issue: GROQ API errors

**Check:**
1. GROQ API key is valid
2. API key has proper permissions
3. Check GROQ dashboard for usage limits
4. Verify key format: starts with `gsk_`

### Issue: Permission denied errors

**On Mac/Linux:**
```bash
# Make scripts executable
chmod +x deploy.sh setup-ec2.sh
```

**On Windows:**
- Use Git Bash or WSL for shell scripts
- Or run commands directly in PowerShell

### Issue: Docker build fails

**Solution:**
```bash
# Clean build (removes cache)
docker compose -f Docker-compose.yml build --no-cache

# Remove old images
docker compose -f Docker-compose.yml down --rmi all

# Rebuild
docker compose -f Docker-compose.yml up -d --build
```

### Issue: Out of memory errors

**Solution:**
- Increase Docker Desktop memory limit (Settings → Resources)
- Close other applications
- Restart Docker Desktop

---

## Common Commands Reference

```bash
# Start application
docker compose -f Docker-compose.yml up -d

# Stop application
docker compose -f Docker-compose.yml down

# View logs
docker compose -f Docker-compose.yml logs -f

# Rebuild and restart
docker compose -f Docker-compose.yml up -d --build

# Check status
docker compose -f Docker-compose.yml ps

# Access backend container shell
docker compose -f Docker-compose.yml exec backend bash

# Access frontend container shell
docker compose -f Docker-compose.yml exec frontend sh

# View backend logs only
docker compose -f Docker-compose.yml logs -f backend

# View frontend logs only
docker compose -f Docker-compose.yml logs -f frontend
```

---

## Next Steps

After successful setup:

1. **Create Admin Account:**
   ```bash
   docker compose -f Docker-compose.yml exec backend python create_admin.py
   ```

2. **Upload Test Policy:**
   - Login as admin
   - Go to Admin → Upload
   - Upload a PDF/DOCX policy document

3. **Test Games:**
   - Login as user
   - Browse policies
   - Play games and test features

4. **Explore API:**
   - Visit http://localhost:8000/docs
   - Test endpoints interactively

---



If you encounter issues:

1. Check logs: `docker compose -f Docker-compose.yml logs`
2. Verify `.env` configuration
3. Ensure all prerequisites are installed
4. Check MongoDB and GROQ API connectivity
5. Review error messages in browser console (F12)

---



