import os
import json
from groq import Groq
from dotenv import load_dotenv
from typing import Dict, List
from app.models.escape_model import (
    DefinitionPuzzle,
    ExceptionPuzzle,
    RuleVaultPuzzle,
    ViolationRepairPuzzle,
    MasterPuzzle
)

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY environment variable is required. Please set it in your .env file or environment.")
MODEL_NAME = "llama-3.3-70b-versatile"

groq_client = Groq(api_key=GROQ_API_KEY)


async def generate_room1_definitions(policy_data: dict, level: str) -> List[Dict]:
    """Generate Room 1: Definition matching puzzles"""
    # Try different possible field names for definitions
    definitions = policy_data.get("definitions", []) or policy_data.get("structuredData", {}).get("definitions", [])
    
    print(f"Room 1: Found {len(definitions) if definitions else 0} definitions in policy")
    
    # If no definitions, create puzzles from other policy data
    if not definitions or len(definitions) < 2:
        print("Room 1: Not enough definitions, will use fallback or generate from policy content")
        # Try to extract terms from other fields
        rules = policy_data.get("rules", []) or policy_data.get("structuredData", {}).get("rules", [])
        if rules:
            # Create simple definition puzzles from rules
            simple_definitions = []
            for i, rule in enumerate(rules[:3]):
                if isinstance(rule, str) and len(rule) > 20:
                    # Extract a key term from the rule
                    words = rule.split()
                    if len(words) > 3:
                        term = words[0] + " " + words[1] if len(words) > 1 else words[0]
                        simple_definitions.append({
                            "term": term,
                            "definition": rule[:100] + "..." if len(rule) > 100 else rule,
                            "wrong_options": [
                                "This is not the correct definition.",
                                "This definition does not match the term.",
                                "This is an incorrect explanation."
                            ]
                        })
            if simple_definitions:
                return simple_definitions
        return []
    
    # Adjust complexity based on level
    num_puzzles = 3 if level == "beginner" else 5 if level == "intermediate" else 7
    
    prompt = f"""Using this policy JSON, generate {num_puzzles} definition-matching puzzles for {level} level.

Policy Definitions:
{json.dumps(definitions[:10], indent=2)}

Generate puzzles where users match terms to their correct definitions.
For each puzzle, provide:
- term: The policy term/concept
- definition: The correct definition
- wrong_options: 3 incorrect definition options

Return JSON format:
{{
    "puzzles": [
        {{
            "term": "term name",
            "definition": "correct definition",
            "wrong_options": ["wrong1", "wrong2", "wrong3"]
        }}
    ]
}}

Make puzzles appropriate for {level} level:
- Beginner: Simple, direct definitions
- Intermediate: Some technical terms
- Expert: Complex, nuanced definitions"""

    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert at creating educational definition matching puzzles. Always return valid JSON."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model=MODEL_NAME,
            temperature=0.7,
            max_tokens=2000,
            response_format={"type": "json_object"}
        )
        
        response_text = chat_completion.choices[0].message.content
        data = json.loads(response_text)
        puzzles = data.get("puzzles", [])
        if not puzzles:
            print("Warning: Groq returned empty puzzles for Room 1")
        return puzzles
    except json.JSONDecodeError as e:
        print(f"JSON decode error in Room 1: {e}")
        if 'response_text' in locals():
            print(f"Response was: {response_text[:500]}")
        return []
    except Exception as e:
        print(f"Error generating Room 1 puzzles: {e}")
        import traceback
        traceback.print_exc()
        return []


async def generate_room2_exceptions(policy_data: dict, level: str) -> List[Dict]:
    """Generate Room 2: Exception identification puzzles"""
    exceptions = policy_data.get("exceptions", [])
    rules = policy_data.get("rules", [])
    
    if not exceptions or not rules:
        return []
    
    num_puzzles = 2 if level == "beginner" else 3 if level == "intermediate" else 4
    
    prompt = f"""Generate {num_puzzles} exception identification puzzles for {level} level.

Policy Rules:
{json.dumps(rules[:5], indent=2)}

Policy Exceptions:
{json.dumps(exceptions[:5], indent=2)}

For each puzzle, create a scenario and ask which exception applies.
Return JSON format:
{{
    "puzzles": [
        {{
            "rule": "policy rule text",
            "scenario": "realistic scenario description",
            "correct_exception": "the correct exception that applies",
            "wrong_exceptions": ["wrong exception 1", "wrong exception 2", "wrong exception 3"]
        }}
    ]
}}

Level guidelines:
- Beginner: Clear, obvious exceptions
- Intermediate: Somewhat nuanced scenarios
- Expert: Complex scenarios requiring careful analysis"""

    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert at creating exception identification puzzles. Always return valid JSON."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model=MODEL_NAME,
            temperature=0.7,
            max_tokens=2000,
            response_format={"type": "json_object"}
        )
        
        response_text = chat_completion.choices[0].message.content
        data = json.loads(response_text)
        puzzles = data.get("puzzles", [])
        if not puzzles:
            print("Warning: Groq returned empty puzzles for Room 2")
        return puzzles
    except json.JSONDecodeError as e:
        print(f"JSON decode error in Room 2: {e}")
        if 'response_text' in locals():
            print(f"Response was: {response_text[:500]}")
        return []
    except Exception as e:
        print(f"Error generating Room 2 puzzles: {e}")
        import traceback
        traceback.print_exc()
        return []


