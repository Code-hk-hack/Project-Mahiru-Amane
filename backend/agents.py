import os
import json
import re
from pydantic import BaseModel, Field
from typing import AsyncGenerator, Dict, Any
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

# Cache the knowledge base and MCP tools so we don't read them on every request
_hr_knowledge_cache = None
_mcp_raw_tools_cache = None

class AnalystAgent:
    @staticmethod
    def analyze(user_message: str) -> AnalystFeedback:
        """
        Analyzes the user's message for passive language and boundary setting using Groq for near-zero latency.
        """
        global _hr_knowledge_cache
        if _hr_knowledge_cache is None:
            try:
                with open("hr_knowledge_base.json", "r", encoding="utf-16") as f:
                    _hr_knowledge_cache = f.read()
            except Exception:
                _hr_knowledge_cache = "{}"

        # Initialize Groq for lightning-fast structured output
        from pydantic import SecretStr
        groq_api_key = os.environ.get("GROQ_API_KEY")
        primary_llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=SecretStr(groq_api_key) if groq_api_key else None,
            temperature=0.1
        )
        
        # Fallback to Gemini if Groq rate limits
        gemini_api_key = os.environ.get("GEMINI_API_KEY")
        fallback_llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash", 
            google_api_key=gemini_api_key,
            temperature=0.1
        )
        
        # Langchain fallback logic for structured output
        llm = primary_llm.with_fallbacks([fallback_llm])
        structured_llm = llm.with_structured_output(AnalystFeedback)

        system_prompt = (
            "You are an Analyst Agent for a social confidence and interview training simulator. "
            "Your job is to evaluate the user's input for passiveness, excessive apologies, and hesitation. "
            f"Base your evaluation strictly on the following HR Interview Guidelines and Rubrics: {_hr_knowledge_cache}. "
        )
        
        result = structured_llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_message)
        ])
        
        return result

from mcp_client import get_mcp_session
from database import get_db

def ensure_session_exists(db, session_id: str):
    try:
        res = db.table('sessions').select('id').eq('id', session_id).execute()
        if not res.data:
            user_res = db.table('users').insert({"username": f"user_{session_id[:8]}"}).execute()
            user_id = user_res.data[0]['id']
            db.table('sessions').insert({"id": session_id, "user_id": user_id, "session_title": "Chat"}).execute()
    except Exception as e:
        print(f"Error ensuring session exists: {e}")

