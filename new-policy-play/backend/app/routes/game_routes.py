from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.models.game_model import (
    GameSessionCreate,
    GameSessionResponse,
    GameAnswer,
    GameResult,
    GameScenario,
    SpotViolationScenario
)
from app.utils.db import get_database
from app.utils.auth import get_current_user
from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY environment variable is required. Please set it in your .env file or environment.")
groq_client = Groq(api_key=GROQ_API_KEY)
MODEL_NAME = "llama-3.3-70b-versatile"
from bson import ObjectId
import json

router = APIRouter()


async def generate_scenario_game(policy_data: dict, rule_index: int = 0) -> GameScenario:
    """Generate scenario simulation game using Groq AI"""
    rules = policy_data.get("rules", [])
    if not rules:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Policy has no rules to generate game from"
        )
    
    # Use rule_index modulo to cycle through rules if needed
    rule_to_use = rules[rule_index % len(rules)]
    
    # Get policy context for better understanding
    policy_title = policy_data.get("title", "Policy")
    policy_summary = policy_data.get("summary", "")
    all_rules = policy_data.get("rules", [])
    clauses = policy_data.get("clauses", [])
    definitions = policy_data.get("definitions", [])
    
    # Build context string
    context_parts = []
    if policy_summary:
        context_parts.append(f"Policy Summary: {policy_summary}")
    if len(all_rules) > 1:
        context_parts.append(f"Other related rules: {', '.join(all_rules[:3])}")
    if clauses:
        context_parts.append(f"Related clauses: {', '.join(clauses[:2])}")
    
    context = "\n".join(context_parts) if context_parts else ""
    
    prompt = f"""You are creating an educational compliance game scenario. Your task is to create a realistic workplace scenario where ONE action correctly follows the policy rule, and THREE actions violate or ignore the rule.

POLICY CONTEXT:
Policy Title: {policy_title}
{context}

FOCUS RULE (this rule must be strictly followed):
"{rule_to_use}"

CRITICAL REQUIREMENTS:
1. The scenario must be realistic and workplace-appropriate
2. ONE option must be the CORRECT action that strictly follows the policy rule above
3. THREE options must be INCORRECT actions that violate, ignore, or contradict the policy rule
4. The correct answer MUST align exactly with what the policy rule requires
5. The explanation must clearly reference the specific policy rule and why the correct answer follows it

Generate:
1. A realistic workplace scenario (2-3 sentences) that sets up a situation where the policy rule applies
2. Four possible actions/choices:
   - ONE correct action that follows the policy rule exactly
   - THREE incorrect actions that violate or ignore the policy rule
3. The correct answer index (0-3) - must be the option that follows the rule
4. A clear explanation that references the policy rule and explains why the correct answer is right
5. The exact policy rule text used

Return JSON format:
{{
    "scenario_text": "realistic workplace scenario description",
    "options": ["correct action that follows rule", "incorrect action 1", "incorrect action 2", "incorrect action 3"],
    "correct_answer": 0,
    "explanation": "detailed explanation referencing the policy rule and why the correct answer follows it",
    "policy_rule_used": "{rule_to_use}"
}}

IMPORTANT: Ensure the correct answer strictly adheres to the policy rule. The correct option must be the action that complies with "{rule_to_use}"."""

    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": """You are an expert compliance training game creator. Your job is to create realistic workplace scenarios that test understanding of policy rules.

CRITICAL: The correct answer MUST strictly follow the policy rule provided. Incorrect answers must clearly violate or ignore the rule. Always ensure the correct answer aligns perfectly with what the policy rule requires.

