from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.models.escape_model import (
    EscapeRoomResponse,
    EscapeAttemptResponse,
    RoomAnswer,
    RoomStatus,
    StartEscapeRequest
)
from app.utils.db import get_database
from app.utils.auth import get_current_user
from app.services.escape_service import generate_escape_rooms
from bson import ObjectId
import json

router = APIRouter()


@router.post("/escape/generate/{policy_id}")
async def generate_escape_room(
    policy_id: str,
    level: str = Query(..., pattern="^(beginner|intermediate|expert)$"),
    force: bool = Query(False, description="Force regeneration even if escape room exists"),
    current_user: dict = Depends(get_current_user)
):
    """Generate escape room puzzles for a policy"""
    db = await get_database()
    
    # Get policy
    policy = await db.policies.find_one({"_id": ObjectId(policy_id)})
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Policy not found"
        )
    
    # Check if escape room already exists for this policy and level
    existing = await db.escape_rooms.find_one({
        "policy_id": policy_id,
        "level": level
    })
    
    if existing and not force:
        # Check if rooms have data
        rooms_data = existing.get("rooms", {})
        room1_has_data = rooms_data.get("room1") and (
            (isinstance(rooms_data["room1"], list) and len(rooms_data["room1"]) > 0) or
            (isinstance(rooms_data["room1"], dict) and rooms_data["room1"])
        )
        
        if room1_has_data:
            return EscapeRoomResponse(
                escape_room_id=str(existing["_id"]),
                policy_id=policy_id,
                level=level,
                rooms=rooms_data,
                created_at=existing.get("created_at", datetime.utcnow())
            )
        else:
            print(f"Existing escape room found but Room 1 is empty, regenerating...")
            # Delete the empty escape room
            await db.escape_rooms.delete_one({"_id": existing["_id"]})
    
    # Generate escape rooms
    try:
        print(f"Starting escape room generation for policy {policy_id}, level {level}")
        print(f"Policy data keys: {list(policy.keys())}")
        print(f"Policy structuredData keys: {list(policy.get('structuredData', {}).keys())}")
        rooms = await generate_escape_rooms(policy, level)
        print(f"Successfully generated {len(rooms)} rooms")
        print(f"Room1 has {len(rooms.get('room1', []))} puzzles")
        print(f"Room1 data: {rooms.get('room1', [])[:1] if rooms.get('room1') else 'EMPTY'}")
        
        # Ensure all rooms have data
        if not rooms or not any(rooms.values()):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate escape rooms. Policy may not have enough data (definitions, rules, exceptions)."
            )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error generating escape rooms: {error_details}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate escape rooms: {str(e)}"
        )
    
    # Save to database
    escape_room_doc = {
        "policy_id": policy_id,
        "level": level,
        "rooms": rooms,
        "created_at": datetime.utcnow()
    }
    
    result = await db.escape_rooms.insert_one(escape_room_doc)
    
    return EscapeRoomResponse(
        escape_room_id=str(result.inserted_id),
        policy_id=policy_id,
        level=level,
        rooms=rooms,
        created_at=escape_room_doc["created_at"]
    )


@router.post("/escape/start")
async def start_escape_attempt(
    request: StartEscapeRequest,
    current_user: dict = Depends(get_current_user)
):
    """Start a new escape room attempt"""
    db = await get_database()
    
    try:
        print(f"Starting escape room attempt for escape_room_id: {request.escape_room_id}")
        
        # Get escape room
        escape_room = await db.escape_rooms.find_one({"_id": ObjectId(request.escape_room_id)})
        if not escape_room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Escape room not found"
            )
        
        print(f"Found escape room: {escape_room.get('level')} level for policy {escape_room.get('policy_id')}")
        
        # Create attempt
        attempt_doc = {
            "user_id": str(current_user["_id"]),
            "policy_id": escape_room["policy_id"],
            "level": escape_room["level"],
            "escape_room_id": request.escape_room_id,
            "score": 0,
            "time_taken": 0,
            "room_status": {
                "room1": "pending",
                "room2": "pending",
                "room3": "pending",
                "room4": "pending",
                "room5": "pending"
            },
            "rooms_completed": [],
            "created_at": datetime.utcnow(),
            "completed_at": None
        }
        
        result = await db.escape_attempts.insert_one(attempt_doc)
        print(f"Created attempt: {result.inserted_id}")
        
        return {
            "attempt_id": str(result.inserted_id),
            "escape_room_id": request.escape_room_id,
            "policy_id": escape_room["policy_id"],
            "level": escape_room["level"],
            "rooms": escape_room["rooms"]
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in start_escape_attempt: {error_details}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start escape room: {str(e)}"
        )


