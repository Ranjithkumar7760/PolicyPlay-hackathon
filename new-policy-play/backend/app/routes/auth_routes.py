from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPAuthorizationCredentials
from app.models.user_model import UserCreate, UserLogin, AdminLogin, UserResponse, TokenResponse
from app.utils.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    get_current_admin,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    security
)
from app.utils.db import get_database
from bson import ObjectId

router = APIRouter()


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserCreate):
    """User signup endpoint"""
    try:
        db = await get_database()
        
        # Check if user already exists
        existing_user = await db.users.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create new user
        user_doc = {
            "email": user_data.email,
            "name": user_data.name,
            "hashed_password": get_password_hash(user_data.password),
            "role": "user",
            "created_at": datetime.utcnow()
        }
        
        result = await db.users.insert_one(user_doc)
        user_id = str(result.inserted_id)
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user_id, "role": "user"},
            expires_delta=access_token_expires
        )
        
        return TokenResponse(
            access_token=access_token,
            user=UserResponse(
                id=user_id,
                email=user_data.email,
                name=user_data.name,
                role="user",
                created_at=user_doc.get("created_at")
            )
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Signup error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Signup failed: {str(e)}"
        )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """User login endpoint"""
    db = await get_database()
    
    # Find user
    user = await db.users.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Verify password
    if not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user["_id"]), "role": user.get("role", "user")},
        expires_delta=access_token_expires
    )
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=str(user["_id"]),
            email=user["email"],
            name=user["name"],
            role=user.get("role", "user"),
            created_at=user.get("created_at")
        )
    )


@router.post("/admin-login", response_model=TokenResponse)
async def admin_login(credentials: AdminLogin):
    """Admin login endpoint"""
    try:
        db = await get_database()
        
        # Find admin user
        user = await db.users.find_one({
            "email": credentials.email,
            "role": "admin"
        })
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        # Verify password
        if not verify_password(credentials.password, user["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user["_id"]), "role": "admin"},
            expires_delta=access_token_expires
        )
        
        return TokenResponse(
            access_token=access_token,
            user=UserResponse(
                id=str(user["_id"]),
                email=user["email"],
                name=user["name"],
                role="admin",
                created_at=user.get("created_at")
            )
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Admin login error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Admin login failed: {str(e)}"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    return UserResponse(
        id=str(current_user["_id"]),
        email=current_user["email"],
        name=current_user["name"],
        role=current_user.get("role", "user"),
        created_at=current_user.get("created_at")
    )

