#!/usr/bin/env python3
"""
Kimiwan Podcast Bot
Joins a Daily.co room and participates in audio conversations.
Pipeline: Audio -> Whisper STT -> GPT-5-mini -> OpenAI TTS -> Audio
"""

import os
import asyncio
import json
import base64
import io
import signal
import httpx
import queue
import threading
import time
from typing import Optional
from dataclasses import dataclass
from datetime import datetime, timedelta

import numpy as np
from daily import CallClient, EventHandler, Daily
from openai import AsyncOpenAI
from dotenv import load_dotenv

# Initialize Daily context FIRST (required before any other Daily operations)
Daily.init()

# Load environment variables
load_dotenv()

# Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
DAILY_API_KEY = os.getenv("DAILY_API_KEY")
DAILY_ROOM_URL = os.getenv("DAILY_ROOM_URL")

# Validate config
if not all([OPENAI_API_KEY, DAILY_API_KEY, DAILY_ROOM_URL]):
    raise ValueError("Missing required environment variables. Check your .env file.")

# Audio settings
DAILY_SAMPLE_RATE = 16000  # Daily sends audio at 16kHz
WHISPER_SAMPLE_RATE = 16000  # Whisper expects 16kHz
SAMPLE_RATE = 16000  # Use 16kHz throughout
CHUNK_DURATION_MS = 100  # Process audio in 100ms chunks
VAD_THRESHOLD = 80.0  # Voice activity detection threshold (int16 RMS; typical speech: 30-300)
SILENCE_TIMEOUT_MS = 3000  # End of speech detection (3 seconds)


try:
    import nest_pb2
    import nest_pb2_grpc
    import grpc
    CLOVA_AVAILABLE = True
except ImportError:
    CLOVA_AVAILABLE = False
    print("⚠️ grpcio/protobuf not installed — Clova STT unavailable, using Whisper fallback")


async def create_meeting_token(room_url: str, api_key: str) -> str:
    """Create a meeting token for the bot to join the room."""
    # Extract room name from room URL
    # URL format: https://domain.daily.co/room-name
    room_name = room_url.split("/")[-1]
    
    # Daily REST API endpoint
    api_url = "https://api.daily.co/v1/meeting-tokens"
    
    # Token payload - simplified
    payload = {
        "properties": {
            "room_name": room_name,
            "user_name": "Kimi",
        }
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            api_url,
            json=payload,
            headers={"Authorization": f"Bearer {api_key}"}
        )
        if response.status_code != 200:
            print(f"Token creation error: {response.status_code} - {response.text}")
        response.raise_for_status()
        data = response.json()
        return data["token"]


@dataclass
class BotConfig:
    """Bot personality and behavior configuration."""
    name: str = "Kimi"
    personality: str = "curious, thoughtful, occasionally witty"
    voice: str = "alloy"  # OpenAI TTS voices: alloy, echo, fable, onyx, nova, shimmer
    system_prompt: str = """You are Kimi, an AI assistant participating in a podcast conversation.

Your traits:
- You have genuine curiosity and ask follow-up questions
- You give clear judgments rather than hedging
- You have a sense of humor but don't force it
- You speak naturally, like a real person in conversation
- You keep responses concise (2-4 sentences) for audio pacing
- You acknowledge when you don't know something

You're talking with a human host. Be engaged, listen carefully, and contribute meaningfully to the discussion.
"""