@router.post("/escape/submit/{attempt_id}")
async def submit_room_answer(
    attempt_id: str,
    room_answer: RoomAnswer,
    current_user: dict = Depends(get_current_user)
):
    """Submit answer for a room"""
    try:
        print(f"Submitting answer for attempt {attempt_id}, room {room_answer.room_number}")
        print(f"Answer data: {room_answer.answer}")
        
        db = await get_database()
        
        # Get attempt
        attempt = await db.escape_attempts.find_one({
            "_id": ObjectId(attempt_id),
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
        
        # Get escape room
        escape_room = await db.escape_rooms.find_one({
            "_id": ObjectId(attempt["escape_room_id"])
        })
        
        if not escape_room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Escape room not found"
            )
        
        # Validate answer based on room number
        room_key = f"room{room_answer.room_number}"
        room_puzzles = escape_room["rooms"].get(room_key, [])
        
        print(f"Room key: {room_key}, Puzzles found: {len(room_puzzles) if isinstance(room_puzzles, list) else 'dict'}")
        
        if not room_puzzles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Room {room_answer.room_number} not found or empty"
            )
        
        # Check answer (simplified - you may want more sophisticated checking)
        is_correct = False
        points_earned = 0
        
        # Room-specific answer checking
        if room_answer.room_number == 1:
            # Definition matching
            puzzle = room_puzzles[0] if isinstance(room_puzzles, list) and len(room_puzzles) > 0 else {}
            user_answer = room_answer.answer.get("selected_definition", "")
            correct_def = puzzle.get("definition", "")
            is_correct = user_answer == correct_def
            print(f"Room 1: User answer='{user_answer}', Correct='{correct_def}', Match={is_correct}")
        
        elif room_answer.room_number == 2:
            # Exception identification
            puzzle = room_puzzles[0] if isinstance(room_puzzles, list) and len(room_puzzles) > 0 else {}
            user_answer = room_answer.answer.get("selected_exception", "")
            correct_exc = puzzle.get("correct_exception", "")
            is_correct = user_answer == correct_exc
            print(f"Room 2: User answer='{user_answer}', Correct='{correct_exc}', Match={is_correct}")
        
        elif room_answer.room_number == 3:
            # Rule selection
            puzzle = room_puzzles[0] if isinstance(room_puzzles, list) and len(room_puzzles) > 0 else {}
            user_answer = room_answer.answer.get("selected_rule", "")
            correct_rule = puzzle.get("correct_rule", "")
            is_correct = user_answer == correct_rule
            print(f"Room 3: User answer='{user_answer}', Correct='{correct_rule}', Match={is_correct}")
        
        elif room_answer.room_number == 4:
            # Violation fix
            puzzle = room_puzzles[0] if isinstance(room_puzzles, list) and len(room_puzzles) > 0 else {}
            user_fix = room_answer.answer.get("fix", "").strip().lower()
            correct_fix = puzzle.get("fix", "").strip().lower()
            # Simple similarity check (you may want more sophisticated matching)
            is_correct = user_fix == correct_fix or user_fix in correct_fix or correct_fix in user_fix
            print(f"Room 4: User fix='{user_fix}', Correct='{correct_fix}', Match={is_correct}")
        
        elif room_answer.room_number == 5:
            # Master puzzle - check all parts
            puzzle = room_puzzles if isinstance(room_puzzles, dict) else {}
            def_answer = room_answer.answer.get("definition_answer", "")
            def_correct = def_answer == puzzle.get("definition_question", {}).get("definition", "")
            
            rule_answer = room_answer.answer.get("rule_answer", "")
            rule_correct = rule_answer == puzzle.get("rule_question", {}).get("correct_rule", "")
            
            exc_answer = room_answer.answer.get("exception_answer", "")
            exc_correct = exc_answer == puzzle.get("exception_question", {}).get("correct_exception", "")
            
            viol_fix = room_answer.answer.get("violation_fix", "").strip().lower()
            viol_correct = viol_fix == puzzle.get("violation_question", {}).get("fix", "").strip().lower()
            
            is_correct = def_correct and rule_correct and exc_correct and viol_correct
            print(f"Room 5: Def={def_correct}, Rule={rule_correct}, Exc={exc_correct}, Viol={viol_correct}, Overall={is_correct}")
        
        # Calculate score
        if is_correct:
            points_earned = 10
            # Fast answer bonus (if time is provided)
            time_taken = room_answer.answer.get("time_taken", 0)
            if time_taken > 0 and time_taken < 60:  # Less than 60 seconds
                points_earned += 5
        else:
            points_earned = -5
        
        # Update attempt
        new_score = attempt.get("score", 0) + points_earned
        room_status = attempt.get("room_status", {})
        room_status[f"room{room_answer.room_number}"] = "done" if is_correct else "failed"
        
        rooms_completed = attempt.get("rooms_completed", [])
        if is_correct and f"room{room_answer.room_number}" not in rooms_completed:
            rooms_completed.append(f"room{room_answer.room_number}")
        
        await db.escape_attempts.update_one(
            {"_id": ObjectId(attempt_id)},
            {
                "$set": {
                    "score": new_score,
                    "room_status": room_status,
                    "rooms_completed": rooms_completed
                }
            }
        )
        
        # Get explanation based on room type
        explanation = ""
        if room_answer.room_number == 5:
            explanation = puzzle.get("violation_question", {}).get("explanation", "")
        elif isinstance(room_puzzles, list) and len(room_puzzles) > 0:
            explanation = room_puzzles[0].get("explanation", "")
        
        return {
            "correct": is_correct,
            "points_earned": points_earned,
            "new_score": new_score,
            "explanation": explanation
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in submit_room_answer: {error_details}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit answer: {str(e)}"
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in submit_room_answer: {error_details}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit answer: {str(e)}"
        )


