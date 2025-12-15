import os
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends
from app.services.parser_service import extract_text
from app.services.groq_service import structure_policy
from app.models.policy_model import PolicyResponse
from app.utils.db import get_collection, get_database
from app.utils.auth import get_current_admin, get_current_user

router = APIRouter()


def get_file_extension(filename: str) -> str:
    """Get file extension from filename"""
    return os.path.splitext(filename)[1].lower().lstrip('.')


def validate_file_type(filename: str) -> bool:
    """Validate that file is PDF or DOCX"""
    allowed_extensions = ['pdf', 'docx', 'doc']
    file_ext = get_file_extension(filename)
    return file_ext in allowed_extensions


@router.get("/policies")
async def get_policies(current_user: dict = Depends(get_current_user)):
    """Get all policies for authenticated users (to play games)"""
    db = await get_database()
    
    policies = await db.policies.find({}).sort("uploaded_at", -1).to_list(100)
    
    return [
        {
            "policyId": str(policy["_id"]),
            "title": policy.get("title", "Untitled"),
            "filename": policy.get("filename", "Unknown"),
            "rules_count": len(policy.get("rules", [])),
            "clauses_count": len(policy.get("clauses", []))
        }
        for policy in policies
    ]


@router.post("/policy/upload", response_model=PolicyResponse, status_code=status.HTTP_200_OK)
async def upload_policy(file: UploadFile = File(...), admin: dict = Depends(get_current_admin)):
    """
    Upload and process a policy document (PDF or DOCX)
    
    - **file**: Policy document file (PDF or DOCX format)
    
    Returns structured policy data extracted using Groq AI
    """
    try:
        print(f"Upload request received from admin: {admin.get('email', 'unknown')}")
        # Validate file type
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Filename is required"
            )
        
        if not validate_file_type(file.filename):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type. Only PDF and DOCX files are allowed. Received: {get_file_extension(file.filename)}"
            )
        
        # Get uploads directory path
        app_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        uploads_dir = os.path.join(app_dir, "uploads")
        os.makedirs(uploads_dir, exist_ok=True)
        
        # Generate unique filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_ext = get_file_extension(file.filename)
        saved_filename = f"{timestamp}_{file.filename}"
        file_path = os.path.join(uploads_dir, saved_filename)
        
        # Save uploaded file
        try:
            with open(file_path, "wb") as saved_file:
                content = await file.read()
                saved_file.write(content)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save file: {str(e)}"
            )
        
        # Reset file pointer for parser service
        await file.seek(0)
        
        # Extract text from document
        try:
            raw_text = await extract_text(file)
        except Exception as e:
            # Clean up saved file on error
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Failed to extract text from document: {str(e)}"
            )
        
        # Structure policy using Groq AI
        try:
            structured_data = await structure_policy(raw_text)
        except Exception as e:
            # Clean up saved file on error
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to structure policy document: {str(e)}"
            )
        
        # Prepare document for MongoDB
        db = await get_database()
        policy_document = {
            "filename": file.filename,
            "saved_filename": saved_filename,
            "file_path": file_path,
            "uploaded_at": datetime.utcnow(),
            "uploaded_by": str(admin["_id"]),
            "uploaded_by_name": admin.get("name", "Admin"),
            "title": structured_data.get("title"),
            "summary": structured_data.get("summary"),
            "rules": structured_data.get("rules", []),
            "roles": structured_data.get("roles", []),
            "clauses": structured_data.get("clauses", []),
            "definitions": structured_data.get("definitions", []),
            "exceptions": structured_data.get("exceptions", []),
            "risks": structured_data.get("risks", []),
            "policy_sections": structured_data.get("policy_sections", []),
            "raw_text": raw_text
        }
        
        # Save to MongoDB
        try:
            collection = await get_collection()
            result = await collection.insert_one(policy_document)
            policy_document["policyId"] = str(result.inserted_id)
        except Exception as e:
            # Log error but don't fail the request if MongoDB save fails
            print(f"Warning: Failed to save to MongoDB: {str(e)}")
        
        # Prepare response - ensure list fields are never None
        list_fields = ["rules", "roles", "clauses", "definitions", "exceptions", "risks", "policy_sections"]
        for field in list_fields:
            if structured_data.get(field) is None:
                structured_data[field] = []
        
        response = PolicyResponse(
            title=structured_data.get("title"),
            summary=structured_data.get("summary"),
            rules=structured_data.get("rules") or [],
            roles=structured_data.get("roles") or [],
            clauses=structured_data.get("clauses") or [],
            definitions=structured_data.get("definitions") or [],
            exceptions=structured_data.get("exceptions") or [],
            risks=structured_data.get("risks") or [],
            policy_sections=structured_data.get("policy_sections") or [],
            raw_text=raw_text
        )
        
        return response
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Clean up saved file on unexpected error
        if 'file_path' in locals() and os.path.exists(file_path):
            os.remove(file_path)
        import traceback
        print(f"Upload error: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error processing policy document: {str(e)}"
        )
