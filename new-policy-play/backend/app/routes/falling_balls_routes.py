from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from bson import ObjectId
from app.models.falling_ball_model import (
    FallingBallGameSet,
    FallingBallAttempt,
    StartFallingBallRequest,
    SubmitFallingBallAnswer,
    FinishFallingBallRequest,
    FallingBallLeaderboardEntry
)
from app.utils.db import get_database
from app.utils.auth import get_current_user
from app.services.falling_balls_generator import generate_falling_ball_questions

router = APIRouter()


@router.post("/policy-tap/generate/{policy_id}")
async def generate_policy_tap_game(
    policy_id: str,
    level: str = Query(..., pattern="^(beginner|intermediate|expert)$"),
    current_user: dict = Depends(get_current_user)
):
    """Generate Policy Tap game questions for a policy"""
    db = await get_database()
    
    # Get policy
    policy = await db.policies.find_one({"_id": ObjectId(policy_id)})
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Policy not found"
        )
    
    # Check if game set already exists
    existing = await db.falling_ball_games.find_one({
        "policy_id": policy_id,
        "level": level
    })
    
    if existing:
        return {
            "game_set_id": str(existing["_id"]),
            "policy_id": policy_id,
            "level": level,
            "questions": existing.get("questions", []),
            "created_at": existing.get("created_at")
        }
    
    # Generate questions
    try:
        num_questions = 10
        questions = await generate_falling_ball_questions(policy, level, num_questions)
        
        # Convert to dict for storage
        questions_dict = [
            {
                "question": q.question,
                "correct": q.correct,
                "wrong_options": q.wrong_options
            }
            for q in questions
        ]
        
        # Save to database
        game_set_doc = {
            "policy_id": policy_id,
            "level": level,
            "questions": questions_dict,
            "created_at": datetime.utcnow()
        }
        
        result = await db.falling_ball_games.insert_one(game_set_doc)
        
        return {
            "game_set_id": str(result.inserted_id),
            "policy_id": policy_id,
            "level": level,
            "questions": questions_dict,
            "created_at": game_set_doc["created_at"]
        }
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error generating falling ball game: {error_details}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate game: {str(e)}"
        )