Always return valid JSON only."""
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model=MODEL_NAME,
            temperature=0.5,  # Lower temperature for more consistent, rule-following answers
            max_tokens=1500,  # Increased for better explanations
            response_format={"type": "json_object"}
        )
        
        response_text = chat_completion.choices[0].message.content
        scenario_data = json.loads(response_text)
        
        # Validate that correct_answer index is valid
        if "correct_answer" not in scenario_data or scenario_data["correct_answer"] not in [0, 1, 2, 3]:
            raise ValueError("Invalid correct_answer index. Must be 0, 1, 2, or 3")
        
        if "options" not in scenario_data or len(scenario_data["options"]) != 4:
            raise ValueError("Must provide exactly 4 options")
        
        # Validate that policy_rule_used matches the rule we provided
        if scenario_data.get("policy_rule_used") != rule_to_use:
            scenario_data["policy_rule_used"] = rule_to_use  # Ensure it matches
        
        # Additional validation: verify explanation references the rule
        explanation = scenario_data.get("explanation", "").lower()
        if not explanation or len(explanation) < 20:
            raise ValueError("Explanation must be detailed and reference the policy rule")
        
        return GameScenario(**scenario_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate scenario: {str(e)}"
        )


async def generate_violation_game(policy_data: dict, rule_index: int = 0) -> SpotViolationScenario:
    """Generate spot-the-violation game using Groq AI"""
    rules = policy_data.get("rules", [])
    if not rules:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Policy has no rules to generate game from"
        )
    
    # Use rule_index modulo to cycle through rules if needed
    rule_to_use = rules[rule_index % len(rules)]
    
    # Get policy context for better understanding
    policy_title = policy_data.get("title", "Policy")
    policy_summary = policy_data.get("summary", "")
    all_rules = policy_data.get("rules", [])
    clauses = policy_data.get("clauses", [])
    
    # Build context string
    context_parts = []
    if policy_summary:
        context_parts.append(f"Policy Summary: {policy_summary}")
    if len(all_rules) > 1:
        context_parts.append(f"Other related rules: {', '.join(all_rules[:3])}")
    if clauses:
        context_parts.append(f"Related clauses: {', '.join(clauses[:2])}")
    
    context = "\n".join(context_parts) if context_parts else ""
    
    prompt = f"""You are creating an educational compliance game. Your task is to create a realistic workplace scenario that contains EXACTLY ONE clear violation of the policy rule.

POLICY CONTEXT:
Policy Title: {policy_title}
{context}

POLICY RULE THAT MUST BE VIOLATED:
"{rule_to_use}"

CRITICAL REQUIREMENTS:
1. Create a realistic workplace scenario (3-4 sentences)
2. The scenario must contain EXACTLY ONE clear violation of the policy rule above
3. The violation must be explicit and clearly contradict the rule
4. The violation text should be a specific phrase or action that violates the rule
5. The violation must be embedded naturally in the scenario text
6. Calculate the exact character positions where the violation phrase starts and ends

Generate:
1. A realistic workplace scenario (3-4 sentences) with ONE violation embedded naturally
2. The exact violation text/phrase that violates the policy rule (must be a substring of the scenario_text)
3. The character positions where the violation starts and ends in the scenario_text (violation_start and violation_end)
4. A clear explanation of why this specific violation contradicts the policy rule
5. The exact policy rule text that was violated

Return JSON format:
{{
    "scenario_text": "full scenario text with violation embedded naturally",
    "violation_text": "exact phrase from scenario_text that violates the rule",
    "violation_start": 50,
    "violation_end": 80,
    "explanation": "detailed explanation of why this violates the policy rule",
    "policy_rule_violated": "{rule_to_use}"
}}

IMPORTANT: 
- The violation_text MUST be an exact substring of scenario_text
- violation_start and violation_end must be accurate character positions
- The violation must clearly contradict "{rule_to_use}" """

    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": """You are an expert compliance training game creator specializing in violation detection scenarios.

CRITICAL: The violation in your scenario MUST clearly contradict the policy rule provided. The violation text must be an exact substring of the scenario text, and the character positions must be accurate.

