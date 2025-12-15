from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime


class FallingBallQuestion(BaseModel):
    """Question for falling balls game"""
    question: str
    correct: str
    wrong_options: List[str] = Field(default_factory=list)


class FallingBallGameSet(BaseModel):
    """Generated game set with questions"""
    policy_id: str
    level: str = Field(..., pattern="^(beginner|intermediate|expert)$")
    questions: List[FallingBallQuestion] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class FallingBallAnswer(BaseModel):
    """User's answer for a question"""
    question_index: int
    selected_option: str
    is_correct: bool
    time_taken: float  # seconds
    was_missed: bool = False  # True if correct ball reached bottom


class FallingBallAttempt(BaseModel):
    """User's game attempt"""
    user_id: str
    policy_id: str
    level: str
    game_set_id: str
    score: int = 0
    correct_answers: int = 0
    wrong_answers: int = 0
    missed_answers: int = 0
    time_taken: int = 0  # total seconds
    answers: List[FallingBallAnswer] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None


class StartFallingBallRequest(BaseModel):
    """Request to start a falling ball game"""
    game_set_id: str


class SubmitFallingBallAnswer(BaseModel):
    """Submit answer for a question"""
    attempt_id: str
    question_index: int
    selected_option: str
    time_taken: float
    was_missed: bool = False


class FinishFallingBallRequest(BaseModel):
    """Finish game attempt"""
    attempt_id: str
    final_time_taken: int


class FallingBallLeaderboardEntry(BaseModel):
    """Leaderboard entry"""
    rank: int
    user_id: str
    username: str
    email: str
    score: int
    level: str
    correct_answers: int
    wrong_answers: int
    missed_answers: int
    time_taken: int
    completed_at: datetime

