import os
import re
import io
import wave
from typing import AsyncGenerator
from groq import AsyncGroq

try:
    from gnani.tts import GnaniTTSRealtimeClient, AudioConfig
    GNANI_AVAILABLE = True
except ImportError:
    GnaniTTSRealtimeClient = None # type: ignore
    AudioConfig = None # type: ignore
    GNANI_AVAILABLE = False

class VoiceManager:
    def __init__(self):
        self.api_key = os.environ.get("GNANI_API_KEY")
        if not self.api_key:
            print("WARNING: GNANI_API_KEY not set. Voice integration will fail.")
            
        self.tts_voice = "kaveri"

    async def transcribe_audio_stream(self, audio_chunk_generator: AsyncGenerator[bytes, None], language: str = "en-IN") -> str:
        """
        Gathers all PCM audio chunks, builds an in-memory WAV file,
        and sends it to Groq Whisper API for extremely fast transcription.
        """
        groq_api_key = os.environ.get("GROQ_API_KEY")
        if not groq_api_key:
            raise RuntimeError("GROQ_API_KEY not set. Cannot use STT.")

        pcm_data = bytearray()
        async for chunk in audio_chunk_generator:
            pcm_data.extend(chunk)

        if not pcm_data:
            return ""

        try:
            wav_io = io.BytesIO()
            with wave.open(wav_io, 'wb') as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2) # 16-bit PCM
                wav_file.setframerate(16000)
                wav_file.writeframes(pcm_data)
            
            wav_io.seek(0)
            
            whisper_lang = language.split('-')[0]
            
            client = AsyncGroq(api_key=groq_api_key)
            transcription = await client.audio.transcriptions.create(
                file=("audio.wav", wav_io.read()),
                model="whisper-large-v3",
                language=whisper_lang,
            )
            return transcription.text.strip()
            
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
                    
                    if any(p in sentence_buffer for p in ['.', '?', '!', '\n']):
                        clean_text = re.sub(r"<\s*emotion\s*>[a-z_\s]+<\s*/\s*emotion\s*>|<\s*(?!emotion\b)[a-z_]+\s*>", "", sentence_buffer, flags=re.IGNORECASE).strip()
                        if clean_text:
                            # Accumulate audio for the entire sentence to prevent popping from tiny websocket buffers
                            sentence_audio = bytearray()
                            async for audio_chunk in client.synthesize(clean_text, voice=tts_voice, model="timbre-v2.5", audio_config=audio_cfg):
                                sentence_audio.extend(audio_chunk)
                            if sentence_audio:
                                yield bytes(sentence_audio)
                        sentence_buffer = ""
                
                # Final flush
                if sentence_buffer.strip():
                    clean_text = re.sub(r"<\s*emotion\s*>[a-z_\s]+<\s*/\s*emotion\s*>|<\s*(?!emotion\b)[a-z_]+\s*>", "", sentence_buffer, flags=re.IGNORECASE).strip()
                    if clean_text:
                        sentence_audio = bytearray()
                        async for audio_chunk in client.synthesize(clean_text, voice=tts_voice, model="timbre-v2.5", audio_config=audio_cfg):
                            sentence_audio.extend(audio_chunk)
                        if sentence_audio:
                            yield bytes(sentence_audio)
                        
        except Exception as e:
            print(f"TTS Error: {e}")

voice_manager = VoiceManager()
