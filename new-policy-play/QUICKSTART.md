# PolicyPlay - Quick Start Guide ⚡

Get PolicyPlay running in 5 minutes!

## Prerequisites Checklist

- [ ] Docker Desktop installed
- [ ] MongoDB Atlas account (free)
- [ ] GROQ API key (free)

## 3-Step Setup

### Step 1: Clone & Configure

```bash
git clone <repository-url>
cd new-policy-play
```

Create `.env` file:
```bash
# Copy template (if exists)
cp .env.example .env

# Or create manually with these variables:
```

```env
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
GROQ_API_KEY=gsk_your_key_here
CORS_ORIGINS=http://localhost:3000,http://localhost:8000
ENVIRONMENT=development
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### Step 2: Get Credentials

**MongoDB URI:**
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free cluster
3. Click "Connect" → "Connect your application"
4. Copy connection string
5. Replace `<password>` with your password

**GROQ API Key:**
1. Go to https://console.groq.com/
2. Sign up/Login
3. Create API key
4. Copy key (starts with `gsk_`)

### Step 3: Start Application

```bash
docker compose -f Docker-compose.yml up -d --build
```

Wait 2-3 minutes for first build, then:

- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

## Verify It Works

1. Open http://localhost:8000/health → Should show `{"status":"healthy"}`
2. Open http://localhost:3000 → Should show PolicyPlay homepage

## Common Commands

```bash
# Start
docker compose -f Docker-compose.yml up -d

# Stop
docker compose -f Docker-compose.yml down

# View logs
docker compose -f Docker-compose.yml logs -f

# Rebuild
docker compose -f Docker-compose.yml up -d --build
```

## Troubleshooting

**Ports already in use?**
- Stop other services on ports 3000/8000
- Or change ports in `Docker-compose.yml`

**Backend won't start?**
- Check MongoDB URI in `.env`
- Verify GROQ API key
- Check logs: `docker compose logs backend`

**Frontend can't connect?**
- Verify `NEXT_PUBLIC_API_URL` in `.env`
- Rebuild: `docker compose build frontend`

## Need More Help?

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed instructions.

---

**That's it! You're ready to go! 🚀**

