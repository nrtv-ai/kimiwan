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
SAMPLE_RATE = 24000  # OpenAI TTS outputs 24kHz
CHUNK_DURATION_MS = 100  # Process audio in 100ms chunks
VAD_THRESHOLD = 75.0  # Voice activity detection threshold (was 50.0)
SILENCE_TIMEOUT_MS = 3000  # End of speech detection (3 seconds)


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
                # Speech detected - update last_audio_time
                self.last_audio_time = time.time()
                print(f"🎤 VAD triggered: RMS={rms:.2f} > {VAD_THRESHOLD}", flush=True)
                
                if not self.is_speaking:
                    print("🎤 Speech started", flush=True)
                    self.is_speaking = True
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
        while True:
            try:
                utterance = self.audio_queue.get(timeout=1)
                if utterance is None:
                    continue
                print(f"📝 Processing utterance: {len(utterance)} samples", flush=True)
                # Run async processing in new event loop
                asyncio.run(self._process_utterance(utterance))
            except queue.Empty:
                continue
            except Exception as e:
                print(f"⚠️ Processing thread error: {e}", flush=True)
        
    async def run(self):
        """Main entry point."""
        print(f"🚀 Starting {self.config.name}...", flush=True)
        print(f"🔗 Connecting to: {DAILY_ROOM_URL}", flush=True)
        
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
        
        # Keep running
        try:
            while True:
                await asyncio.sleep(1)
        except KeyboardInterrupt:
            print("\n👋 Shutting down...")
            self.client.leave()
            
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
        print(f"👤 Participant joined: {participant.get('user_name', 'Unknown')} ({participant_id})", flush=True)
        
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
        """Transcribe audio using Whisper."""
        # Convert numpy array to bytes
        audio_bytes = (audio_data * 32767).astype(np.int16).tobytes()
        
        # Create WAV file in memory
        import wave
        wav_buffer = io.BytesIO()
        with wave.open(wav_buffer, 'wb') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(SAMPLE_RATE)
            wav_file.writeframes(audio_bytes)
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
