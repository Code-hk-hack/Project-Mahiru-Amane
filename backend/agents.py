import os
import json
from groq import Groq
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

# Groq configuration (Lightning Fast Inference)
api_key = os.environ.get("GROQ_API_KEY")

client = Groq(
    api_key=api_key or "MISSING_KEY",
)

# Using LLaMA 3.1 8B optimized for Groq LPUs
MODEL = os.environ.get("MODEL_NAME", "llama-3.1-8b-instant") 

class AnalystFeedback(BaseModel):
    passiveness_score: int = Field(..., description="Score from 0 to 10 on how passive the user's language is.")
    apology_count: int = Field(..., description="Number of unnecessary apologies.")
    hesitation_count: int = Field(..., description="Number of hesitation markers like 'um', 'uh', 'maybe'.")
    feedback_notes: str = Field(..., description="Structural feedback for the Coach to deliver.")

class AnalystAgent:
    @staticmethod
    def analyze(user_message: str) -> AnalystFeedback:
        """
        Analyzes the user's message for passive language and boundary setting.
        """
        # RAG (Retrieval-Augmented Generation) Integration
        # Load HR rubrics to ground the AI in actual interview practices
        hr_knowledge = "{}"
        try:
            with open("hr_knowledge_base.json", "r") as f:
                hr_knowledge = f.read()
        except Exception:
            pass

        system_prompt = (
            "You are an Analyst Agent for a social confidence and interview training simulator. "
            "Your job is to evaluate the user's input for passiveness, excessive apologies, and hesitation. "
            f"Base your evaluation strictly on the following HR Interview Guidelines and Rubrics: {hr_knowledge}. "
            "Return a strictly valid JSON object matching the requested schema. "
            "JSON Format: {\"passiveness_score\": int, \"apology_count\": int, \"hesitation_count\": int, \"feedback_notes\": \"string\"}"
        )
        
        completion = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            response_format={"type": "json_object"}
        )
        
        result_str = completion.choices[0].message.content
        data = json.loads(result_str)
        return AnalystFeedback(**data)

from mcp_client import get_mcp_session
from database import get_db

def ensure_session_exists(db, session_id: str):
    """Ensure the session (and a dummy user) exists to satisfy foreign key constraints."""
    try:
        # Check if session exists
        res = db.table('sessions').select('id').eq('id', session_id).execute()
        if not res.data:
            # Create a dummy user
            user_res = db.table('users').insert({"username": f"user_{session_id[:8]}"}).execute()
            user_id = user_res.data[0]['id']
            # Create session
            db.table('sessions').insert({"id": session_id, "user_id": user_id, "session_title": "Chat"}).execute()
    except Exception as e:
        print(f"Error ensuring session exists: {e}")

