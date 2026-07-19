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

try:
    from alchemyst_ai import AlchemystAI
    ALCHEMYST_AVAILABLE = True
except ImportError:
    ALCHEMYST_AVAILABLE = False

class AlchemystWrapper:
    def __init__(self):
        self.api_key = os.environ.get("ALCHEMYST_AI_API_KEY", "").strip()
        self.client = None
        if self.api_key and ALCHEMYST_AVAILABLE:
            try:
                self.client = AlchemystAI(api_key=self.api_key)
            except Exception as e:
                print(f"Failed to init Alchemyst client: {e}")

    def search(self, query: str, user_id: str):
        if not self.client:
            return []
        try:
            # Note: According to Alchemyst SDK docs, search returns a response object with matches or similar
            results = self.client.v1.context.search(
                query=query,
                similarity_threshold=0.6,
                scope="internal",
                body_metadata={
                    "group_name": [user_id]
                }
            )
            # Handle different possible return formats of the SDK
            if hasattr(results, 'data'):
                return [getattr(doc, 'content', str(doc)) for doc in results.data]
            elif isinstance(results, list):
                return [doc.get("content", str(doc)) if isinstance(doc, dict) else getattr(doc, 'content', str(doc)) for doc in results]
            elif hasattr(results, 'matches'):
                return [getattr(doc, 'content', str(doc)) for doc in results.matches]
            return [str(results)] # Fallback
        except Exception as e:
            print(f"Alchemyst search error: {e}")
            return []

    def add(self, messages: str, user_id: str):
        if not self.client:
            return
        try:
            self.client.v1.context.add(
                documents=[
                    {
                        "content": messages,
                        "metadata": {
                            "file_name": f"memory_{user_id}.txt",
                            "file_type": "text/plain"
                        }
                    }
                ],
                source="hackathon_simulator",
                context_type="conversation",
                scope="internal",
                metadata={
                    "group_name": [user_id]
                }
            )
        except Exception as e:
            print(f"Alchemyst add error: {e}")

alchemyst_client = AlchemystWrapper()

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
            api_key=SecretStr(groq_api_key) if groq_api_key is not None else None,
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

def ensure_session_exists(db, session_id: str, user_id: str = None):
    try:
        res = db.table('sessions').select('id').eq('id', session_id).execute()
        if not res.data:
            if not user_id:
                user_res = db.table('users').insert({"username": f"user_{session_id[:8]}"}).execute()
                if user_res.data:
                    user_id = user_res.data[0]['id']
            db.table('sessions').insert({"id": session_id, "user_id": user_id, "session_title": "Chat"}).execute()
    except Exception as e:
        print(f"Error ensuring session exists: {e}")