Always return valid JSON only."""
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model=MODEL_NAME,
            temperature=0.5,  # Lower temperature for more consistent, accurate violations
            max_tokens=1500,  # Increased for better explanations
            response_format={"type": "json_object"}
        )
        
        response_text = chat_completion.choices[0].message.content
        violation_data = json.loads(response_text)
        
        # Validate violation positions
        scenario_text = violation_data.get("scenario_text", "")
        violation_text = violation_data.get("violation_text", "")
        violation_start = violation_data.get("violation_start", 0)
        violation_end = violation_data.get("violation_end", 0)
        
        if not scenario_text or not violation_text:
            raise ValueError("scenario_text and violation_text are required")
        
        # Verify violation_text is actually in scenario_text
        if violation_text not in scenario_text:
            raise ValueError("violation_text must be a substring of scenario_text")
        
        # Verify character positions match the violation text
        actual_start = scenario_text.find(violation_text)
        if actual_start == -1:
            raise ValueError("violation_text not found in scenario_text")
        
        # Update positions to match actual location if they're off
        violation_data["violation_start"] = actual_start
        violation_data["violation_end"] = actual_start + len(violation_text)
        
        # Validate that policy_rule_violated matches
        if violation_data.get("policy_rule_violated") != rule_to_use:
            violation_data["policy_rule_violated"] = rule_to_use  # Ensure it matches
        
        # Validate explanation
        explanation = violation_data.get("explanation", "").lower()
        if not explanation or len(explanation) < 20:
            raise ValueError("Explanation must be detailed and explain why this violates the policy rule")
        
        return SpotViolationScenario(**violation_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate violation scenario: {str(e)}"
        )


@router.post("/game/generate/{policy_id}", response_model=GameSessionResponse)
async def generate_game(
    policy_id: str,
    game_type: str = Query(..., description="Game type: 'scenario' or 'violation'"),
    current_user: dict = Depends(get_current_user)
):
    """Generate a game session for a policy"""
    db = await get_database()
    
    # Get policy
    policy = await db.policies.find_one({"_id": ObjectId(policy_id)})
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Policy not found"
        )
    
    # Generate game based on type
    if game_type == "scenario":
        scenario = await generate_scenario_game(policy, rule_index=0)
        game_data = {"scenario": scenario.dict()}
    elif game_type == "violation":
        violation_scenario = await generate_violation_game(policy, rule_index=0)
        game_data = {"violation_scenario": violation_scenario.dict()}
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid game type. Use 'scenario' or 'violation'"
        )
    
    # Save game session
    session_doc = {
        "policy_id": policy_id,
        "user_id": str(current_user["_id"]),
        "game_type": game_type,
        **game_data,
        "created_at": datetime.utcnow(),
        "completed": False
    }
    
    result = await db.game_sessions.insert_one(session_doc)
    session_doc["_id"] = str(result.inserted_id)
    
    return GameSessionResponse(
        session_id=str(result.inserted_id),
        policy_id=policy_id,
        game_type=game_type,
        scenario=scenario if game_type == "scenario" else None,
        violation_scenario=violation_scenario if game_type == "violation" else None,
        created_at=session_doc["created_at"]
    )


@router.get("/game/start/{session_id}", response_model=GameSessionResponse)
async def get_game_session(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get game session details"""
    db = await get_database()
    
    session = await db.game_sessions.find_one({
        "_id": ObjectId(session_id),
        "user_id": str(current_user["_id"])
    })
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game session not found"
        )
    
    return GameSessionResponse(
        session_id=str(session["_id"]),
        policy_id=session["policy_id"],
        game_type=session["game_type"],
        scenario=GameScenario(**session["scenario"]) if session.get("scenario") else None,
        violation_scenario=SpotViolationScenario(**session["violation_scenario"]) if session.get("violation_scenario") else None,
        created_at=session["created_at"]
    )