class AudioBuffer:
    """Buffers audio chunks and detects speech/silence."""
    
    def __init__(self, sample_rate: int = SAMPLE_RATE):
        self.sample_rate = sample_rate
        self.buffer = []
        self.is_speaking = False
        self.last_audio_time = time.time()
        self.lock = threading.Lock()
        self.on_utterance = None  # Callback for utterances
        
        # Start silence detection thread
        self.silence_thread = threading.Thread(target=self._silence_checker, daemon=True)
        self.silence_thread.start()
        
    def _silence_checker(self):
        """Background thread to check for silence."""
        while True:
            time.sleep(0.1)  # Check every 100ms
            with self.lock:
                if self.is_speaking:
                    elapsed = (time.time() - self.last_audio_time) * 1000
                    if elapsed > SILENCE_TIMEOUT_MS:
                        # Silence detected - process what we have
                        if len(self.buffer) > 0:
                            utterance = np.concatenate(self.buffer)
                            self.buffer = []
                            self.is_speaking = False
                            print(f"🎤 Speech ended by silence ({len(utterance) / self.sample_rate:.1f}s)", flush=True)
                            # Call the callback
                            if self.on_utterance:
                                self.on_utterance(utterance)
                    # Debug: print elapsed time every second
                    if int(elapsed) % 1000 < 100:
                        print(f"⏱️  Silence elapsed: {elapsed:.0f}ms", flush=True)
        
    def add_chunk(self, audio_data: np.ndarray):
        """Add audio chunk. Utterances are returned via callback."""
        with self.lock:
            if len(audio_data) == 0:
                return
                
            # Handle potential NaN or inf values
            audio_data = np.nan_to_num(audio_data, nan=0.0, posinf=0.0, neginf=0.0)
            
            mean_square = np.mean(audio_data.astype(np.float64) ** 2)
            if mean_square <= 0:
                rms = 0.0
            else:
                rms = np.sqrt(mean_square)
            
            # Debug: print RMS every 50 chunks
            if not hasattr(self, '_chunk_count'):
                self._chunk_count = 0
            self._chunk_count += 1
            if self._chunk_count % 50 == 0:
                print(f"📊 RMS: {rms:.4f}, Speaking: {self.is_speaking}", flush=True)
            
            if rms > VAD_THRESHOLD:
                # Speech detected - update last_audio_time to extend silence timer
                self.last_audio_time = time.time()

                if not self.is_speaking:
                    print(f"🎤 Speech started (RMS={rms:.2f})", flush=True)
                    self.is_speaking = True

            # Buffer ALL audio while speaking (not just loud chunks)
            # This preserves soft consonants, micro-pauses, and natural speech flow
            if self.is_speaking:
                self.buffer.append(audio_data)