@router.get("/policy-tap/game-set/{game_set_id}")
async def get_policy_tap_game_set(
    game_set_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get Policy Tap game set data without creating an attempt"""
    db = await get_database()
    
    # Get game set
    game_set = await db.falling_ball_games.find_one({"_id": ObjectId(game_set_id)})
    if not game_set:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game set not found"
        )
    
    return {
        "game_set_id": game_set_id,
        "questions": game_set.get("questions", []),
        "level": game_set["level"],
        "policy_id": game_set.get("policy_id")
    }


@router.post("/policy-tap/start")
async def start_policy_tap_game(
    request: StartFallingBallRequest,
    current_user: dict = Depends(get_current_user)
):
    """Start a new Policy Tap game attempt"""
    db = await get_database()
    
    # Get game set
    game_set = await db.falling_ball_games.find_one({"_id": ObjectId(request.game_set_id)})
    if not game_set:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game set not found"
        )
    
    # Create attempt
    attempt_doc = {
        "user_id": str(current_user["_id"]),
        "policy_id": game_set["policy_id"],
        "level": game_set["level"],
        "game_set_id": request.game_set_id,
        "score": 0,
        "correct_answers": 0,
        "wrong_answers": 0,
        "missed_answers": 0,
        "time_taken": 0,
        "answers": [],
        "created_at": datetime.utcnow(),
        "completed_at": None
    }
    
    result = await db.falling_ball_attempts.insert_one(attempt_doc)
    
    return {
        "attempt_id": str(result.inserted_id),
        "game_set_id": request.game_set_id,
        "questions": game_set.get("questions", []),
        "level": game_set["level"]
    }


@router.post("/policy-tap/submit")
async def submit_policy_tap_answer(
    answer: SubmitFallingBallAnswer,
    current_user: dict = Depends(get_current_user)
):
    """Submit an answer for a Policy Tap question"""
    db = await get_database()
    
    # Get attempt
    attempt = await db.falling_ball_attempts.find_one({
        "_id": ObjectId(answer.attempt_id),
        "user_id": str(current_user["_id"])
    })
    
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attempt not found"
        )
    
    if attempt.get("completed_at"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attempt already completed"
        )
    
    # Get game set to check correct answer
    game_set = await db.falling_ball_games.find_one({"_id": ObjectId(attempt["game_set_id"])})
    if not game_set:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game set not found"
        )
    
    questions = game_set.get("questions", [])
    if answer.question_index >= len(questions):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid question index"
        )
    
    question = questions[answer.question_index]
    correct_answer = question.get("correct", "")
    is_correct = answer.selected_option == correct_answer
    
    # Debug logging
    print(f"Question {answer.question_index}: Selected='{answer.selected_option}', Correct='{correct_answer}', is_correct={is_correct}, was_missed={answer.was_missed}")
    
    # Calculate points - check was_missed first, then correctness
    points = 0
    if answer.was_missed:
        # User missed the question (ball fell without being clicked)
        # This happens when no ball was selected before all balls fell
        points = -5  # Penalty for missing
    elif is_correct:
        # Correct answer was selected
        points = 10
        # Speed bonus (answered quickly)
        if answer.time_taken < 2.0:
            points += 2
        print(f"✅ Correct answer! Points: {points}")
    else:
        # Wrong answer was selected
        points = -5
        print(f"❌ Wrong answer. Points: {points}")
    
    print(f"Points calculated: {points}, Current score: {attempt.get('score', 0)}, New score: {attempt.get('score', 0) + points}")
    
    # Check if this question has already been answered
    existing_answers = attempt.get("answers", [])
    already_answered = any(
        ans.get("question_index") == answer.question_index 
        for ans in existing_answers
    )
    
    if already_answered:
        # Return existing answer data without updating
        print(f"⚠️ Question {answer.question_index} already answered, skipping duplicate submission")
        existing_answer = next(
            (ans for ans in existing_answers if ans.get("question_index") == answer.question_index),
            None
        )
        if existing_answer:
            return {
                "correct": existing_answer.get("is_correct", False),
                "points": 0,  # No points for duplicate
                "new_score": attempt.get("score", 0),
                "correct_answer": question.get("correct", ""),
                "message": "Question already answered"
            }
    
    # Update attempt
    new_score = attempt.get("score", 0) + points
    answers = attempt.get("answers", [])
    answers.append({
        "question_index": answer.question_index,
        "selected_option": answer.selected_option,
        "is_correct": is_correct,
        "time_taken": answer.time_taken,
        "was_missed": answer.was_missed
    })
    
    correct_count = attempt.get("correct_answers", 0)
    wrong_count = attempt.get("wrong_answers", 0)
    missed_count = attempt.get("missed_answers", 0)
    
    if is_correct:
        correct_count += 1
    elif answer.was_missed:
        missed_count += 1
    else:
        wrong_count += 1
    
    await db.falling_ball_attempts.update_one(
        {"_id": ObjectId(answer.attempt_id)},
        {
            "$set": {
                "score": new_score,
                "correct_answers": correct_count,
                "wrong_answers": wrong_count,
                "missed_answers": missed_count,
                "answers": answers
            }
        }
    )
    
    return {
        "correct": is_correct,
        "points": points,
        "new_score": new_score,
        "correct_answer": question.get("correct", "")
    }


@router.post("/policy-tap/finish")
async def finish_policy_tap_game(
    request: FinishFallingBallRequest,
    current_user: dict = Depends(get_current_user)
):
    """Finish a Policy Tap game attempt"""
    db = await get_database()
    
    attempt = await db.falling_ball_attempts.find_one({
        "_id": ObjectId(request.attempt_id),
        "user_id": str(current_user["_id"])
    })
    
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attempt not found"
        )
    
    # Update attempt with final time
    await db.falling_ball_attempts.update_one(
        {"_id": ObjectId(request.attempt_id)},
        {
            "$set": {
                "time_taken": request.final_time_taken,
                "completed_at": datetime.utcnow()
            }
        }
    )
    
    # Fetch updated attempt to get latest scores
    updated_attempt = await db.falling_ball_attempts.find_one({"_id": ObjectId(request.attempt_id)})
    
    if not updated_attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attempt not found after update"
        )
    
    # Get final scores from updated attempt
    final_score = updated_attempt.get("score", 0)
    correct_answers = updated_attempt.get("correct_answers", 0)
    wrong_answers = updated_attempt.get("wrong_answers", 0)
    missed_answers = updated_attempt.get("missed_answers", 0)
    
    print(f"Finish game - Final scores: score={final_score}, correct={correct_answers}, wrong={wrong_answers}, missed={missed_answers}")
    
    return {
        "attempt_id": str(request.attempt_id),
        "final_score": final_score,
        "correct_answers": correct_answers,
        "wrong_answers": wrong_answers,
        "missed_answers": missed_answers,
        "time_taken": request.final_time_taken
    }


@router.get("/policy-tap/leaderboard")
async def get_policy_tap_leaderboard(
    policy_id: Optional[str] = Query(None),
    level: Optional[str] = Query(None, pattern="^(beginner|intermediate|expert)$"),
    current_user: dict = Depends(get_current_user)
):
    """Get Policy Tap game leaderboard"""
    db = await get_database()
    
    query = {}
    if policy_id:
        query["policy_id"] = policy_id
    if level:
        query["level"] = level
    
    # Get completed attempts
    attempts = await db.falling_ball_attempts.find({
        **query,
        "completed_at": {"$ne": None}
    }).sort("score", -1).limit(100).to_list(100)
    
    leaderboard = []
    for idx, attempt in enumerate(attempts):
        user = await db.users.find_one({"_id": ObjectId(attempt["user_id"])})
        leaderboard.append({
            "rank": idx + 1,
            "user_id": attempt["user_id"],
            "username": user.get("name", "Unknown") if user else "Unknown",
            "email": user.get("email", "") if user else "",
            "score": attempt.get("score", 0),
            "level": attempt.get("level", "beginner"),
            "correct_answers": attempt.get("correct_answers", 0),
            "wrong_answers": attempt.get("wrong_answers", 0),
            "missed_answers": attempt.get("missed_answers", 0),
            "time_taken": attempt.get("time_taken", 0),
            "completed_at": attempt.get("completed_at")
        })
    
    return {
        "leaderboard": leaderboard,
        "policy_id": policy_id or "all",
        "level": level or "all"
    }