class CoachAgent:
    @staticmethod
    async def respond(user_message: str, analyst_feedback: AnalystFeedback, difficulty: str = "neutral", session_id: str = None, character: str = "mahiru") -> tuple[str, str]:
        """
        Generates the Mahiru/Amane response incorporating the analyst feedback, executing tools, and using conversation history.
        """
        db = get_db()
        
        # Ensure session exists if we have a session_id
        if session_id and session_id != "default-session":
            ensure_session_exists(db, session_id)
            
        if character.lower() == "amane":
            emotions_list = "impressed, impressed_starlted, sad, sad_notimpressed, shy, sleepy, small_smile, starlted, startled_happy_joy, happy"
            default_emotion = "happy"
        else:
            emotions_list = "waiting, waiting_2, happy, little_happy, very_happy, angry, concerned, sleepy, thinking"
            default_emotion = "waiting"
            
        system_prompt = f"""
You are the Coach Agent ({character.capitalize()}). You are a strict, no-nonsense mentor teaching social confidence.
The No-Escapism Mandate is active: Do NOT engage in romantic roleplay. Do NOT be a yes-man.
Current difficulty tier: {difficulty}. Adjust your personality (e.g., distracted, impatient, neutral) accordingly.

The Analyst Agent has provided this structural feedback on the user's last message:
- Passiveness: {analyst_feedback.passiveness_score}/10
- Apologies: {analyst_feedback.apology_count}
- Hesitations: {analyst_feedback.hesitation_count}
- Notes: {analyst_feedback.feedback_notes}

Address the user's message naturally in character, but weave in a harsh but constructive critique based on the Analyst's notes.
If you need to perform an action for the user (like sending an email or checking a calendar), you MUST use the provided tools.

CRITICAL INSTRUCTION: You MUST format your final response to the user as a valid JSON object with the following schema:
{{
  "response": "Your spoken dialogue here...",
  "emotion": "{default_emotion}" // Must be one of: {emotions_list}
}}
"""
        messages = [
            {"role": "system", "content": system_prompt}
        ]
        
        # Fetch conversation history from Supabase
        if session_id and session_id != "default-session":
            try:
                history_res = db.table('messages').select('*').eq('session_id', session_id).order('created_at').limit(20).execute()
                for msg in history_res.data:
                    role = msg['role']
                    # Map db roles to LLM roles
                    if role == 'user':
                        messages.append({"role": "user", "content": msg['content']})
                    elif role == 'coach':
                        messages.append({"role": "assistant", "content": msg['content']})
            except Exception as e:
                print(f"Failed to fetch history: {e}")

        # Append the new user message
        messages.append({"role": "user", "content": user_message})

        mcp_session = await get_mcp_session()
        groq_tools = []
        
        if mcp_session:
            try:
                mcp_tools = await mcp_session.list_tools()
                for t in mcp_tools.tools:
                    groq_tools.append({
                        "type": "function",
                        "function": {
                            "name": t.name,
                            "description": t.description,
                            "parameters": t.inputSchema
                        }
                    })
            except Exception as e:
                print(f"Failed to fetch tools from Slashy MCP: {e}")

        # Limit to 5 tool call iterations
        for _ in range(5):
            # Only pass tools argument if we actually have tools
            kwargs = {}
            if groq_tools:
                kwargs["tools"] = groq_tools

            completion = client.chat.completions.create(
                model=MODEL,
                messages=messages,
                response_format={"type": "json_object"},
                **kwargs
            )
            
            response_message = completion.choices[0].message
            messages.append(response_message)
            
            if not response_message.tool_calls:
                final_response = response_message.content or "{}"
                
                # Parse JSON for response and emotion
                try:
                    # Strip markdown code blocks if the LLM wrapped it
                    cleaned_response = final_response.strip()
                    if cleaned_response.startswith("```json"):
                        cleaned_response = cleaned_response[7:]
                    elif cleaned_response.startswith("```"):
                        cleaned_response = cleaned_response[3:]
                    if cleaned_response.endswith("```"):
                        cleaned_response = cleaned_response[:-3]
                    cleaned_response = cleaned_response.strip()

                    data = json.loads(cleaned_response)
                    coach_text = data.get("response", "...")
                    emotion = data.get("emotion", "neutral")
                except json.JSONDecodeError:
                    coach_text = final_response
                    emotion = "neutral"

                # Save to database
                if session_id and session_id != "default-session":
                    try:
                        # Save User Message
                        db.table('messages').insert({
                            "session_id": session_id,
                            "role": "user",
                            "content": user_message,
                            "passiveness_score": analyst_feedback.passiveness_score,
                            "apology_count": analyst_feedback.apology_count,
                            "hesitation_count": analyst_feedback.hesitation_count,
                            "feedback_notes": analyst_feedback.feedback_notes
                        }).execute()
                        
                        # Save Coach Response
                        db.table('messages').insert({
                            "session_id": session_id,
                            "role": "coach",
                            "content": coach_text
                        }).execute()
                    except Exception as e:
                        print(f"Failed to save messages to DB: {e}")

                return coach_text, emotion
            
            # Execute tool calls
            for tool_call in response_message.tool_calls:
                tool_name = tool_call.function.name
                tool_args = json.loads(tool_call.function.arguments)
                
                print(f"Executing tool {tool_name} with args {tool_args}...")
                tool_result_text = "Tool failed."
                
                if mcp_session:
                    try:
                        result = await mcp_session.call_tool(tool_name, tool_args)
                        tool_result_text = str(result.content)
                        print(f"Tool Result: {tool_result_text}")
                    except Exception as e:
                        tool_result_text = f"Error executing tool: {e}"
                        print(tool_result_text)
                
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "name": tool_name,
                    "content": tool_result_text
                })
        
        return "I tried to fulfill your request but it took too many steps.", "sad"