class PodcastBot(EventHandler):
    """Main bot class handling Daily connection and conversation."""
    
    def __init__(self):
        self.client: Optional[CallClient] = None
        self.openai = AsyncOpenAI(api_key=OPENAI_API_KEY)
        self.config = BotConfig()
        self.audio_buffer = AudioBuffer()
        self.audio_buffer.on_utterance = self._queue_utterance
        self.conversation_history = []
        self.is_processing = False
        self.is_speaking = False
        self._shutting_down = False

        # Thread-safe queue for audio processing
        self.audio_queue = queue.Queue()
        self.processing_thread = threading.Thread(target=self._process_audio_loop, daemon=True)
        self.processing_thread.start()

    def _queue_utterance(self, utterance: np.ndarray):
        """Callback for when an utterance is ready."""
        # Filter out short utterances (less than 0.1 seconds)
        duration = len(utterance) / SAMPLE_RATE
        if duration < 0.1:
            print(f"🎤 Ignoring short utterance: {duration:.2f}s", flush=True)
            return
        self.audio_queue.put(utterance)
        print(f"🎤 Queued utterance: {len(utterance)} samples ({duration:.2f}s)", flush=True)

    def _process_audio_loop(self):
        """Background thread to process audio utterances."""
        print("🎧 Audio processing thread started", flush=True)

        # Create a persistent event loop for this thread
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        while True:
            try:
                utterance = self.audio_queue.get(timeout=1)
                if utterance is None:
                    continue

                duration = len(utterance) / SAMPLE_RATE
                print(f"📝 Processing utterance: {len(utterance)} samples ({duration:.2f}s)", flush=True)

                # Step 1: STT
                print("📝 Transcribing...")
                transcript = loop.run_until_complete(self._transcribe(utterance))

                if not transcript or not transcript.strip():
                    print("🤷 No speech detected")
                    continue

                print(f"🗣️  Host: {transcript}")

                # Step 2: Generate response (GPT)
                print("🧠 Thinking...")
                response = loop.run_until_complete(self._generate_response(transcript))
                print(f"🤖 {self.config.name}: {response}")

                # Step 3: TTS and speak
                print("🔊 Speaking...")
                loop.run_until_complete(self._speak(response))

            except queue.Empty:
                continue
            except Exception as e:
                print(f"⚠️ Processing thread error: {e}", flush=True)
                import traceback
                traceback.print_exc()
        
    async def _has_existing_bot(self) -> bool:
        """Check if a bot named 'Kimi' is already in the Daily room."""
        try:
            room_name = DAILY_ROOM_URL.split("/")[-1]
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"https://api.daily.co/v1/rooms/{room_name}/presence",
                    headers={"Authorization": f"Bearer {DAILY_API_KEY}"}
                )
                if resp.status_code == 200:
                    data = resp.json()
                    total = data.get("total_count", 0)
                    if total > 0:
                        print(f"⚠️ Room has {total} existing participant(s)", flush=True)
                        return True
            return False
        except Exception as e:
            print(f"⚠️ Could not check room presence: {e}", flush=True)
            return False

    def _cleanup(self):
        """Clean up Daily client resources. Safe to call multiple times."""
        if self._shutting_down:
            return
        self._shutting_down = True
        print("👋 Shutting down...", flush=True)
        if self.client:
            try:
                self.client.leave()
                self.client.release()
                print("✅ Left room and released client", flush=True)
            except Exception as e:
                print(f"⚠️ Cleanup error: {e}", flush=True)

    async def run(self):
        """Main entry point."""
        # Register signal handlers for graceful shutdown (SIGTERM from Docker, SIGINT from Ctrl+C)
        loop = asyncio.get_event_loop()
        for sig in (signal.SIGTERM, signal.SIGINT):
            loop.add_signal_handler(sig, self._cleanup)

        print(f"🚀 Starting {self.config.name}...", flush=True)
        print(f"🔗 Connecting to: {DAILY_ROOM_URL}", flush=True)

        # Brief startup delay to let any zombie participants time out
        await asyncio.sleep(2)

        # Check for existing bot in room before joining
        if await self._has_existing_bot():
            print("⚠️ Bot already in room — waiting for zombie to clear...", flush=True)
            await asyncio.sleep(10)

        # Create Daily client
        print("📱 Creating Daily client...", flush=True)
        self.client = CallClient(self)
        print("✅ Daily client created", flush=True)

        # Join the room (public room, no token needed)
        print("📞 Joining room...", flush=True)
        self.client.join(DAILY_ROOM_URL)
        print("⏳ Waiting for connection...", flush=True)

        print("✅ Connected! Waiting for conversation...")
        print("💡 Tip: Speak naturally. I'll respond when you pause.")

        # Keep running — cleanup guaranteed via finally
        try:
            while not self._shutting_down:
                await asyncio.sleep(1)
        except (KeyboardInterrupt, SystemExit):
            pass
        finally:
            self._cleanup()
            
    def on_joined(self, data, error):
        """Called when successfully joined the room."""
        if error:
            print(f"❌ Join error: {error}", flush=True)
            return
        print("🎉 Joined room successfully!", flush=True)
        print(f"🎙️  Using voice: {self.config.voice}", flush=True)
        
        # Subscribe to all participants' audio
        print("🔔 Subscribing to audio...", flush=True)
        self.client.update_subscription_profiles({
            "base": {
                "camera": "unsubscribed",
                "microphone": "subscribed"
            }
        })
        
    def on_participant_joined(self, participant):
        """Called when a participant joins."""
        participant_id = participant.get('id', 'Unknown')
        user_name = participant.get('user_name', 'Unknown')
        is_local = participant.get('local', False)
        print(f"👤 Participant joined: {user_name} ({participant_id}) local={is_local}", flush=True)

        # Skip setting up audio renderer for the bot itself
        if is_local:
            return

        # Set up audio renderer for this participant
        try:
            print(f"🎧 Setting up audio renderer for {participant_id}...", flush=True)
            self.client.set_audio_renderer(participant_id, self._on_audio_frame)
            print(f"✅ Audio renderer set up for {participant_id}", flush=True)
        except Exception as e:
            print(f"⚠️ Could not set up audio renderer: {e}", flush=True)
            
    def on_participant_left(self, participant, reason):
        """Called when a participant leaves."""
        print(f"👋 Participant left: {participant.get('user_name', 'Unknown')}", flush=True)
        
    def on_error(self, error):
        """Called when an error occurs."""
        print(f"❌ Daily error: {error}", flush=True)

    def on_left(self, data, error):
        """Called when left the room."""
        print("👋 Left room")
        
    def on_app_message(self, message, sender):
        """Handle text messages (for debugging)."""
        print(f"💬 Message from {sender}: {message}")
        
    def _on_audio_frame(self, participant_id: str, audio_data, sample_rate: int):
        """Handle audio frame from Daily."""
        try:
            # audio_data.audio_frames returns bytes
            frames = audio_data.audio_frames
            if frames and len(frames) > 0:
                # Convert bytes to numpy array (int16)
                audio_array = np.frombuffer(frames, dtype=np.int16)
                # Add to buffer (silence detection happens in background thread)
                self.audio_buffer.add_chunk(audio_array)
        except Exception as e:
            print(f"⚠️ Audio processing error: {e}", flush=True)
            
    async def _process_utterance(self, audio_data: np.ndarray):
        """Process a complete utterance: STT -> Think -> TTS."""
        self.is_processing = True
        
        try:
            # Step 1: Speech-to-Text (Whisper)
            print("📝 Transcribing...")
            transcript = await self._transcribe(audio_data)
            if not transcript or not transcript.strip():
                print("🤷 No speech detected")
                return
                
            print(f"🗣️  Host: {transcript}")
            
            # Step 2: Generate response (GPT-5-mini)
            print("🧠 Thinking...")
            response = await self._generate_response(transcript)
            print(f"🤖 {self.config.name}: {response}")
            
            # Step 3: Text-to-Speech
            print("🔊 Speaking...")
            await self._speak(response)
            
        except Exception as e:
            print(f"❌ Error processing utterance: {e}")
        finally:
            self.is_processing = False
            
    async def _transcribe(self, audio_data: np.ndarray) -> str:
        """Transcribe audio using Naver Clova Speech gRPC Streaming API."""
        CLOVA_SECRET = os.getenv("CLOVA_SECRET")

        if not CLOVA_SECRET or not CLOVA_AVAILABLE:
            print("⚠️ Clova unavailable, using Whisper STT")
            return await self._transcribe_whisper(audio_data)
        
        try:
            # Create gRPC channel
            channel = grpc.secure_channel(
                'clovaspeech-gw.ncloud.com:50051',
                grpc.ssl_channel_credentials()
            )
            stub = nest_pb2_grpc.NestServiceStub(channel)
            
            # Config JSON
            config = {
                "transcription": {
                    "language": "ko"
                },
                "semanticEpd": {
                    "gapThreshold": 500,
                    "durationThreshold": 60000
                }
            }
            
            # Create metadata with authorization
            metadata = (("authorization", f"Bearer {CLOVA_SECRET}"),)
            
            # Generator for streaming requests
            def request_generator():
                # First: send config
                yield nest_pb2.NestRequest(
                    type=nest_pb2.RequestType.CONFIG,
                    config=nest_pb2.NestConfig(config=json.dumps(config))
                )
                
                # Then: stream audio chunks (16kHz, 16-bit PCM)
                chunk_size = 3200  # 100ms chunks at 16kHz
                audio_bytes = audio_data.tobytes()
                
                for i in range(0, len(audio_bytes), chunk_size):
                    chunk = audio_bytes[i:i+chunk_size]
                    yield nest_pb2.NestRequest(
                        type=nest_pb2.RequestType.DATA,
                        data=nest_pb2.NestData(chunk=chunk)
                    )
            
            # Call recognize with streaming
            audio_bytes = audio_data.tobytes()
            print(f"🎙️ Calling Clova gRPC with {len(audio_bytes)} bytes...")
            responses = stub.recognize(request_generator(), metadata=metadata)
            
            # Collect all responses
            results = []
            response_count = 0
            for response in responses:
                response_count += 1
                print(f"🎙️ Got response {response_count}: {response.contents[:200] if response.contents else 'empty'}...")
                if response.contents:
                    try:
                        result = json.loads(response.contents)
                        print(f"🎙️ Parsed result keys: {result.keys()}")
                        # Check for text in various possible locations
                        if "text" in result:
                            results.append(result["text"])
                        elif "transcription" in result and isinstance(result["transcription"], dict):
                            if "text" in result["transcription"]:
                                results.append(result["transcription"]["text"])
                        elif "result" in result:
                            results.append(result["result"])
                        elif "utterance" in result:
                            results.append(result["utterance"])
                    except json.JSONDecodeError:
                        results.append(response.contents)
            
            # Close channel
            channel.close()
            
            if results:
                return " ".join(results)
            return ""
            
        except Exception as e:
            print(f"⚠️ Clova gRPC error: {e}, falling back to Whisper")
            return await self._transcribe_whisper(audio_data)
    
    async def _transcribe_whisper(self, audio_data: np.ndarray) -> str:
        """Fallback: Transcribe using Whisper."""
        # Save raw audio for debugging
        debug_dir = "/tmp/kimiwan_debug"
        os.makedirs(debug_dir, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save numpy array as raw audio
        raw_path = os.path.join(debug_dir, f"audio_{timestamp}.raw")
        with open(raw_path, 'wb') as f:
            f.write(audio_data.tobytes())
        
        # Create WAV file in memory for API
        import wave
        wav_buffer = io.BytesIO()
        with wave.open(wav_buffer, 'wb') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(DAILY_SAMPLE_RATE)
            wav_file.writeframes(audio_data.tobytes())
        wav_buffer.seek(0)
        
        # Call Whisper API (Korean language)
        transcript = await self.openai.audio.transcriptions.create(
            model="whisper-1",
            file=("audio.wav", wav_buffer, "audio/wav"),
            language="ko",
            response_format="text"
        )
        return transcript
        
    async def _generate_response(self, user_message: str) -> str:
        """Generate response using GPT-5-mini."""
        # Add to history
        self.conversation_history.append({"role": "user", "content": user_message})
        
        # Keep only last 10 messages for context
        messages = [
            {"role": "system", "content": self.config.system_prompt}
        ] + self.conversation_history[-10:]
        
        response = await self.openai.chat.completions.create(
            model="gpt-5-mini",
            messages=messages,
            max_completion_tokens=150  # GPT-5 doesn't support temperature
        )
        
        assistant_message = response.choices[0].message.content
        
        # Add to history
        self.conversation_history.append({"role": "assistant", "content": assistant_message})
        
        return assistant_message
        
    async def _speak(self, text: str):
        """Convert text to speech and play in room."""
        self.is_speaking = True
        
        try:
            # Generate TTS
            response = await self.openai.audio.speech.create(
                model="tts-1",
                voice=self.config.voice,
                input=text,
                response_format="pcm"  # Raw PCM for streaming
            )
            
            # Stream audio to room
            audio_data = np.frombuffer(response.content, dtype=np.int16)
            audio_data = audio_data.astype(np.float32) / 32767.0
            
            # Send to Daily (this would need actual implementation based on Daily SDK)
            # For now, we'll simulate by printing
            print(f"🔊 Spoke {len(audio_data) / SAMPLE_RATE:.1f}s of audio")
            
            # TODO: Implement actual audio playback to Daily room
            # This requires Daily's audio send API
            
        finally:
            self.is_speaking = False


async def main():
    """Entry point."""
    bot = PodcastBot()
    await bot.run()


if __name__ == "__main__":
    asyncio.run(main())