@router.post("/escape/finish/{attempt_id}")
async def finish_escape_attempt(
    attempt_id: str,
    time_taken: int,
    current_user: dict = Depends(get_current_user)
):
    """Finish an escape room attempt"""
    db = await get_database()
    
    attempt = await db.escape_attempts.find_one({
        "_id": ObjectId(attempt_id),
        "user_id": str(current_user["_id"])
    })
    
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attempt not found"
        )
    
    # Calculate final score with time bonus
    base_score = attempt.get("score", 0)
    time_bonus = max(0, 100 - (time_taken // 10))  # Bonus decreases with time
    final_score = base_score + time_bonus
    
    # Update attempt
    await db.escape_attempts.update_one(
        {"_id": ObjectId(attempt_id)},
        {
            "$set": {
                "score": final_score,
                "time_taken": time_taken,
                "completed_at": datetime.utcnow()
            }
        }
    )
    
    return {
        "attempt_id": attempt_id,
        "final_score": final_score,
        "time_taken": time_taken,
        "rooms_completed": attempt.get("rooms_completed", [])
    }


@router.get("/escape/leaderboard")
async def get_escape_leaderboard(
    level: Optional[str] = Query(None, pattern="^(beginner|intermediate|expert)$"),
    current_user: dict = Depends(get_current_user)
):
    """Get escape room leaderboard"""
    db = await get_database()
    
    query = {}
    if level:
        query["level"] = level
    
    # Get completed attempts
    attempts = await db.escape_attempts.find({
        **query,
        "completed_at": {"$ne": None}
    }).sort("score", -1).limit(100).to_list(100)
    
    leaderboard = []
    for attempt in attempts:
        user = await db.users.find_one({"_id": ObjectId(attempt["user_id"])})
        leaderboard.append({
            "user_id": attempt["user_id"],
            "user_name": user.get("name", "Unknown") if user else "Unknown",
            "user_email": user.get("email", "") if user else "",
            "policy_id": attempt["policy_id"],
            "level": attempt["level"],
            "score": attempt.get("score", 0),
            "time_taken": attempt.get("time_taken", 0),
            "rooms_completed": len(attempt.get("rooms_completed", [])),
            "completed_at": attempt.get("completed_at")
        })
    
    return {
        "leaderboard": leaderboard,
        "level": level or "all"
    }


@router.get("/escape/rooms/{attempt_id}")
async def get_escape_rooms_by_attempt(
    attempt_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get escape rooms data for an attempt"""
    db = await get_database()
    
    attempt = await db.escape_attempts.find_one({
        "_id": ObjectId(attempt_id),
        "user_id": str(current_user["_id"])
    })
    
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attempt not found"
        )
    
    escape_room = await db.escape_rooms.find_one({
        "_id": ObjectId(attempt["escape_room_id"])
    })
    
    if not escape_room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Escape room not found"
        )
    
    rooms_data = escape_room.get("rooms", {})
    print(f"Returning rooms data for attempt {attempt_id}:")
    print(f"  Room1 type: {type(rooms_data.get('room1'))}, length: {len(rooms_data.get('room1', [])) if isinstance(rooms_data.get('room1'), list) else 'N/A'}")
    print(f"  Room1 data: {rooms_data.get('room1')}")
    
    return {
        "rooms": rooms_data,
        "score": attempt.get("score", 0),
        "room_status": attempt.get("room_status", {})
    }


@router.get("/escape/rooms/{policy_id}/{level}")
async def get_escape_rooms(
    policy_id: str,
    level: str,
    current_user: dict = Depends(get_current_user)
):
    """Get escape rooms for a policy and level"""
    db = await get_database()
    
    escape_room = await db.escape_rooms.find_one({
        "policy_id": policy_id,
        "level": level
    })
    
    if not escape_room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Escape room not found. Generate it first."
        )
    
    return {
        "escape_room_id": str(escape_room["_id"]),
        "policy_id": policy_id,
        "level": level,
        "rooms": escape_room["rooms"]
    }

