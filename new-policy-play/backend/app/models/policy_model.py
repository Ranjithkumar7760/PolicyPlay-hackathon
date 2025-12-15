from pydantic import BaseModel, Field
from typing import List, Optional


class PolicyResponse(BaseModel):
    """
    Pydantic model for structured policy document response
    """
    title: Optional[str] = Field(None, description="Policy title or name")
    summary: Optional[str] = Field(None, description="Brief summary of the policy")
    rules: List[str] = Field(default_factory=list, description="List of policy rules")
    roles: List[str] = Field(default_factory=list, description="List of roles mentioned in the policy")
    clauses: List[str] = Field(default_factory=list, description="List of policy clauses")
    definitions: List[str] = Field(default_factory=list, description="List of definitions")
    exceptions: List[str] = Field(default_factory=list, description="List of exceptions")
    risks: List[str] = Field(default_factory=list, description="List of identified risks")
    policy_sections: List[str] = Field(default_factory=list, description="List of policy sections")
    raw_text: str = Field(..., description="Raw text extracted from the policy document")
    
    class Config:
        json_schema_extra = {
            "example": {
                "title": "Data Privacy Policy",
                "summary": "This policy outlines how we handle user data",
                "rules": [
                    "All user data must be encrypted",
                    "Data retention period is 2 years"
                ],
                "roles": [
                    "Data Protection Officer",
                    "System Administrator"
                ],
                "clauses": [
                    "Section 3.1: Data Collection",
                    "Section 3.2: Data Storage"
                ],
                "definitions": [
                    "Personal Data: Any information relating to an identified person",
                    "Processing: Any operation performed on personal data"
                ],
                "exceptions": [
                    "Legal requirements may override data deletion requests"
                ],
                "risks": [
                    "Unauthorized access to user data",
                    "Data breach"
                ],
                "policy_sections": [
                    "Introduction",
                    "Data Collection",
                    "Data Storage",
                    "Data Retention"
                ],
                "raw_text": "Full extracted text from the policy document..."
            }
        }

