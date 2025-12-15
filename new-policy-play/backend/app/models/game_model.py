from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime


class GameScenario(BaseModel):
    scenario_text: str
    options: List[str]
    correct_answer: int
    explanation: str
    policy_rule_used: str


class SpotViolationScenario(BaseModel):
    scenario_text: str
    violation_text: str
    violation_start: int
    violation_end: int
    explanation: str
    policy_rule_violated: str


class GameSessionCreate(BaseModel):
    policy_id: str
    game_type: str = Field(..., pattern="^(scenario|violation)$")


class GameSessionResponse(BaseModel):
    session_id: str
    policy_id: str
    game_type: str
    scenario: Optional[GameScenario] = None
    violation_scenario: Optional[SpotViolationScenario] = None
    created_at: datetime


class GameAnswer(BaseModel):
    session_id: str
    answer: Optional[int] = None  # For scenario game
    violation_range: Optional[Dict[str, int]] = None  # For violation game


class GameResult(BaseModel):
    session_id: str
    correct: bool
    score: int
    explanation: str
    policy_rule: str
    correct_answer: Optional[str] = None  # The correct answer text/option

