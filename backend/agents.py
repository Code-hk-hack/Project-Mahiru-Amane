import os
import json
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

# LangChain Imports
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage

class AnalystFeedback(BaseModel):
    passiveness_score: int = Field(..., description="Score from 0 to 10 on how passive the user's language is.")
    apology_count: int = Field(..., description="Number of unnecessary apologies.")
    hesitation_count: int = Field(..., description="Number of hesitation markers like 'um', 'uh', 'maybe'.")
    feedback_notes: str = Field(..., description="Structural feedback for the Coach to deliver.")

class AnalystAgent:
    @staticmethod
    def analyze(user_message: str) -> AnalystFeedback:
        """
        Analyzes the user's message for passive language and boundary setting using Gemini 1.5 Flash.
        """
        # Load HR rubrics (In a full production RAG, this would use LangChain's SupabaseVectorStore)
        hr_knowledge = "{}"
        try:
            with open("hr_knowledge_base.json", "r", encoding="utf-16") as f:
                hr_knowledge = f.read()
        except Exception:
            pass

        # Initialize Gemini via LangChain for heavy reasoning
        gemini_api_key = os.environ.get("GEMINI_API_KEY")
        llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash", 
            google_api_key=gemini_api_key,
            temperature=0.2
        )
        
        # Use LangChain's native Structured Output (much more reliable than raw JSON prompting)
        structured_llm = llm.with_structured_output(AnalystFeedback)

        system_prompt = (
            "You are an Analyst Agent for a social confidence and interview training simulator. "
            "Your job is to evaluate the user's input for passiveness, excessive apologies, and hesitation. "
            f"Base your evaluation strictly on the following HR Interview Guidelines and Rubrics: {hr_knowledge}. "
        )
        
        # Call Gemini
        result = structured_llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_message)
        ])
        
        return result

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

class CoachResponse(BaseModel):
    response: str = Field(..., description="The spoken dialogue of the coach.")
    emotion: str = Field(..., description="The emotion of the coach.")

class CoachAgent:
    @staticmethod
    async def respond(user_message: str, analyst_feedback: AnalystFeedback, difficulty: str = "neutral", session_id: str = None, character: str = "mahiru") -> tuple[str, str]:
        """
        Generates the Mahiru/Amane response incorporating the analyst feedback using Groq via LangChain.
        """
        db = get_db()
        
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
        messages = [SystemMessage(content=system_prompt)]
        
        # Fetch conversation history from Supabase
        if session_id and session_id != "default-session":
            try:
                history_res = db.table('messages').select('*').eq('session_id', session_id).order('created_at').limit(20).execute()
                for msg in history_res.data:
                    role = msg['role']
                    if role == 'user':
                        messages.append(HumanMessage(content=msg['content']))
                    elif role == 'coach':
                        messages.append(AIMessage(content=msg['content']))
            except Exception as e:
                print(f"Failed to fetch history: {e}")

        messages.append(HumanMessage(content=user_message))

        # Initialize Groq via LangChain for lightning-fast chat
        groq_api_key = os.environ.get("GROQ_API_KEY")
        MODEL = os.environ.get("MODEL_NAME", "llama-3.1-8b-instant")
        
        llm = ChatGroq(
            model=MODEL,
            api_key=groq_api_key,
            temperature=0.7
        )

        mcp_session = await get_mcp_session()
        raw_tools = []
        
        if mcp_session:
            try:
                mcp_tools = await mcp_session.list_tools()
                for t in mcp_tools.tools:
                    raw_tools.append({
                        "type": "function",
                        "function": {
                            "name": t.name,
                            "description": t.description,
                            "parameters": t.inputSchema
                        }
                    })
            except Exception as e:
                print(f"Failed to fetch tools from Slashy MCP: {e}")

        # Bind tools to LangChain LLM if available
        if raw_tools:
            llm = llm.bind_tools(raw_tools)
            
        # We enforce JSON output format
        llm = llm.bind(response_format={"type": "json_object"})

        for _ in range(5):
            response_message = llm.invoke(messages)
            messages.append(response_message)
            
            if not response_message.tool_calls:
                final_response = response_message.content or "{}"
                
                try:
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
                        db.table('messages').insert({
                            "session_id": session_id,
                            "role": "user",
                            "content": user_message,
                            "passiveness_score": analyst_feedback.passiveness_score,
                            "apology_count": analyst_feedback.apology_count,
                            "hesitation_count": analyst_feedback.hesitation_count,
                            "feedback_notes": analyst_feedback.feedback_notes
                        }).execute()
                        
                        db.table('messages').insert({
                            "session_id": session_id,
                            "role": "coach",
                            "content": coach_text
                        }).execute()
                    except Exception as e:
                        print(f"Failed to save messages to DB: {e}")

                return coach_text, emotion
            
            # Execute LangChain tool calls
            for tool_call in response_message.tool_calls:
                tool_name = tool_call["name"]
                tool_args = tool_call["args"]
                tool_id = tool_call["id"]
                
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
                
                messages.append(ToolMessage(
                    tool_call_id=tool_id,
                    name=tool_name,
                    content=tool_result_text
                ))
        
        return "I tried to fulfill your request but it took too many steps.", "sad"
