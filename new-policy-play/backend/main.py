from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.routes import policy_routes, auth_routes, game_routes, admin_routes, analysis_routes, escape_routes, policy_tap_routes
from app.utils.db import connect_to_mongo, close_mongo_connection


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup and shutdown"""
    # Startup
    await connect_to_mongo()
    yield
    # Shutdown
    await close_mongo_connection()


# Initialize FastAPI app with lifespan
app = FastAPI(
    title="PolicyPlay API",
    description="API for converting policy documents to structured JSON",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS - Allow all origins for EC2 deployment
# In production, you can restrict this to specific domains
import os
cors_origins = os.getenv("CORS_ORIGINS", "").split(",") if os.getenv("CORS_ORIGINS") else []
# Add default origins
default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://0.0.0.0:3000",
    "http://localhost:8000",
]
# Combine and filter empty strings
all_origins = [origin for origin in default_origins + cors_origins if origin]

# If CORS_ORIGINS is set, use only those; otherwise use defaults
# For EC2, you can set CORS_ORIGINS="http://your-ec2-ip,http://your-domain.com" in .env
app.add_middleware(
    CORSMiddleware,
    allow_origins=all_origins if all_origins else ["*"],  # Allow all if no specific origins set
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Include routers
app.include_router(auth_routes.router, prefix="/api/auth", tags=["auth"])
app.include_router(policy_routes.router, prefix="/api", tags=["policy"])
app.include_router(game_routes.router, prefix="/api", tags=["game"])
app.include_router(admin_routes.router, prefix="/api/admin", tags=["admin"])
app.include_router(analysis_routes.router, prefix="/api", tags=["analysis"])
app.include_router(escape_routes.router, prefix="/api/escape", tags=["escape-room"])
app.include_router(policy_tap_routes.router, prefix="/api", tags=["policy-tap"])

@app.get("/")
async def root():
    return {"message": "PolicyPlay API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/health")
async def health_check_post():
    """Test POST endpoint to verify backend connectivity"""
    return {"status": "healthy", "method": "POST", "message": "Backend is accepting POST requests"}

if __name__ == "__main__":
    import uvicorn
    # Disable reload in Docker/production
    reload = os.getenv("ENVIRONMENT", "development") == "development"
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=reload)

