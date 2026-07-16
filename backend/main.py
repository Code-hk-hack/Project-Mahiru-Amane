from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from database import get_db
from agents import AnalystAgent, CoachAgent, AnalystFeedback
from mcp_client import init_mcp_client, close_mcp_client
from voice import voice_manager
from fastapi import WebSocket, WebSocketDisconnect

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_mcp_client()
    yield
    await close_mcp_client()

app = FastAPI(title="Project Mahiru/Amane Engine", lifespan=lifespan)

# Add CORS middleware so the Next.js frontend can communicate with it
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, this should be restricted
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    difficulty: str = "neutral"
    session_id: str = "default-session"
    character: str = "mahiru"
    language: str = "en-IN"

class ChatResponse(BaseModel):
    coach_response: str
    feedback: AnalystFeedback
    emotion: str = "neutral"

@app.get("/")
def read_root():
    return {"message": "Welcome to Project Mahiru/Amane Coach Engine"}

@app.get("/health")
def health_check():
    try:
        db = get_db()
        return {"status": "ok", "db_client": "initialized"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from fastapi.responses import StreamingResponse
import json

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    # Step 1: Analyst scores the user's message (this happens instantly)
    try:
        feedback = AnalystAgent.analyze(request.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Step 2: Stream the Coach response
    async def event_generator():
        # First yield the analyst feedback so the UI can update it immediately
        yield f"data: {json.dumps({'type': 'feedback', 'feedback': feedback.model_dump()})}\n\n"
        
        # Then yield the streamed coach response
        try:
            async for item in CoachAgent.stream_respond(request.message, feedback, request.difficulty, request.session_id, request.character, request.language):
                yield f"data: {json.dumps(item)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.websocket("/ws/voice-chat")
async def websocket_voice_chat(
    websocket: WebSocket,
    session_id: str = "default-session",
    difficulty: str = "neutral",
    character: str = "mahiru",
    language: str = "en-IN"
):
    await websocket.accept()

    try:
        while True:
            # 1. Generator to read audio chunks from frontend until "stop" message
            async def receive_audio():
                while True:
                    message = await websocket.receive()
                    if "bytes" in message:
                        yield message["bytes"]
                    elif "text" in message:
                        data = json.loads(message["text"])
                        if data.get("type") == "stop_speaking":
                            break

            # 2. Transcribe incoming audio (blocks until receive_audio completes)
            transcript = await voice_manager.transcribe_audio_stream(receive_audio(), language=language)
            
            if not transcript:
                # If no audio or empty transcript, wait for next cycle
                continue
                
            # Send the recognized text back to UI
            await websocket.send_json({"type": "transcript", "text": transcript})
            
            # 3. Analyze text
            feedback = AnalystAgent.analyze(transcript)
            await websocket.send_json({"type": "feedback", "feedback": feedback.model_dump()})
            
            # 4. Stream LLM response & TTS
            async def text_generator():
                async for item in CoachAgent.stream_respond(transcript, feedback, difficulty, session_id, character, language):
                    if item["type"] == "chunk":
                        # Send text to frontend for UI update
                        await websocket.send_json(item)
                        # Yield text to TTS
                        yield item["content"]
                    elif item["type"] == "done":
                        await websocket.send_json(item)

            # Synthesize audio and send it over WebSocket as binary frames
            async for audio_chunk in voice_manager.synthesize_text_stream(text_generator(), character=character):
                await websocket.send_bytes(audio_chunk)

            # Signal that the turn is complete
            await websocket.send_json({"type": "turn_complete"})

    except WebSocketDisconnect:
        print(f"WebSocket disconnected for session: {session_id}")
    except Exception as e:
        print(f"WebSocket error: {e}")
        try:
            await websocket.send_json({"type": "error", "content": str(e)})
        except:
            pass

@app.get("/chat/history")
def get_chat_history(session_id: str):
    try:
        db = get_db()
        # Fetch conversation history from Supabase
        history_res = db.table('messages').select('*').eq('session_id', session_id).order('created_at').execute()
        
        formatted_messages = []
        for msg in history_res.data:
            formatted_msg = {
                "role": msg['role'],
                "content": msg['content']
            }
            if msg['role'] == 'user' and msg.get('passiveness_score') is not None:
                formatted_msg["feedback"] = {
                    "passiveness_score": msg.get('passiveness_score'),
                    "apology_count": msg.get('apology_count'),
                    "hesitation_count": msg.get('hesitation_count'),
                    "feedback_notes": msg.get('feedback_notes')
                }
            formatted_messages.append(formatted_msg)
            
        return {"messages": formatted_messages}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
