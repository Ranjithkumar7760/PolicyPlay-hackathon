from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import List, Dict
from app.utils.db import get_database
from app.utils.auth import get_current_admin
from groq import Groq
from dotenv import load_dotenv
import json
import os

load_dotenv()
router = APIRouter()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY environment variable is required. Please set it in your .env file or environment.")
groq_client = Groq(api_key=GROQ_API_KEY)
MODEL_NAME = "llama-3.3-70b-versatile"


class PolicyAnalysisRequest(BaseModel):
    draft_text: str
    draft_title: str = "Draft Policy"


class AnalysisResult(BaseModel):
    contradictions: List[str]
    missing_sections: List[str]
    overlapping_content: List[Dict[str, str]]
    ambiguous_phrases: List[str]
    recommendations: List[str]


@router.post("/policy/analyze", response_model=AnalysisResult)
async def analyze_policy_draft(
    request: PolicyAnalysisRequest,
    admin: dict = Depends(get_current_admin)
):
    """Analyze a draft policy for issues"""
    db = await get_database()
    
    # Get existing policies for comparison
    existing_policies = await db.policies.find({}).to_list(50)
    existing_titles = [p.get("title", "") for p in existing_policies]
    existing_rules = []
    for policy in existing_policies:
        existing_rules.extend(policy.get("rules", []))
    
    # Create analysis prompt
    prompt = f"""Analyze this draft policy document and identify issues.

Draft Policy Title: {request.draft_title}

Draft Policy Text:
{request.draft_text}

Existing Policy Titles (for overlap detection):
{', '.join(existing_titles[:10])}

Analyze and return JSON with:
1. contradictions: List of contradictory statements found
2. missing_sections: List of common policy sections that might be missing
3. overlapping_content: List of objects with "existing_policy" and "overlap_description" for content that overlaps with existing policies
4. ambiguous_phrases: List of unclear or ambiguous phrases
5. recommendations: List of recommendations for improvement

Return ONLY valid JSON in this format:
{{
    "contradictions": ["contradiction 1", "contradiction 2"],
    "missing_sections": ["section 1", "section 2"],
    "overlapping_content": [{{"existing_policy": "Policy Name", "overlap_description": "description"}}],
    "ambiguous_phrases": ["phrase 1", "phrase 2"],
    "recommendations": ["recommendation 1", "recommendation 2"]
}}"""

    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert policy analyst. Analyze policy documents for contradictions, missing sections, overlaps, and ambiguities. Always return valid JSON."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model=MODEL_NAME,
            temperature=0.3,
            max_tokens=2048,
            response_format={"type": "json_object"}
        )
        
        response_text = chat_completion.choices[0].message.content
        
        # Parse JSON response
        try:
            analysis_data = json.loads(response_text)
        except json.JSONDecodeError as e:
            import re
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                analysis_data = json.loads(json_match.group())
            else:
                raise Exception(f"Failed to parse JSON: {str(e)}")
        
        # Ensure all fields exist
        result = AnalysisResult(
            contradictions=analysis_data.get("contradictions", []),
            missing_sections=analysis_data.get("missing_sections", []),
            overlapping_content=analysis_data.get("overlapping_content", []),
            ambiguous_phrases=analysis_data.get("ambiguous_phrases", []),
            recommendations=analysis_data.get("recommendations", [])
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze policy: {str(e)}"
        )

