import os
import asyncio
from typing import AsyncGenerator

try:
    from gnani.stt import GnaniSTTStreamClient
    from gnani.tts import GnaniTTSRealtimeClient
    GNANI_AVAILABLE = True
except ImportError:
    GNANI_AVAILABLE = False

class VoiceManager:
    def __init__(self):
        self.api_key = os.environ.get("GNANI_API_KEY")
        if not self.api_key:
            print("WARNING: GNANI_API_KEY not set. Voice integration will fail.")
            
        # The frontend persona (Mahiru) usually maps to a female voice.
        # "Pranav" is male, let's use "Sia" or "Neha" if supported, but we will default to "Sia"
        # The docs state voice="Pranav" is an example. We can also pass "sia".
        self.tts_voice = "sia"

    async def transcribe_audio_stream(self, audio_chunk_generator: AsyncGenerator[bytes, None], language: str = "en-IN") -> str:
        """
        Receives an async generator yielding PCM audio chunks (16kHz) from the frontend,
        pipes them to Gnani STT, and returns the final transcript string.
        """
        if not GNANI_AVAILABLE or not self.api_key:
            raise RuntimeError("Gnani SDK not available or API Key missing")

        # Create STT client
        # GnaniSTTStreamClient doesn't require async context manager in standard usage based on docs,
        # but let's check its stream_and_collect method.
        client = GnaniSTTStreamClient(
            api_key=self.api_key,
            language=language,
            encoding="LINEAR16",
            sample_rate=16000
        )
        
        try:
            # We use stream_and_collect. Since realtime_pace=True is default, we can set it to False
            # because the frontend is already streaming it in realtime.
            transcripts = await client.stream_and_collect(
                audio_source=audio_chunk_generator,
                realtime_pace=False
            )
            
            # stream_and_collect returns list[StreamTranscriptEvent]
            # Each event has a .transcript property or similar.
            # Let's concatenate them.
            final_text = " ".join([t.transcript for t in transcripts if hasattr(t, 'transcript')])
            return final_text.strip()
            
        except Exception as e:
            print(f"STT Error: {e}")
            return ""

    async def synthesize_text_stream(self, text_chunk_generator: AsyncGenerator[str, None], character: str = "mahiru") -> AsyncGenerator[bytes, None]:
        """
        Takes an async generator yielding text chunks (from Groq LLM),
        pipes them into Gnani TTS, and yields PCM audio chunks (16kHz) to be sent to the frontend.
        """
        if not GNANI_AVAILABLE or not self.api_key:
            raise RuntimeError("Gnani SDK not available or API Key missing")
            
        # Select voice based on character
        tts_voice = "sia" if character.lower() == "mahiru" else "pranav"
            
        # GnaniTTSRealtimeClient is an async context manager
        try:
            async with GnaniTTSRealtimeClient(api_key=self.api_key) as client:
                sentence_buffer = ""
                
                async for text_chunk in text_chunk_generator:
                    sentence_buffer += text_chunk
                    
                    # Whenever we hit a logical sentence boundary, send it to TTS to minimize latency
                    # We can use simple punctuation checks.
                    if any(p in sentence_buffer for p in ['.', '?', '!', '\n']):
                        # We yield from the async generator returned by synthesize
                        async for audio_chunk in client.synthesize(sentence_buffer.strip(), voice=tts_voice):
                            yield audio_chunk
                        sentence_buffer = ""
                
                # Synthesize any remaining text
                if sentence_buffer.strip():
                    async for audio_chunk in client.synthesize(sentence_buffer.strip(), voice=tts_voice):
                        yield audio_chunk
                        
        except Exception as e:
            print(f"TTS Error: {e}")

voice_manager = VoiceManager()
