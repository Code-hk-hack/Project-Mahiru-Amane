import asyncio
import os
import time
from dotenv import load_dotenv
load_dotenv()
from gnani.tts import GnaniTTSRealtimeClient, AudioConfig

async def test_model(model_name):
    api_key = os.environ.get("GNANI_API_KEY")
    async with GnaniTTSRealtimeClient(api_key=api_key) as client:
        audio_cfg = AudioConfig(sample_rate=16000, encoding='linear_pcm', container='raw')
        try:
            print(f"Trying Kaveri with {model_name}...")
            start = time.time()
            first_chunk_time = None
            chunks = []
            async for chunk in client.synthesize("Hello world, this is a latency test.", voice="Kaveri", model=model_name, audio_config=audio_cfg):
                if first_chunk_time is None:
                    first_chunk_time = time.time() - start
                chunks.append(chunk)
            total_time = time.time() - start
            print(f"Model {model_name}: First chunk in {first_chunk_time:.3f}s, Total time {total_time:.3f}s, {len(chunks)} chunks")
        except Exception as e:
            print(f"Error with {model_name}: {e}")

async def main():
    await test_model("vachana-voice-v3")
    await test_model("timbre-v2.5")

asyncio.run(main())
