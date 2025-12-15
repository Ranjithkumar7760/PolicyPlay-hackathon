from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, status, Depends
from app.utils.db import get_database
from app.utils.auth import get_current_admin
from bson import ObjectId
from typing import List, Dict

router = APIRouter()


@router.get("/analytics/summary")
async def get_analytics_summary(admin: dict = Depends(get_current_admin)):
    """Get admin dashboard analytics summary"""
    db = await get_database()
    
    # Total users
    total_users = await db.users.count_documents({"role": "user"})
    
    # Total policies
    total_policies = await db.policies.count_documents({})
    
    # Total game plays
    total_game_plays = await db.game_sessions.count_documents({})
    
    # Completed games
    completed_games = await db.game_sessions.count_documents({"completed": True})
    
    # Completion rate
    completion_rate = (completed_games / total_game_plays * 100) if total_game_plays > 0 else 0
    
    # Average score
    completed_sessions = await db.game_sessions.find({"completed": True}).to_list(1000)
    avg_score = sum(s.get("score", 0) for s in completed_sessions) / len(completed_sessions) if completed_sessions else 0
    
    # Most violated rules (from game results)
    violation_data = await db.game_sessions.find({
        "completed": True,
        "correct": False
    }).to_list(1000)
    
    rule_violations = {}
    for session in violation_data:
        if session.get("violation_scenario"):
            rule = session["violation_scenario"].get("policy_rule_violated", "Unknown")
            rule_violations[rule] = rule_violations.get(rule, 0) + 1
    
    most_violated_rules = sorted(
        rule_violations.items(),
        key=lambda x: x[1],
        reverse=True
    )[:5]
    
    # Most confusing policy sections (across all policies)
    all_policies = await db.policies.find({}).to_list(100)
    policy_confusion = {}
    
    for policy in all_policies:
        policy_id = str(policy["_id"])
        policy_sessions = await db.game_sessions.find({
            "policy_id": policy_id,
            "completed": True
        }).to_list(1000)
        
        if policy_sessions:
            low_score_count = sum(1 for s in policy_sessions if s.get("score", 0) < 50)
            total_completed = len(policy_sessions)
            confusion_rate = (low_score_count / total_completed * 100) if total_completed > 0 else 0
            
            if confusion_rate > 0:
                policy_confusion[policy_id] = {
                    "policy_id": policy_id,
                    "title": policy.get("title", "Untitled"),
                    "confusion_rate": round(confusion_rate, 2),
                    "low_scores": low_score_count,
                    "total_attempts": total_completed,
                    "average_score": sum(s.get("score", 0) for s in policy_sessions) / total_completed
                }
    
    # Find most confusing policy
    most_confusing_policy = None
    if policy_confusion:
        most_confusing_policy = max(
            policy_confusion.values(),
            key=lambda x: x["confusion_rate"]
        )
    
    # Most confusing sections across all policies
    confusing_sections_all = []
    all_sessions = await db.game_sessions.find({"completed": True}).to_list(1000)
    for session in all_sessions:
        if session.get("score", 0) < 50:
            if session.get("scenario"):
                rule = session["scenario"].get("policy_rule_used", "Unknown")
            elif session.get("violation_scenario"):
                rule = session["violation_scenario"].get("policy_rule_violated", "Unknown")
            else:
                rule = "Unknown"
            confusing_sections_all.append(rule)
    
    from collections import Counter
    most_confusing_sections = Counter(confusing_sections_all).most_common(5)
    
    return {
        "total_users": total_users,
        "total_policies": total_policies,
        "total_game_plays": total_game_plays,
        "completion_rate": round(completion_rate, 2),
        "average_score": round(avg_score, 2),
        "most_violated_rules": [
            {"rule": rule, "violations": count}
            for rule, count in most_violated_rules
        ],
        "most_confusing_policy": most_confusing_policy,
        "most_confusing_sections": [
            {"section": section, "low_scores": count}
            for section, count in most_confusing_sections
        ]
    }