class CoachAgent:
    @staticmethod
    async def stream_respond(user_message: str, analyst_feedback: AnalystFeedback, difficulty: str = "neutral", session_id: str | None = None, user_id: str | None = None, character: str = "mahiru", language: str = "en-IN") -> AsyncGenerator[Dict[str, Any], None]:
        """
        Generates the Mahiru/Amane response incorporating the analyst feedback using an async generator for near-0 latency SSE streaming.
        Uses Groq as primary, Gemini as fallback.
        """
        db = get_db()
        
        # Ensure session exists in the database
        if session_id:
            ensure_session_exists(db, session_id, user_id)
            
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
            emotions_list = "impressed, impressed_startled, sad, sad_notimpressed, shy, sleepy, small_smile, startled, startled_happy_joy, happy"
            default_emotion = "happy"
        else:
            emotions_list = "waiting, waiting_2, happy, little_happy, very_happy, angry, concerned, sleepy, thinking"
            default_emotion = "waiting"

        mem0_context = ""
        if session_id and session_id != "default-session":
            try:
                # Use a global demo user ID so memories persist across frontend refreshes/sessions
                memories = alchemyst_client.search(user_message, user_id="hackathon_demo_user")
                if memories:
                    memory_texts = [m.get('memory', m.get('text', str(m))) for m in memories if isinstance(m, dict)]
                    if memory_texts:
                        mem0_context = "\n\nPast context about this user:\n- " + "\n- ".join(memory_texts)
            except Exception as e:
                print(f"Failed to retrieve Alchemyst memory: {e}")
            
        system_prompt = f"""
You are the Coach Agent ({character.capitalize()}). The user is currently speaking in {lang_name}. 
CRITICAL RULE: YOU MUST REPLY ENTIRELY IN {lang_name} using its native script (e.g., Devanagari for Hindi, Tamil script for Tamil). 
Do NOT use English words or Latin letters in your response! Translate everything to {lang_name}.
- Your character is {character.capitalize()}. Embody this persona fully.
- Keep responses short, concise, and highly conversational. Do not output markdown, bullet points, or lists. You are speaking verbally.
- The No-Escapism Mandate is active: Do NOT engage in romantic roleplay. Do NOT be a yes-man.
Current difficulty tier: {difficulty}. Adjust your personality (e.g., distracted, impatient, neutral) accordingly.
{mem0_context}

The Analyst Agent has provided this structural feedback on the user's last message:
- Passiveness: {analyst_feedback.passiveness_score}/10
- Apologies: {analyst_feedback.apology_count}
- Hesitations: {analyst_feedback.hesitation_count}
- Notes: {analyst_feedback.feedback_notes}

Address the user's message naturally in character, but weave in a harsh but constructive critique based on the Analyst's notes.
If you need to perform an action for the user (like sending an email or checking a calendar), you MUST use the provided tools. ONLY use tools if EXPLICITLY requested by the user. Do NOT hallucinate or volunteer tool usage.

CRITICAL INSTRUCTION: You must respond in plain text, speaking directly to the user.
IMPORTANT: Keep your response very brief (2 or 3 short sentences MAX).
AT THE VERY BEGINNING of your response, you must prepend an emotion tag like this: <emotion>happy</emotion>.
Valid emotions: {emotions_list}

FINAL WARNING: You MUST translate and output your entire response ONLY in {lang_name} using its native script! DO NOT reply in English.
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

        messages.append(HumanMessage(content=f"[System Reminder: The user is speaking {lang_name}. You MUST reply ONLY in {lang_name} script.]\n\nUser: {user_message}"))

        groq_api_key = os.environ.get("GROQ_API_KEY")
        gemini_api_key = os.environ.get("GEMINI_API_KEY")
        
        from pydantic import SecretStr
        # Primary LLM: Groq with 70b-versatile
        primary_llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=SecretStr(groq_api_key) if groq_api_key is not None else None,
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
                        # Match <emotion>angry</emotion> OR <angry>, but NOT <emotion>
                        emotion_match = re.search(r"<\s*emotion\s*>([a-z_\s]+)<\s*/\s*emotion\s*>|<\s*(?!emotion\b)([a-z_]+)\s*>", full_response_text, re.IGNORECASE)
                        if emotion_match:
                            emotion = (emotion_match.group(1) or emotion_match.group(2)).strip().lower()
                            emotion_extracted = True
                            yield {"type": "emotion", "emotion": emotion}
                            
                            # Clean the full response up to this point and yield
                            clean_text = re.sub(r"<\s*emotion\s*>[a-z_\s]+<\s*/\s*emotion\s*>|<\s*(?!emotion\b)[a-z_]+\s*>", "", full_response_text, flags=re.IGNORECASE).lstrip()
                            if clean_text:
                                yield {"type": "chunk", "content": clean_text}
                        else:
                            # Buffer until we are sure there's no tag or it's taking too long
                            if "<" not in full_response_text and len(full_response_text) > 15:
                                emotion_extracted = True
                                yield {"type": "chunk", "content": full_response_text}
                            elif len(full_response_text) > 60:
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
                
                # Execute tool calls
                messages.append(AIMessage(content="", tool_calls=reconstructed_tool_calls))
                for tc in reconstructed_tool_calls:
                    tool_result = "Tool execution failed."
                    if mcp_session:
                        try:
                            result = await mcp_session.call_tool(tc["name"], arguments=tc["args"])
                            if result.content and len(result.content) > 0:
                                tool_result = result.content[0].text
                        except Exception as e:
                            tool_result = f"Error: {e}"
                    messages.append(ToolMessage(tool_call_id=tc["id"], name=tc["name"], content=tool_result))
                
                # Continue loop to generate next response
                continue
            else:
                break
                
        if not full_response_text:
            yield {"type": "chunk", "content": "I don't have anything to add to that right now."}

        # Extract emotion from tags
        emotion_match = re.search(r"<\s*emotion\s*>([a-z_\s]+)<\s*/\s*emotion\s*>|<\s*([a-z_]+)\s*>", full_response_text, re.IGNORECASE)
        if emotion_match:
            emotion = (emotion_match.group(1) or emotion_match.group(2)).strip().lower()
            # Remove the tag from the final spoken text
            full_response_text = re.sub(r"<\s*emotion\s*>[a-z_\s]+<\s*/\s*emotion\s*>|<\s*[a-z_]+\s*>", "", full_response_text, flags=re.IGNORECASE).strip()

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
                
            try:
                mem0_summary = (
                    f"User message: '{user_message}'. "
                    f"Coach response: '{full_response_text}'. "
                    f"Analyst identified {analyst_feedback.apology_count} apologies, "
                    f"{analyst_feedback.hesitation_count} hesitations, "
                    f"and passiveness score {analyst_feedback.passiveness_score}/10."
                )
                alchemyst_client.add(mem0_summary, user_id="hackathon_demo_user")
            except Exception as e:
                print(f"Failed to store Alchemyst memory: {e}")

        # Send final metadata event (emotion and cleaned text)
        yield {"type": "done", "emotion": emotion}
