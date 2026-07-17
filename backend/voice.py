import os
import asyncio
import re
from typing import AsyncGenerator

try:
    from gnani.stt import GnaniSTTStreamClient
    from gnani.tts import GnaniTTSRealtimeClient, AudioConfig
    GNANI_AVAILABLE = True
except ImportError:
    GnaniSTTStreamClient = None # type: ignore
    GnaniTTSRealtimeClient = None # type: ignore
    AudioConfig = None # type: ignore
    GNANI_AVAILABLE = False

class VoiceManager:
    def __init__(self):
        self.api_key = os.environ.get("GNANI_API_KEY")
        if not self.api_key:
            print("WARNING: GNANI_API_KEY not set. Voice integration will fail.")
            
        # The frontend persona (Mahiru) usually maps to a female voice.
        # "Pranav" is male, let's use "Sia" or "Neha" if supported, but we will default to "Sia"
        # The docs state voice="Pranav" is an example. We can also pass "sia".
        self.tts_voice = "kaveri"

    async def transcribe_audio_stream(self, audio_chunk_generator: AsyncGenerator[bytes, None], language: str = "en-IN") -> str:
        """
        Receives an async generator yielding PCM audio chunks (16kHz) from the frontend,
        pipes them to Gnani STT, and returns the final transcript string.
        """
        if not GNANI_AVAILABLE or not self.api_key:
            raise RuntimeError("Gnani SDK not available or API Key missing")

        try:
            # We use stream_audio. Since realtime_pace=True is default, we can set it to False
            # because the frontend is already streaming it in realtime.
            async with GnaniSTTStreamClient(
                api_key=self.api_key,
                language_code=language,
                sample_rate=16000
            ) as client:
                transcripts = await client.stream_audio(
                    audio_source=audio_chunk_generator,
                    realtime_pace=False
                )
            
            # stream_audio returns list[StreamTranscriptEvent]
            # Each event has a .text property.
            # Let's concatenate them.
            final_text = " ".join([t.text for t in transcripts if hasattr(t, 'text')])
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
        tts_voice = "Kaveri" if character.lower() == "mahiru" else "Pranav"
            
        # GnaniTTSRealtimeClient is an async context manager
        try:
            async with GnaniTTSRealtimeClient(api_key=self.api_key) as client:
                audio_cfg = AudioConfig(sample_rate=16000, encoding='linear_pcm', container='raw')
                sentence_buffer = ""
                
                async for text_chunk in text_chunk_generator:
                    sentence_buffer += text_chunk
                    
                    # If the start of the emotion tag appears, we can process everything before it 
                    # and ignore the rest for TTS, since it's at the very end of the LLM response.
                    if "<emotion" in sentence_buffer.lower():
                        parts = re.split(r'<emotion', sentence_buffer, flags=re.IGNORECASE)
                        clean_text = parts[0]
                        if clean_text.strip():
                            async for audio_chunk in client.synthesize(clean_text.strip(), voice=tts_voice, model="timbre-v2.5", audio_config=audio_cfg):
                                yield audio_chunk
                        sentence_buffer = ""
                        break # Stop TTS processing for the rest of the stream since it's just the tag
                    
                    # Whenever we hit a logical sentence boundary, send it to TTS to minimize latency
                    # We can use simple punctuation checks.
                    if any(p in sentence_buffer for p in ['.', '?', '!', '\n']):
                        if sentence_buffer.strip():
                            async for audio_chunk in client.synthesize(sentence_buffer.strip(), voice=tts_voice, model="timbre-v2.5", audio_config=audio_cfg):
                                yield audio_chunk
                        sentence_buffer = ""
                
                # Synthesize any remaining text
                if sentence_buffer.strip():
                    # Just in case there is a malformed tag at the end
                    clean_text = re.sub(r'<emotion.*', '', sentence_buffer, flags=re.IGNORECASE)
                    if clean_text.strip():
                        async for audio_chunk in client.synthesize(clean_text.strip(), voice=tts_voice, model="timbre-v2.5", audio_config=audio_cfg):
                            yield audio_chunk
                        
        except Exception as e:
            print(f"TTS Error: {e}")

voice_manager = VoiceManager()