class CoachAgent:
    @staticmethod
    async def stream_respond(user_message: str, analyst_feedback: AnalystFeedback, difficulty: str = "neutral", session_id: str | None = None, character: str = "mahiru", language: str = "en-IN") -> AsyncGenerator[Dict[str, Any], None]:
        """
        Generates the Mahiru/Amane response incorporating the analyst feedback using an async generator for near-0 latency SSE streaming.
        Uses Groq as primary, Gemini as fallback.
        """
        db = get_db()
        
        # Determine language name for prompt
        lang_map = {
            "en-IN": "English",
            "hi-IN": "Hindi",
            "ta-IN": "Tamil",
            "te-IN": "Telugu",
            "kn-IN": "Kannada",
            "ml-IN": "Malayalam",
            "mr-IN": "Marathi",
            "gu-IN": "Gujarati",
            "bn-IN": "Bengali",
            "pa-IN": "Punjabi"
        }
        lang_name = lang_map.get(language, "English")

        if session_id and session_id != "default-session":
            ensure_session_exists(db, session_id)
            
        if character.lower() == "amane":
            emotions_list = "impressed, impressed_starlted, sad, sad_notimpressed, shy, sleepy, small_smile, starlted, startled_happy_joy, happy"
            default_emotion = "happy"
        else:
            emotions_list = "waiting, waiting_2, happy, little_happy, very_happy, angry, concerned, sleepy, thinking"
            default_emotion = "waiting"
            
        system_prompt = f"""
You are the Coach Agent ({character.capitalize()}). The user is currently speaking in {lang_name}. YOU MUST REPLY ENTIRELY IN {lang_name}! 
- Your character is {character.capitalize()}. Embody this persona fully.
- Keep responses short, concise, and highly conversational. Do not output markdown, bullet points, or lists. You are speaking verbally.
- The No-Escapism Mandate is active: Do NOT engage in romantic roleplay. Do NOT be a yes-man.
Current difficulty tier: {difficulty}. Adjust your personality (e.g., distracted, impatient, neutral) accordingly.

The Analyst Agent has provided this structural feedback on the user's last message:
- Passiveness: {analyst_feedback.passiveness_score}/10
- Apologies: {analyst_feedback.apology_count}
- Hesitations: {analyst_feedback.hesitation_count}
- Notes: {analyst_feedback.feedback_notes}

Address the user's message naturally in character, but weave in a harsh but constructive critique based on the Analyst's notes.
If you need to perform an action for the user (like sending an email or checking a calendar), you MUST use the provided tools.

CRITICAL INSTRUCTION: You must respond in plain text, speaking directly to the user.
IMPORTANT: Keep your response very brief (2 or 3 short sentences MAX).
AT THE VERY BEGINNING of your response, you must prepend an emotion tag like this: <emotion>happy</emotion>.
Valid emotions: {emotions_list}
"""
        messages = [SystemMessage(content=system_prompt)]
        
        # Fetch conversation history from Supabase
        if session_id and session_id != "default-session":
            try:
                history_res = db.table('messages').select('*').eq('session_id', session_id).order('created_at').limit(20).execute()
                for msg in history_res.data or []:
                    if not isinstance(msg, dict):
                        continue
                    role = msg.get('role')
                    if role == 'user':
                        messages.append(HumanMessage(content=msg.get('content', '')))
                    elif role == 'coach':
                        messages.append(AIMessage(content=msg.get('content', '')))
            except Exception as e:
                print(f"Failed to fetch history: {e}")

        messages.append(HumanMessage(content=user_message))

        groq_api_key = os.environ.get("GROQ_API_KEY")
        gemini_api_key = os.environ.get("GEMINI_API_KEY")
        
        from pydantic import SecretStr
        # Primary LLM: Groq with 70b-versatile
        primary_llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=SecretStr(groq_api_key) if groq_api_key else None,
            temperature=0.7
        )
        
        # Fallback LLM: Gemini 1.5 Flash
        fallback_llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=gemini_api_key,
            temperature=0.7
        )
        
        # LangChain fallback logic
        llm = primary_llm.with_fallbacks([fallback_llm])

        # Cache MCP tools globally to avoid 1-2s latency per request
        global _mcp_raw_tools_cache
        if _mcp_raw_tools_cache is None:
            mcp_session = await get_mcp_session()
            _mcp_raw_tools_cache = []
            if mcp_session:
                try:
                    mcp_tools = await mcp_session.list_tools()
                    for t in mcp_tools.tools:
                        _mcp_raw_tools_cache.append({
                            "type": "function",
                            "function": {
                                "name": t.name,
                                "description": t.description,
                                "parameters": t.inputSchema
                            }
                        })
                except Exception as e:
                    print(f"Failed to fetch tools from Slashy MCP: {e}")
        
        raw_tools = _mcp_raw_tools_cache

        # Currently for streaming with fallbacks, tool calling can be complex. 
        # If we need tools, we'd bind them. We will bind them to both models.
        if raw_tools:
            primary_llm = primary_llm.bind_tools(raw_tools)
            fallback_llm = fallback_llm.bind_tools(raw_tools)
            llm = primary_llm.with_fallbacks([fallback_llm])
            
        full_response_text = ""
        emotion = default_emotion
        emotion_extracted = False

        # Loop for tool calls (up to 3 iterations for latency)
        for _ in range(3):
            # Stream the response chunk by chunk
            tool_calls_accumulator = {}
            has_tool_calls = False
            
            async for chunk in llm.astream(messages):
                # If there's text, yield it to the frontend via SSE
                if chunk.content:
                    full_response_text += chunk.content
                    
                    if not emotion_extracted:
                        emotion_match = re.search(r"<emotion>([a-z_]+)</emotion>|<([a-z_]+)>", full_response_text, re.IGNORECASE)
                        if emotion_match:
                            emotion = (emotion_match.group(1) or emotion_match.group(2)).strip().lower()
                            emotion_extracted = True
                            yield {"type": "emotion", "emotion": emotion}
                            
                            match_end = emotion_match.end()
                            text_to_yield = full_response_text[match_end:]
                            if text_to_yield:
                                yield {"type": "chunk", "content": text_to_yield}
                        else:
                            if not full_response_text.strip().startswith("<"):
                                emotion_extracted = True
                                yield {"type": "chunk", "content": full_response_text}
                    else:
                        yield {"type": "chunk", "content": chunk.content}
                
                # Accumulate tool calls if the model decides to use them
                if chunk.tool_call_chunks:
                    has_tool_calls = True
                    for tc_chunk in chunk.tool_call_chunks:
                        idx = tc_chunk["index"]
                        if idx not in tool_calls_accumulator:
                            tool_calls_accumulator[idx] = tc_chunk
                        else:
                            if tc_chunk.get("args"):
                                tool_calls_accumulator[idx]["args"] += tc_chunk["args"]
            
            # Reconstruct tool calls if any
            if has_tool_calls:
                reconstructed_tool_calls = []
                for idx, tc in tool_calls_accumulator.items():
                    reconstructed_tool_calls.append({
                        "name": tc["name"],
                        "args": json.loads(tc["args"]),
                        "id": tc["id"]
                    })
                
                # Add AIMessage with tool calls
                messages.append(AIMessage(content="", tool_calls=reconstructed_tool_calls))
                
                # Execute tools
                for tc in reconstructed_tool_calls:
                    tool_name = tc["name"]
                    tool_args = tc["args"]
                    tool_id = tc["id"]
                    
                    tool_result_text = "Tool failed."
                    if mcp_session:
                        try:
                            result = await mcp_session.call_tool(tool_name, tool_args)
                            tool_result_text = str(result.content)
                        except Exception as e:
                            tool_result_text = f"Error: {e}"
                            
                    messages.append(ToolMessage(tool_call_id=tool_id, name=tool_name, content=tool_result_text))
                
                # Continue loop to stream the final response after tool execution
                continue
            
            # If no tool calls, we are done streaming text. Break out of loop.
            break

        # Extract emotion from tags
        emotion_match = re.search(r"<emotion>([a-z_]+)</emotion>|<([a-z_]+)>", full_response_text, re.IGNORECASE)
        if emotion_match:
            emotion = (emotion_match.group(1) or emotion_match.group(2)).strip().lower()
            # Remove the tag from the final spoken text
            full_response_text = re.sub(r"<emotion>[a-z_]+</emotion>|<[a-z_]+>", "", full_response_text, flags=re.IGNORECASE).strip()

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
                    "content": full_response_text
                }).execute()
            except Exception as e:
                print(f"Failed to save messages to DB: {e}")

        # Send final metadata event (emotion and cleaned text)
        yield {"type": "done", "emotion": emotion}