@router.get("/analytics/policy/{policy_id}")
async def get_policy_analytics(
    policy_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Get analytics for a specific policy"""
    db = await get_database()
    
    policy = await db.policies.find_one({"_id": ObjectId(policy_id)})
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Policy not found"
        )
    
    # Game sessions for this policy
    game_sessions = await db.game_sessions.find({
        "policy_id": policy_id
    }).to_list(1000)
    
    total_plays = len(game_sessions)
    completed_plays = sum(1 for g in game_sessions if g.get("completed"))
    avg_score = sum(g.get("score", 0) for g in game_sessions if g.get("completed")) / completed_plays if completed_plays > 0 else 0
    
    # Most confusing sections (lowest scores)
    confusing_sections = []
    for session in game_sessions:
        if session.get("completed") and session.get("score", 0) < 50:
            if session.get("scenario"):
                rule = session["scenario"].get("policy_rule_used", "Unknown")
            elif session.get("violation_scenario"):
                rule = session["violation_scenario"].get("policy_rule_violated", "Unknown")
            else:
                rule = "Unknown"
            confusing_sections.append(rule)
    
    from collections import Counter
    most_confusing = Counter(confusing_sections).most_common(5)
    
    return {
        "policy_id": policy_id,
        "policy_title": policy.get("title", "Untitled"),
        "total_plays": total_plays,
        "completed_plays": completed_plays,
        "average_score": round(avg_score, 2),
        "most_confusing_sections": [
            {"section": section, "low_scores": count}
            for section, count in most_confusing
        ]
    }


@router.get("/policies")
async def get_all_policies(admin: dict = Depends(get_current_admin)):
    """Get all policies"""
    db = await get_database()
    
    policies = await db.policies.find({}).sort("uploaded_at", -1).to_list(100)
    
    return [
        {
            "policyId": str(policy["_id"]),
            "title": policy.get("title", "Untitled"),
            "filename": policy.get("filename", "Unknown"),
            "uploaded_by": policy.get("uploaded_by_name", "Unknown"),
            "uploaded_at": policy.get("uploaded_at"),
            "rules_count": len(policy.get("rules", [])),
            "clauses_count": len(policy.get("clauses", []))
        }
        for policy in policies
    ]


@router.delete("/policies/{policy_id}")
async def delete_policy(
    policy_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Delete a policy and all related game sessions"""
    db = await get_database()
    
    # Check if policy exists
    policy = await db.policies.find_one({"_id": ObjectId(policy_id)})
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Policy not found"
        )
    
    # Delete all game sessions related to this policy
    game_sessions_result = await db.game_sessions.delete_many({"policy_id": policy_id})
    deleted_games_count = game_sessions_result.deleted_count
    
    # Delete the policy
    delete_result = await db.policies.delete_one({"_id": ObjectId(policy_id)})
    
    if delete_result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete policy"
        )
    
    return {
        "message": "Policy deleted successfully",
        "policy_id": policy_id,
        "deleted_game_sessions": deleted_games_count
    }


@router.get("/users/scores")
async def get_all_users_scores(admin: dict = Depends(get_current_admin)):
    """Get scores for all users"""
    db = await get_database()
    
    # Get all users
    users = await db.users.find({"role": "user"}).to_list(1000)
    
    user_scores = []
    
    for user in users:
        user_id = str(user["_id"])
        
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
        
        user_scores.append({
            "user_id": user_id,
            "user_name": user.get("name", "Unknown"),
            "user_email": user.get("email", ""),
            "total_games": total_games,
            "completed_games": completed_count,
            "average_score": round(average_score, 2),
            "highest_score": highest_score,
            "total_score": total_score,
            "correct_answers": correct_answers,
            "accuracy": round(accuracy, 2),
            "created_at": user.get("created_at")
        })
    
    # Sort by average score (descending)
    user_scores.sort(key=lambda x: x["average_score"], reverse=True)
    
    return {
        "total_users": len(user_scores),
        "users": user_scores
    }