@router.post("/game/submit", response_model=GameResult)
async def submit_game_answer(
    answer: GameAnswer,
    current_user: dict = Depends(get_current_user)
):
    """Submit game answer and get result"""
    db = await get_database()
    
    session = await db.game_sessions.find_one({
        "_id": ObjectId(answer.session_id),
        "user_id": str(current_user["_id"])
    })
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game session not found"
        )
    
    if session.get("completed"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Game session already completed"
        )
    
    # Check answer based on game type
    correct = False
    explanation = ""
    policy_rule = ""
    correct_answer_text = ""
    
    if session["game_type"] == "scenario":
        correct_answer_index = session["scenario"]["correct_answer"]
        correct = answer.answer == correct_answer_index
        explanation = session["scenario"]["explanation"]
        policy_rule = session["scenario"]["policy_rule_used"]
        # Get the correct answer text from options
        if correct_answer_index < len(session["scenario"]["options"]):
            correct_answer_text = session["scenario"]["options"][correct_answer_index]
    elif session["game_type"] == "violation":
        violation_start = session["violation_scenario"]["violation_start"]
        violation_end = session["violation_scenario"]["violation_end"]
        user_start = answer.violation_range.get("start") if answer.violation_range else None
        user_end = answer.violation_range.get("end") if answer.violation_range else None
        
        # Check if user's selection overlaps with correct violation
        if user_start and user_end:
            correct = (user_start <= violation_end and user_end >= violation_start)
        explanation = session["violation_scenario"]["explanation"]
        policy_rule = session["violation_scenario"]["policy_rule_violated"]
        # Get the correct violation text
        scenario_text = session["violation_scenario"]["scenario_text"]
        correct_answer_text = scenario_text[violation_start:violation_end]
    
    score = 100 if correct else 0
    
    # Update session
    # Note: MongoDB writes require a primary server, so this will fail if primary is unavailable
    try:
        await db.game_sessions.update_one(
            {"_id": ObjectId(answer.session_id)},
            {
                "$set": {
                    "completed": True,
                    "correct": correct,
                    "score": score,
                    "answered_at": datetime.utcnow()
                }
            }
        )
    except Exception as write_error:
        # If write fails due to no primary, log the error but still return the result
        # The game logic has already been processed correctly
        error_msg = str(write_error)
        print(f"⚠️ Warning: Failed to update session in database: {error_msg}")
        
        # Check if it's a primary server issue
        if "No primary available" in error_msg or "primary" in error_msg.lower():
            print("⚠️ MongoDB cluster has no primary server available. Please check MongoDB Atlas dashboard.")
            print("⚠️ Game result calculated successfully, but database update failed.")
            print("⚠️ The game will still work for reading, but scores may not be saved until primary is restored.")
        
        # Continue and return the result anyway - the game logic is correct
    
    return GameResult(
        session_id=answer.session_id,
        correct=correct,
        score=score,
        explanation=explanation,
        policy_rule=policy_rule,
        correct_answer=correct_answer_text if not correct else None  # Only show if wrong
    )


