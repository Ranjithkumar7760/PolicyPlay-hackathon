import os
import pdfplumber
import mammoth
from typing import Union
from fastapi import UploadFile


async def extract_text_from_pdf(file_path: str) -> str:
    """
    Extract text from PDF file using pdfplumber
    
    Args:
        file_path: Path to the PDF file
        
    Returns:
        Extracted text as string
        
    Raises:
        Exception: If PDF extraction fails
    """
    try:
        text_content = []
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_content.append(page_text)
        
        if not text_content:
            raise ValueError("No text could be extracted from the PDF file")
        
        return "\n\n".join(text_content)
    except Exception as e:
        raise Exception(f"Error extracting text from PDF: {str(e)}")


async def extract_text_from_docx(file_path: str) -> str:
    """
    Extract text from DOCX file using mammoth
    
    Args:
        file_path: Path to the DOCX file
        
    Returns:
        Extracted text as string
        
    Raises:
        Exception: If DOCX extraction fails
    """
    try:
        with open(file_path, "rb") as docx_file:
            result = mammoth.extract_raw_text(docx_file)
            text = result.value
            
            if not text or not text.strip():
                raise ValueError("No text could be extracted from the DOCX file")
            
            return text
    except Exception as e:
        raise Exception(f"Error extracting text from DOCX: {str(e)}")


def get_file_extension(filename: str) -> str:
    """
    Get file extension from filename
    
    Args:
        filename: Name of the file
        
    Returns:
        File extension in lowercase (without dot)
    """
    return os.path.splitext(filename)[1].lower().lstrip('.')


async def extract_text(file: Union[UploadFile, str]) -> str:
    """
    Auto-detect file type and extract text from PDF or DOCX file
    
    Args:
        file: Either a FastAPI UploadFile object or a file path string
        
    Returns:
        Extracted text as string
        
    Raises:
        ValueError: If file type is not supported (only PDF and DOCX are supported)
        Exception: If text extraction fails
    """
    # Handle UploadFile object (check for both FastAPI and Starlette UploadFile types)
    if isinstance(file, UploadFile) or hasattr(file, 'filename') and hasattr(file, 'read'):
        filename = file.filename
        if not filename:
            raise ValueError("Filename is required for file type detection")
        
        # Get file extension
        file_ext = get_file_extension(filename)
        
        # Save uploaded file temporarily
        # Get the app directory (parent of services)
        app_dir = os.path.dirname(os.path.dirname(__file__))
        uploads_dir = os.path.join(app_dir, "uploads")
        os.makedirs(uploads_dir, exist_ok=True)
        temp_path = os.path.join(uploads_dir, f"temp_{filename}")
        
        try:
            # Save file content
            with open(temp_path, "wb") as temp_file:
                content = await file.read()
                temp_file.write(content)
            
            # Reset file pointer for potential reuse
            await file.seek(0)
            
            # Extract text based on file type
            if file_ext == "pdf":
                text = await extract_text_from_pdf(temp_path)
            elif file_ext in ["docx", "doc"]:
                text = await extract_text_from_docx(temp_path)
            else:
                raise ValueError(f"Unsupported file type: {file_ext}. Only PDF and DOCX files are supported.")
            
            return text
        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.remove(temp_path)
    
    # Handle file path string
    elif isinstance(file, str):
        if not os.path.exists(file):
            raise FileNotFoundError(f"File not found: {file}")
        
        file_ext = get_file_extension(file)
        
        if file_ext == "pdf":
            return await extract_text_from_pdf(file)
        elif file_ext in ["docx", "doc"]:
            return await extract_text_from_docx(file)
        else:
            raise ValueError(f"Unsupported file type: {file_ext}. Only PDF and DOCX files are supported.")
    
    else:
        raise TypeError(f"Unsupported file type: {type(file)}. Expected UploadFile or str.")

