from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Union
from datetime import datetime


class DefinitionPuzzle(BaseModel):
    """Room 1: Definition matching puzzle"""
    term: str
    definition: str
    wrong_options: List[str] = Field(default_factory=list)


class ExceptionPuzzle(BaseModel):
    """Room 2: Exception identification puzzle"""
    rule: str
    correct_exception: str
    wrong_exceptions: List[str] = Field(default_factory=list)
    scenario: str


class RuleVaultPuzzle(BaseModel):
    """Room 3: Rule selection puzzle"""
    scenario: str
    correct_rule: str
    wrong_rules: List[str] = Field(default_factory=list)


class ViolationRepairPuzzle(BaseModel):
    """Room 4: Violation fix puzzle"""
    violation: str
    fix: str
    explanation: str
    scenario: str


class MasterPuzzle(BaseModel):
    """Room 5: Multi-part master puzzle"""
    scenario: str
    definition_question: Dict[str, str]  # {term: "", definition: "", wrong_options: []}
    rule_question: Dict[str, str]  # {scenario: "", correct_rule: "", wrong_rules: []}
    exception_question: Dict[str, str]  # {rule: "", correct_exception: "", wrong_exceptions: []}
    violation_question: Dict[str, str]  # {violation: "", fix: "", explanation: ""}


class EscapeRooms(BaseModel):
    """Complete escape room set"""
    policy_id: str
    level: str = Field(..., pattern="^(beginner|intermediate|expert)$")
    rooms: Dict[str, Union[List, Dict]] = Field(default_factory=dict)  # room5 is dict, others are lists
    created_at: datetime = Field(default_factory=datetime.utcnow)


class RoomStatus(BaseModel):
    """Status of each room"""
    room1: str = "pending"  # pending, done, failed
    room2: str = "pending"
    room3: str = "pending"
    room4: str = "pending"
    room5: str = "pending"


class EscapeAttempt(BaseModel):
    """User's escape room attempt"""
    user_id: str
    policy_id: str
    level: str
    score: int = 0
    time_taken: int = 0  # in seconds
    room_status: RoomStatus = Field(default_factory=RoomStatus)
    rooms_completed: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None


class RoomAnswer(BaseModel):
    """Answer submission for a room"""
    attempt_id: Optional[str] = None  # Optional since it's in the URL path
    room_number: int = Field(..., ge=1, le=5)
    answer: Dict  # Room-specific answer format


class EscapeRoomResponse(BaseModel):
    """Response for escape room generation"""
    escape_room_id: str
    policy_id: str
    level: str
    rooms: Dict[str, Union[List, Dict]]  # room1-4 are lists, room5 is dict
    created_at: datetime


class EscapeAttemptResponse(BaseModel):
    """Response for escape attempt"""
    attempt_id: str
    user_id: str
    policy_id: str
    level: str
    score: int
    time_taken: int
    room_status: RoomStatus
    rooms_completed: List[str]
    is_completed: bool = False


class StartEscapeRequest(BaseModel):
    """Request to start escape room"""
    escape_room_id: str

