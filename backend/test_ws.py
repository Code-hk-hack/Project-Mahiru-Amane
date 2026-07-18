import asyncio
import websockets
import json

async def test():
    uri = "ws://localhost:8000/ws/voice-chat"
    async with websockets.connect(uri) as websocket:
        # Send audio start message by sending empty bytes
        await websocket.send(b"")
        
        # Give it a tiny bit of time
        await asyncio.sleep(0.1)
        
        # Send stop speaking
        await websocket.send(json.dumps({"type": "stop_speaking"}))
        
        # Now wait for the server to transcribe (which will fail with empty audio, and send turn_complete)
        print("Sent audio start and stop. Waiting for responses...")
        while True:
            try:
                response = await websocket.recv()
                if isinstance(response, str):
                    data = json.loads(response)
                    print(f"Received JSON: {data.get('type')}")
                    if data.get('type') == 'turn_complete':
                        print("RECEIVED TURN_COMPLETE!")
                        break
                else:
                    print(f"Received {len(response)} bytes of audio")
            except Exception as e:
                print(f"Error: {e}")
                break

asyncio.run(test())