async def generate_room3_rules(policy_data: dict, level: str) -> List[Dict]:
    """Generate Room 3: Rule selection puzzles"""
    rules = policy_data.get("rules", [])
    
    if not rules:
        return []
    
    num_puzzles = 3 if level == "beginner" else 4 if level == "intermediate" else 5
    
    prompt = f"""Generate {num_puzzles} rule selection puzzles for {level} level.

Policy Rules:
{json.dumps(rules, indent=2)}

Create scenarios where users must select the correct rule that applies.
Return JSON format:
{{
    "puzzles": [
        {{
            "scenario": "realistic workplace scenario",
            "correct_rule": "the rule that applies to this scenario",
            "wrong_rules": ["rule 1", "rule 2", "rule 3"]
        }}
    ]
}}

Level guidelines:
- Beginner: Direct, clear scenarios
- Intermediate: Scenarios with some ambiguity
- Expert: Complex scenarios requiring deep understanding"""

    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert at creating rule selection puzzles. Always return valid JSON."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model=MODEL_NAME,
            temperature=0.7,
            max_tokens=2000,
            response_format={"type": "json_object"}
        )
        
        response_text = chat_completion.choices[0].message.content
        data = json.loads(response_text)
        puzzles = data.get("puzzles", [])
        if not puzzles:
            print("Warning: Groq returned empty puzzles for Room 3")
        return puzzles
    except json.JSONDecodeError as e:
        print(f"JSON decode error in Room 3: {e}")
        if 'response_text' in locals():
            print(f"Response was: {response_text[:500]}")
        return []
    except Exception as e:
        print(f"Error generating Room 3 puzzles: {e}")
        import traceback
        traceback.print_exc()
        return []


async def generate_room4_violations(policy_data: dict, level: str) -> List[Dict]:
    """Generate Room 4: Violation repair puzzles"""
    rules = policy_data.get("rules", [])
    
    if not rules:
        return []
    
    num_puzzles = 2 if level == "beginner" else 3 if level == "intermediate" else 4
    
    prompt = f"""Generate {num_puzzles} violation repair puzzles for {level} level.

Policy Rules:
{json.dumps(rules[:5], indent=2)}

Create scenarios with policy violations that users must fix.
Return JSON format:
{{
    "puzzles": [
        {{
            "scenario": "context scenario",
            "violation": "statement or action that violates the policy",
            "fix": "corrected version that complies with policy",
            "explanation": "why the fix is correct"
        }}
    ]
}}

Level guidelines:
- Beginner: Obvious violations, simple fixes
- Intermediate: Moderate violations requiring understanding
- Expert: Subtle violations requiring deep policy knowledge"""

    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert at creating violation repair puzzles. Always return valid JSON."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model=MODEL_NAME,
            temperature=0.7,
            max_tokens=2000,
            response_format={"type": "json_object"}
        )
        
        response_text = chat_completion.choices[0].message.content
        data = json.loads(response_text)
        puzzles = data.get("puzzles", [])
        if not puzzles:
            print("Warning: Groq returned empty puzzles for Room 4")
        return puzzles
    except json.JSONDecodeError as e:
        print(f"JSON decode error in Room 4: {e}")
        if 'response_text' in locals():
            print(f"Response was: {response_text[:500]}")
        return []
    except Exception as e:
        print(f"Error generating Room 4 puzzles: {e}")
        import traceback
        traceback.print_exc()
        return []


async def generate_room5_master(policy_data: dict, level: str) -> Dict:
    """Generate Room 5: Master multi-part puzzle"""
    definitions = policy_data.get("definitions", [])
    rules = policy_data.get("rules", [])
    exceptions = policy_data.get("exceptions", [])
    
    prompt = f"""Create a comprehensive multi-part compliance master puzzle for {level} level.

Policy Data:
Definitions: {json.dumps(definitions[:3], indent=2)}
Rules: {json.dumps(rules[:3], indent=2)}
Exceptions: {json.dumps(exceptions[:3], indent=2)}

Create ONE complex scenario that requires:
1. Matching a definition
2. Selecting the correct rule
3. Identifying the correct exception
4. Fixing a violation

Return JSON format:
{{
    "scenario": "complex multi-part scenario description",
    "definition_question": {{
        "term": "term to match",
        "definition": "correct definition",
        "wrong_options": ["wrong1", "wrong2", "wrong3"]
    }},
    "rule_question": {{
        "scenario": "scenario part for rule selection",
        "correct_rule": "correct rule",
        "wrong_rules": ["wrong rule 1", "wrong rule 2", "wrong rule 3"]
    }},
    "exception_question": {{
        "rule": "rule context",
        "scenario": "scenario part",
        "correct_exception": "correct exception",
        "wrong_exceptions": ["wrong1", "wrong2", "wrong3"]
    }},
    "violation_question": {{
        "scenario": "scenario part",
        "violation": "violation statement",
        "fix": "correct fix",
        "explanation": "explanation"
    }}
}}

Make it challenging for {level} level."""

    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert at creating complex multi-part compliance puzzles. Always return valid JSON."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model=MODEL_NAME,
            temperature=0.7,
            max_tokens=3000,
            response_format={"type": "json_object"}
        )
        
        response_text = chat_completion.choices[0].message.content
        data = json.loads(response_text)
        if not data:
            print("Warning: Groq returned empty puzzle for Room 5")
        return data
    except json.JSONDecodeError as e:
        print(f"JSON decode error in Room 5: {e}")
        if 'response_text' in locals():
            print(f"Response was: {response_text[:500]}")
        return {}
    except Exception as e:
        print(f"Error generating Room 5 puzzle: {e}")
        import traceback
        traceback.print_exc()
        return {}


