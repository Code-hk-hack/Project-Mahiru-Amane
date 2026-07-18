import asyncio, websockets

async def test():
    for _ in range(5):
        try:
            async with websockets.connect('ws://127.0.0.1:8000/ws/voice-chat?session_id=test&character=mahiru&difficulty=hard&language=en-IN') as ws:
                print('Connected')
                await ws.send('{"type": "text_input", "text": "hello"}')
                res = await ws.recv()
                print('Received:', res[:50])
        except Exception as e:
            print('Error:', e)

asyncio.run(test())
