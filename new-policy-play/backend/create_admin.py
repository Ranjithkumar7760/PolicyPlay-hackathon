"""
Script to create an admin user
Run: python create_admin.py
"""
import asyncio
from app.utils.db import connect_to_mongo, get_database
from app.utils.auth import get_password_hash

async def create_admin():
    await connect_to_mongo()
    db = await get_database()
    
    email = input("Enter admin email: ")
    name = input("Enter admin name: ")
    password = input("Enter admin password: ")
    
    # Check if admin already exists
    existing = await db.users.find_one({"email": email})
    if existing:
        print(f"User with email {email} already exists!")
        if existing.get("role") == "admin":
            print("This user is already an admin.")
        else:
            update = input("Update to admin? (y/n): ")
            if update.lower() == 'y':
                await db.users.update_one(
                    {"email": email},
                    {"$set": {"role": "admin"}}
                )
                print("User updated to admin!")
        return
    
    # Create new admin
    admin_doc = {
        "email": email,
        "name": name,
        "hashed_password": get_password_hash(password),
        "role": "admin",
        "created_at": __import__('datetime').datetime.utcnow()
    }
    
    result = await db.users.insert_one(admin_doc)
    print(f"Admin created successfully! ID: {result.inserted_id}")

if __name__ == "__main__":
    asyncio.run(create_admin())