@router.post("/game/generate-batch/{policy_id}")
async def generate_batch_games(
    policy_id: str,
    num_games: int = Query(5, ge=1, le=10, description="Number of games to generate (default: 5)"),
    current_user: dict = Depends(get_current_user)
):
    """Generate multiple games (at least 5) for a policy"""
    db = await get_database()
    
    # Get policy
    policy = await db.policies.find_one({"_id": ObjectId(policy_id)})
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Policy not found"
        )
    
    rules = policy.get("rules", [])
    if not rules:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Policy has no rules to generate games from"
        )
    
    # Generate mix of scenario and violation games
    # At least 5 games total, with a mix of both types
    games_to_generate = max(5, num_games)
    scenario_count = (games_to_generate + 1) // 2  # Slightly more scenario games
    violation_count = games_to_generate - scenario_count
    
    generated_sessions = []
    
    # Generate scenario games
    for i in range(scenario_count):
        try:
            rule_idx = i % len(rules)  # Cycle through rules
            scenario = await generate_scenario_game(policy, rule_index=rule_idx)
            
            session_doc = {
                "policy_id": policy_id,
                "user_id": str(current_user["_id"]),
                "game_type": "scenario",
                "scenario": scenario.dict(),
                "created_at": datetime.utcnow(),
                "completed": False
            }
            
            result = await db.game_sessions.insert_one(session_doc)
            generated_sessions.append({
                "session_id": str(result.inserted_id),
                "policy_id": policy_id,
                "game_type": "scenario",
                "title": scenario.scenario_text[:100] + "..." if len(scenario.scenario_text) > 100 else scenario.scenario_text,
                "created_at": session_doc["created_at"]
            })
        except Exception as e:
            # Continue with other games even if one fails
            print(f"Failed to generate scenario game {i+1}: {str(e)}")
    
    # Generate violation games
    for i in range(violation_count):
        try:
            rule_idx = (scenario_count + i) % len(rules)  # Cycle through rules
            violation_scenario = await generate_violation_game(policy, rule_index=rule_idx)
            
            session_doc = {
                "policy_id": policy_id,
                "user_id": str(current_user["_id"]),
                "game_type": "violation",
                "violation_scenario": violation_scenario.dict(),
                "created_at": datetime.utcnow(),
                "completed": False
            }
            
            result = await db.game_sessions.insert_one(session_doc)
            generated_sessions.append({
                "session_id": str(result.inserted_id),
                "policy_id": policy_id,
                "game_type": "violation",
                "title": violation_scenario.scenario_text[:100] + "..." if len(violation_scenario.scenario_text) > 100 else violation_scenario.scenario_text,
                "created_at": session_doc["created_at"]
            })
        except Exception as e:
            # Continue with other games even if one fails
            print(f"Failed to generate violation game {i+1}: {str(e)}")
    
    if not generated_sessions:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate any games"
        )
    
    return {
        "policy_id": policy_id,
        "total_games": len(generated_sessions),
        "games": generated_sessions
    }


