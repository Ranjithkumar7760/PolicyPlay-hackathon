import os
import json
from groq import Groq
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Groq API configuration
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY environment variable is required. Please set it in your .env file or environment.")
MODEL_NAME = "llama-3.3-70b-versatile"  # Current supported model (replaces decommissioned llama3-70b-8192)

# Initialize Groq client
client = Groq(api_key=GROQ_API_KEY)


async def structure_policy(text: str) -> dict:
    """
    Use Groq AI to structure policy document text into JSON format
    
    Args:
        text: Raw text extracted from policy document (PDF/DOCX)
        
    Returns:
        Dictionary containing structured policy data with fields:
        - title: Policy title
        - summary: Policy summary
        - rules: List of rules
        - roles: List of roles
        - clauses: List of clauses
        - definitions: List of definitions
        - exceptions: List of exceptions
        - risks: List of risks
        - policy_sections: List of policy sections
        
    Raises:
        Exception: If Groq API call fails or response cannot be parsed
    """
    if not text or not text.strip():
        raise ValueError("Text input is empty or invalid")
    
    # Create prompt for Groq
    prompt = f"""Analyze the following policy document and extract structured information. 
Return a valid JSON object with the following structure:
{{
    "title": "Policy title or name",
    "summary": "Brief summary of the policy",
    "rules": ["rule 1", "rule 2", ...],
    "roles": ["role 1", "role 2", ...],
    "clauses": ["clause 1", "clause 2", ...],
    "definitions": ["definition 1", "definition 2", ...],
    "exceptions": ["exception 1", "exception 2", ...],
    "risks": ["risk 1", "risk 2", ...],
    "policy_sections": ["section 1", "section 2", ...]
}}

If a field is not found in the document, use an empty array [] or null for strings.
Return ONLY valid JSON, no additional text or explanation.

Policy Document Text:
{text}
"""
    
    try:
        # Call Groq API
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert at analyzing policy documents and extracting structured information. Always return valid JSON."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model=MODEL_NAME,
            temperature=0.3,
            max_tokens=4096,
            response_format={"type": "json_object"}
        )
        
        # Extract response content
        response_text = chat_completion.choices[0].message.content
        
        if not response_text:
            raise Exception("Empty response from Groq API")
        
        # Parse JSON response
        try:
            structured_data = json.loads(response_text)
        except json.JSONDecodeError as e:
            # Try to extract JSON from response if it's wrapped in markdown or other text
            import re
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                structured_data = json.loads(json_match.group())
            else:
                raise Exception(f"Failed to parse JSON from Groq response: {str(e)}")
        
        # Ensure all expected fields exist with default values
        default_structure = {
            "title": None,
            "summary": None,
            "rules": [],
            "roles": [],
            "clauses": [],
            "definitions": [],
            "exceptions": [],
            "risks": [],
            "policy_sections": []
        }
        
        # List fields that should never be None
        list_fields = ["rules", "roles", "clauses", "definitions", "exceptions", "risks", "policy_sections"]
        
        # Merge with defaults and ensure list fields are never None
        for key, default_value in default_structure.items():
            if key not in structured_data:
                structured_data[key] = default_value
            elif key in list_fields and structured_data[key] is None:
                # Replace None with empty list for list fields
                structured_data[key] = []
            elif key in list_fields and not isinstance(structured_data[key], list):
                # Ensure list fields are actually lists
                structured_data[key] = []
        
        return structured_data
        
    except Exception as e:
        raise Exception(f"Error structuring policy with Groq API: {str(e)}")