async def generate_escape_rooms(policy_data: dict, level: str) -> Dict:
    """Generate all 5 rooms for an escape room"""
    rooms = {}
    
    try:
        # Normalize policy data structure
        # Policies are stored with fields at top level (definitions, rules, etc.)
        # But check for nested structuredData just in case
        if "structuredData" in policy_data and isinstance(policy_data.get("structuredData"), dict):
            actual_policy_data = policy_data.get("structuredData", {})
            print(f"Using structuredData from policy document")
        else:
            actual_policy_data = policy_data
            print(f"Using policy_data directly")
        
        print(f"Policy data keys: {list(actual_policy_data.keys())}")
        definitions = actual_policy_data.get('definitions', [])
        rules = actual_policy_data.get('rules', [])
        exceptions = actual_policy_data.get('exceptions', [])
        print(f"Definitions: {len(definitions)} items")
        print(f"Rules: {len(rules)} items")
        print(f"Exceptions: {len(exceptions)} items")
        
        # Generate each room with error handling
        print(f"Generating escape rooms for level: {level}")
        
        rooms["room1"] = await generate_room1_definitions(actual_policy_data, level)
        if not rooms["room1"] or len(rooms["room1"]) == 0:
            print("ERROR: Room 1 generated empty, creating fallback")
            # Always create fallback - use policy title or create generic puzzle
            policy_title = actual_policy_data.get("title", "Policy")
            rooms["room1"] = [{
                "term": policy_title,
                "definition": actual_policy_data.get("summary", "A policy definition") or "A policy definition",
                "wrong_options": [
                    "This is not the correct definition.",
                    "This definition does not match the term.",
                    "This is an incorrect explanation."
                ]
            }]
            print(f"Created fallback Room 1 puzzle with term: {policy_title}")
        
        rooms["room2"] = await generate_room2_exceptions(actual_policy_data, level)
        if not rooms["room2"] or len(rooms["room2"]) == 0:
            print("Warning: Room 2 generated empty, creating fallback")
            rooms["room2"] = [{"rule": "A policy rule", "scenario": "A scenario", "correct_exception": "Correct exception", "wrong_exceptions": ["Wrong 1", "Wrong 2", "Wrong 3"]}]
        
        rooms["room3"] = await generate_room3_rules(actual_policy_data, level)
        if not rooms["room3"] or len(rooms["room3"]) == 0:
            print("Warning: Room 3 generated empty, creating fallback")
            rooms["room3"] = [{"scenario": "A scenario", "correct_rule": "Correct rule", "wrong_rules": ["Wrong 1", "Wrong 2", "Wrong 3"]}]
        
        rooms["room4"] = await generate_room4_violations(actual_policy_data, level)
        if not rooms["room4"] or len(rooms["room4"]) == 0:
            print("Warning: Room 4 generated empty, creating fallback")
            rooms["room4"] = [{"scenario": "A scenario", "violation": "A violation", "fix": "The fix", "explanation": "Explanation"}]
        
        rooms["room5"] = await generate_room5_master(actual_policy_data, level)
        if not rooms["room5"]:
            print("Warning: Room 5 generated empty, creating fallback")
            rooms["room5"] = {
                "scenario": "A complex scenario",
                "definition_question": {"term": "Term", "definition": "Definition", "wrong_options": ["W1", "W2", "W3"]},
                "rule_question": {"scenario": "Scenario", "correct_rule": "Rule", "wrong_rules": ["W1", "W2", "W3"]},
                "exception_question": {"rule": "Rule", "scenario": "Scenario", "correct_exception": "Exception", "wrong_exceptions": ["W1", "W2", "W3"]},
                "violation_question": {"scenario": "Scenario", "violation": "Violation", "fix": "Fix", "explanation": "Explanation"}
            }
        
        print(f"Successfully generated all rooms")
        return rooms
    except Exception as e:
        print(f"Error in generate_escape_rooms: {e}")
        import traceback
        traceback.print_exc()
        raise