@router.get("/game/policy/{policy_id}/games")
async def get_policy_games(
    policy_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all games for a specific policy"""
    db = await get_database()
    
    games = await db.game_sessions.find({
        "policy_id": policy_id,
        "user_id": str(current_user["_id"])
    }).sort("created_at", -1).to_list(100)
    
    return [
        {
            "session_id": str(game["_id"]),
            "policy_id": game["policy_id"],
            "game_type": game["game_type"],
            "completed": game.get("completed", False),
            "score": game.get("score", 0),
            "created_at": game["created_at"],
            "title": (
                game.get("scenario", {}).get("scenario_text", "")[:100] + "..."
                if game.get("scenario", {}).get("scenario_text")
                else game.get("violation_scenario", {}).get("scenario_text", "")[:100] + "..."
                if game.get("violation_scenario", {}).get("scenario_text")
                else "Game"
            )
        }
        for game in games
    ]


@router.get("/games")
async def get_user_games(current_user: dict = Depends(get_current_user)):
    """Get all games for current user"""
    db = await get_database()
    
    games = await db.game_sessions.find(
        {"user_id": str(current_user["_id"])}
    ).sort("created_at", -1).to_list(100)
    
    return [
        {
            "session_id": str(game["_id"]),
            "policy_id": game["policy_id"],
            "game_type": game["game_type"],
            "completed": game.get("completed", False),
            "score": game.get("score", 0),
            "created_at": game["created_at"]
        }
        for game in games
    ]


@router.get("/user/scores")
async def get_user_scores(current_user: dict = Depends(get_current_user)):
    """Get current user's score statistics"""
    db = await get_database()
    user_id = str(current_user["_id"])
    
    # Get all games for this user
    all_games = await db.game_sessions.find({"user_id": user_id}).to_list(1000)
    completed_games = [g for g in all_games if g.get("completed", False)]
    
    # Calculate statistics
    total_games = len(all_games)
    completed_count = len(completed_games)
    total_score = sum(g.get("score", 0) for g in completed_games)
    average_score = total_score / completed_count if completed_count > 0 else 0
    highest_score = max((g.get("score", 0) for g in completed_games), default=0)
    correct_answers = sum(1 for g in completed_games if g.get("correct", False))
    accuracy = (correct_answers / completed_count * 100) if completed_count > 0 else 0
    
    # Get policy names for completed games
    policy_ids = list(set(g.get("policy_id") for g in completed_games if g.get("policy_id")))
    policies = {}
    for policy_id in policy_ids:
        policy = await db.policies.find_one({"_id": ObjectId(policy_id)})
        if policy:
            policies[policy_id] = policy.get("title", "Untitled")
    
    # Recent games with scores
    recent_games = [
        {
            "session_id": str(game["_id"]),
            "policy_id": game.get("policy_id"),
            "policy_title": policies.get(game.get("policy_id"), "Unknown Policy"),
            "game_type": game.get("game_type"),
            "score": game.get("score", 0),
            "correct": game.get("correct", False),
            "completed_at": game.get("answered_at", game.get("created_at"))
        }
        for game in sorted(completed_games, key=lambda x: x.get("answered_at", x.get("created_at")), reverse=True)[:10]
    ]
    
    return {
        "user_id": user_id,
        "user_name": current_user.get("name", "User"),
        "user_email": current_user.get("email", ""),
        "statistics": {
            "total_games": total_games,
            "completed_games": completed_count,
            "average_score": round(average_score, 2),
            "highest_score": highest_score,
            "total_score": total_score,
            "correct_answers": correct_answers,
            "accuracy": round(accuracy, 2)
        },
        "recent_games": recent_games
    }


@router.get("/leaderboard")
async def get_leaderboard(current_user: dict = Depends(get_current_user)):
    """Get public leaderboard - all users ranked by performance"""
    db = await get_database()
    
    # Get all users
    users = await db.users.find({"role": "user"}).to_list(1000)
    
    leaderboard = []
    current_user_rank = None
    
    for user in users:
        user_id = str(user["_id"])
        
        # Get all games for this user
        all_games = await db.game_sessions.find({"user_id": user_id}).to_list(1000)
        completed_games = [g for g in all_games if g.get("completed", False)]
        
        # Only include users who have completed at least one game
        if len(completed_games) == 0:
            continue
        
        # Calculate statistics
        completed_count = len(completed_games)
        total_score = sum(g.get("score", 0) for g in completed_games)
        average_score = total_score / completed_count if completed_count > 0 else 0
        highest_score = max((g.get("score", 0) for g in completed_games), default=0)
        correct_answers = sum(1 for g in completed_games if g.get("correct", False))
        accuracy = (correct_answers / completed_count * 100) if completed_count > 0 else 0
        
        leaderboard.append({
            "user_id": user_id,
            "user_name": user.get("name", "Unknown"),
            "user_email": user.get("email", ""),
            "completed_games": completed_count,
            "average_score": round(average_score, 2),
            "highest_score": highest_score,
            "total_score": total_score,
            "correct_answers": correct_answers,
            "accuracy": round(accuracy, 2),
            "is_current_user": user_id == str(current_user["_id"])
        })
    
    # Sort by average score (descending), then by total score, then by accuracy
    leaderboard.sort(key=lambda x: (x["average_score"], x["total_score"], x["accuracy"]), reverse=True)
    
    # Add rank and find current user's rank
    for idx, entry in enumerate(leaderboard):
        entry["rank"] = idx + 1
        if entry["is_current_user"]:
            current_user_rank = idx + 1
    
    return {
        "leaderboard": leaderboard[:100],  # Top 100
        "current_user_rank": current_user_rank,
        "total_participants": len(leaderboard)
    }

