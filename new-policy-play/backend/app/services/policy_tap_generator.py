import os
import json
from groq import Groq
from dotenv import load_dotenv
from typing import List, Dict
from app.models.policy_tap_model import FallingBallQuestion

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY environment variable is required. Please set it in your .env file or environment.")
MODEL_NAME = "llama-3.3-70b-versatile"

groq_client = Groq(api_key=GROQ_API_KEY)


async def generate_falling_ball_questions(policy_data: dict, level: str, num_questions: int = 10) -> List[FallingBallQuestion]:
    """Generate questions for falling balls game using Groq API"""
    
    # Normalize policy data structure
    if "structuredData" in policy_data and isinstance(policy_data.get("structuredData"), dict):
        actual_policy_data = policy_data.get("structuredData", {})
    else:
        actual_policy_data = policy_data
    
    # Extract comprehensive policy content
    policy_title = actual_policy_data.get("title", "Policy Document")
    policy_summary = actual_policy_data.get("summary", "")
    rules = actual_policy_data.get("rules", []) or []
    definitions = actual_policy_data.get("definitions", []) or []
    exceptions = actual_policy_data.get("exceptions", []) or []
    clauses = actual_policy_data.get("clauses", []) or []
    policy_sections = actual_policy_data.get("policy_sections", []) or []
    risks = actual_policy_data.get("risks", []) or []
    raw_text = actual_policy_data.get("raw_text", "")
    
    # Determine number of wrong options based on level
    num_wrong_options = 2 if level == "beginner" else 3 if level == "intermediate" else 4
    
    # Build comprehensive policy context
    policy_context = f"""Policy Title: {policy_title}

Policy Summary: {policy_summary[:500] if policy_summary else "N/A"}

Policy Rules ({len(rules)} total):
{json.dumps(rules[:20], indent=2, ensure_ascii=False) if rules else "No rules available"}

Policy Definitions ({len(definitions)} total):
{json.dumps(definitions[:15], indent=2, ensure_ascii=False) if definitions else "No definitions available"}

Policy Clauses ({len(clauses)} total):
{json.dumps(clauses[:15], indent=2, ensure_ascii=False) if clauses else "No clauses available"}

Policy Exceptions ({len(exceptions)} total):
{json.dumps(exceptions[:10], indent=2, ensure_ascii=False) if exceptions else "No exceptions available"}

Policy Sections ({len(policy_sections)} total):
{json.dumps(policy_sections[:10], indent=2, ensure_ascii=False) if policy_sections else "No sections available"}
"""
    
    # Include raw text excerpt if available (first 2000 chars for context)
    if raw_text:
        policy_context += f"""

Full Policy Text Excerpt (for additional context):
{raw_text[:2000]}...
"""
    
    prompt = f"""You are an expert at creating educational policy compliance questions. Generate {num_questions} high-quality questions based on the following policy document.

{policy_context}

REQUIREMENTS:
1. Each question MUST be directly related to the actual policy content above
2. Questions should test understanding of rules, definitions, clauses, exceptions, or key policy concepts
3. The correct answer MUST be factually accurate based on the policy document
4. Wrong options should be plausible but clearly incorrect
5. Questions should be diverse - cover different aspects of the policy

Difficulty Level: {level}
- Beginner: Simple, direct questions with clear correct answers
- Intermediate: Moderate complexity requiring some policy knowledge
- Expert: Complex questions requiring deep understanding and application

Return ONLY a valid JSON object with this exact structure:
{{
  "questions": [
    {{
      "question": "A clear, specific question about the policy",
      "correct": "The accurate answer based on the policy",
      "wrongOptions": ["plausible wrong answer 1", "plausible wrong answer 2", "plausible wrong answer 3"]
    }}
  ]
}}

Generate exactly {num_questions} questions. Make sure each question is unique and directly relates to the policy content provided."""

    try:
        print(f"Generating {num_questions} questions for policy: {policy_title} (Level: {level})")
        print(f"Policy has {len(rules)} rules, {len(definitions)} definitions, {len(clauses)} clauses")
        
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert at creating educational policy compliance questions. Always return valid JSON objects with a 'questions' array. Each question must be directly based on the provided policy content."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model=MODEL_NAME,
            temperature=0.7,
            max_tokens=4000,
            response_format={"type": "json_object"}
        )
        
        response_text = chat_completion.choices[0].message.content
        print(f"Groq API response received: {len(response_text)} characters")
        
        data = json.loads(response_text)
        
        # Handle different response formats
        questions_data = []
        if isinstance(data, list):
            questions_data = data
        elif isinstance(data, dict):
            # Try common keys
            questions_data = data.get("questions", data.get("puzzles", data.get("items", [])))
            if not questions_data and "question" in data:
                # Single question object
                questions_data = [data]
        
        # Validate and convert to FallingBallQuestion objects
        questions = []
        for idx, q_data in enumerate(questions_data[:num_questions]):
            try:
                # Extract question data with multiple possible field names
                question_text = q_data.get("question", q_data.get("questionText", ""))
                correct_answer = q_data.get("correct", q_data.get("correctAnswer", q_data.get("correct_option", "")))
                wrong_opts = q_data.get("wrongOptions", q_data.get("wrong_options", q_data.get("wrongOptions", [])))
                
                # Ensure wrong_options is a list
                if not isinstance(wrong_opts, list):
                    wrong_opts = []
                
                # Validate required fields
                if not question_text or not correct_answer:
                    print(f"Skipping question {idx + 1}: Missing question or correct answer")
                    continue
                
                # Ensure we have enough wrong options
                while len(wrong_opts) < num_wrong_options:
                    wrong_opts.append(f"Wrong option {len(wrong_opts) + 1}")
                
                question = FallingBallQuestion(
                    question=question_text.strip(),
                    correct=correct_answer.strip(),
                    wrong_options=wrong_opts[:num_wrong_options]
                )
                
                # Additional validation
                if len(question.question) < 10:
                    print(f"Skipping question {idx + 1}: Question too short")
                    continue
                
                if len(question.correct) < 3:
                    print(f"Skipping question {idx + 1}: Correct answer too short")
                    continue
                
                questions.append(question)
                print(f"✓ Question {len(questions)}: {question.question[:50]}...")
                
            except Exception as e:
                print(f"Error parsing question {idx + 1}: {e}")
                import traceback
                traceback.print_exc()
                continue
        
        if len(questions) < num_questions:
            print(f"⚠ Warning: Only generated {len(questions)} valid questions, expected {num_questions}")
            
            # Try to create better fallback questions using actual policy content
            if rules:
                while len(questions) < num_questions:
                    rule_idx = len(questions) % len(rules)
                    rule = rules[rule_idx] if rule_idx < len(rules) else "policy compliance"
                    questions.append(FallingBallQuestion(
                        question=f"According to the {policy_title}, which statement is correct about: {rule[:100]}?",
                        correct=f"Correct answer based on {policy_title}",
                        wrong_options=[f"Incorrect option {i+1} about {rule[:50]}" for i in range(num_wrong_options)]
                    ))
            else:
                # Generic fallback if no rules available
                while len(questions) < num_questions:
                    questions.append(FallingBallQuestion(
                        question=f"Question {len(questions) + 1} about {policy_title}",
                        correct=f"Correct answer for {policy_title}",
                        wrong_options=[f"Wrong answer {i+1}" for i in range(num_wrong_options)]
                    ))
        
        print(f"✅ Successfully generated {len(questions)} Policy Tap questions for {policy_title}")
        return questions[:num_questions]
        
    except json.JSONDecodeError as e:
        print(f"JSON decode error in falling balls generator: {e}")
        if 'response_text' in locals():
            print(f"Response was: {response_text[:500]}")
        # Return fallback questions
        return _create_fallback_questions(policy_title, num_questions, num_wrong_options)
    except Exception as e:
        print(f"Error generating falling ball questions: {e}")
        import traceback
        traceback.print_exc()
        return _create_fallback_questions(policy_title, num_questions, num_wrong_options)


def _create_fallback_questions(policy_title: str, num_questions: int, num_wrong_options: int) -> List[FallingBallQuestion]:
    """Create fallback questions if Groq fails"""
    questions = []
    for i in range(num_questions):
        questions.append(FallingBallQuestion(
            question=f"Question {i + 1} about {policy_title}",
            correct="Correct answer option",
            wrong_options=[f"Wrong option {j + 1}" for j in range(num_wrong_options)]
        ))
    return questions

