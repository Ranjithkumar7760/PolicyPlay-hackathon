# PolicyPlay 🎮

**AI-Powered Policy Document Analyzer & Interactive Learning Platform**

PolicyPlay is an innovative web application that transforms policy documents into engaging, interactive learning experiences. Upload policy documents, get AI-powered analysis, and master policies through gamified quizzes and escape room challenges.



---

## 🚀 Features

### 📚 **Document Processing**
- Upload PDF and DOCX policy documents
- AI-powered extraction of structured data (rules, clauses, definitions, etc.)
- Automatic policy analysis and insights

### 🎮 **Interactive Learning Games**
- **Scenario Games**: Test your understanding with real-world policy scenarios
- **Violation Detection**: Spot policy violations in given situations
- **Escape Room Challenges**: Multi-level policy learning adventures
- **Policy Tap**: Fast-paced falling ball quiz games

### 📊 **Analytics & Progress Tracking**
- Personal score tracking and statistics
- Global leaderboard rankings
- Performance analytics
- Learning progress visualization

### 👨‍💼 **Admin Dashboard**
- Policy management
- User analytics
- Document upload and processing
- Performance insights

---

## 🏗️ Architecture

### **Tech Stack**

**Backend:**
- Python 3.11
- FastAPI (REST API)
- MongoDB (Database)
- GROQ AI (LLM for document analysis)
- Motor (Async MongoDB driver)

**Frontend:**
- Next.js 14 (React framework)
- Tailwind CSS (Styling)
- Framer Motion (Animations)
- Axios (HTTP client)

**Infrastructure:**
- Docker & Docker Compose
- Containerized deployment ready

---

## 📋 Prerequisites

Before you begin, ensure you have:

- **Docker** (version 20.10+) and **Docker Compose** (version 2.0+)
- **MongoDB Atlas account** (free tier works) OR local MongoDB instance
- **GROQ API key** ([Get one here](https://console.groq.com/))

---

## 🚀 Quick Start

### Option 1: Docker (Recommended - Easiest)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd new-policy-play
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials (see SETUP_GUIDE.md)
   ```

3. **Start the application**
   ```bash
   docker compose -f Docker-compose.yml up -d --build
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Option 2: Local Development

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed local setup instructions.

---

## 📁 Project Structure

```
new-policy-play/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── models/         # Data models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   └── utils/          # Utilities
│   ├── Dockerfile
│   ├── main.py             # FastAPI app entry
│   └── requirements.txt
│
├── frontend/                # Next.js frontend
│   ├── app/                # Next.js app directory
│   │   ├── admin/          # Admin pages
│   │   ├── games/          # Game pages
│   │   ├── escape-room/    # Escape room pages
│   │   └── policy-tap/     # Policy tap game
│   ├── components/         # React components
│   ├── Dockerfile
│   └── package.json
│
├── Docker-compose.yml       # Docker Compose configuration
├── README.md               # This file
└── SETUP_GUIDE.md          # Detailed setup guide
```

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# MongoDB Connection
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# GROQ API Key
GROQ_API_KEY=your_groq_api_key_here

# CORS Origins (comma-separated)
CORS_ORIGINS=http://localhost:3000,http://localhost:8000

# Environment
ENVIRONMENT=development

# Frontend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

**For production/EC2 deployment**, update:
- `NEXT_PUBLIC_API_URL` to your server IP/domain
- `CORS_ORIGINS` to include your server URLs

---

## 🎯 Usage

### For Users

1. **Sign Up**: Create an account at `/signup`
2. **Browse Policies**: View available policies
3. **Play Games**: 
   - Select a policy
   - Choose game type (Scenario, Violation Detection, Escape Room, Policy Tap)
   - Answer questions and earn scores
4. **Track Progress**: View your scores and leaderboard position

### For Admins

1. **Login**: Access admin panel at `/admin/login`
2. **Upload Policies**: Upload PDF/DOCX documents
3. **View Analytics**: Monitor user engagement and performance
4. **Manage Policies**: View, analyze, and delete policies

---

## 🐳 Docker Commands

```bash
# Start all services
docker compose -f Docker-compose.yml up -d

# View logs
docker compose -f Docker-compose.yml logs -f

# Stop all services
docker compose -f Docker-compose.yml down

# Rebuild after code changes
docker compose -f Docker-compose.yml up -d --build

# Check service status
docker compose -f Docker-compose.yml ps
```

---

## 🧪 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/admin/login` - Admin login

### Policies
- `GET /api/policies` - List all policies
- `GET /api/policies/{id}` - Get policy details
- `POST /api/policy/upload` - Upload policy document (Admin)

### Games
- `POST /api/game/start/{policy_id}` - Start a game session
- `POST /api/game/submit` - Submit game answer
- `GET /api/game/session/{session_id}` - Get game session

### Leaderboard
- `GET /api/leaderboard` - Get global leaderboard
- `GET /api/user/scores` - Get user scores

### Admin
- `GET /api/admin/analytics/summary` - Analytics summary
- `GET /api/admin/policies` - List all policies
- `DELETE /api/admin/policies/{id}` - Delete policy

**Full API Documentation**: http://localhost:8000/docs (when running)

---

## 🛠️ Development

### Backend Development

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

---

## 📦 Deployment

### EC2 Deployment

1. Launch Ubuntu EC2 instance
2. Install Docker and Docker Compose
3. Transfer project files
4. Configure `.env` with production values
5. Run `docker compose -f Docker-compose.yml up -d --build`

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed deployment instructions.

---

## 🐛 Troubleshooting

### Common Issues

**Backend won't start:**
- Check MongoDB connection string in `.env`
- Verify GROQ API key is valid
- Check Docker logs: `docker compose logs backend`

**Frontend can't connect to backend:**
- Verify `NEXT_PUBLIC_API_URL` in `.env`
- Check CORS settings
- Ensure backend is running on port 8000

**MongoDB connection errors:**
- Verify MongoDB Atlas IP whitelist includes your IP
- Check connection string format
- Ensure database credentials are correct

**Docker issues:**
- Ensure Docker Desktop is running
- Check ports 3000 and 8000 are not in use
- Try rebuilding: `docker compose build --no-cache`

---



- [Ranjith kumar]

---

## Acknowledgments

- GROQ for AI/LLM capabilities
- MongoDB Atlas for database hosting
- FastAPI and Next.js communities




**Made with ❤️ for Hackathon**

