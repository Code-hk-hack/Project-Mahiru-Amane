import asyncio
import websockets
import uuid
import json

async def test_ws():
    uri = "ws://localhost:8000/ws/voice-chat?session_id=" + str(uuid.uuid4()) + "&character=mahiru&difficulty=hard&language=en-IN"
    async with websockets.connect(uri) as ws:
        print("Connected!")
        # Send a tiny binary frame to simulate audio
        await ws.send(b"\x00" * 4096)
        print("Sent binary frame.")
        
        # Send stop speaking
        await ws.send(json.dumps({"type": "stop_speaking"}))
        print("Sent stop speaking.")
        
        # Wait for responses
        try:
            while True:
                resp = await asyncio.wait_for(ws.recv(), timeout=5.0)
                print("Received:", resp[:200]) # Print first 200 chars
        except asyncio.TimeoutError:
            print("Done waiting.")

if __name__ == "__main__":
    asyncio.run(test_ws())
