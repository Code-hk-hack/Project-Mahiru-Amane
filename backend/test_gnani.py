import os
import asyncio
from dotenv import load_dotenv

load_dotenv()

async def test_gnani_tts():
    try:
        from gnani.tts import GnaniTTSRealtimeClient, AudioConfig
        api_key = os.environ.get("GNANI_API_KEY")
        print(f"Using API Key: {api_key[:10]}...")
        async with GnaniTTSRealtimeClient(api_key=api_key) as client:
            audio_cfg = AudioConfig(sample_rate=16000, encoding='linear_pcm', container='raw')
            print("Client initialized. Synthesizing...")
            chunks = []
            async for chunk in client.synthesize("Hello, this is a test.", voice="Kaveri", audio_config=audio_cfg):
                chunks.append(chunk)
            print(f"Successfully received {len(chunks)} audio chunks for Kaveri.")
            
            chunks = []
            async for chunk in client.synthesize("Hello, this is a test.", voice="Pranav", audio_config=audio_cfg):
                chunks.append(chunk)
            print(f"Successfully received {len(chunks)} audio chunks for Pranav.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_gnani_tts())
