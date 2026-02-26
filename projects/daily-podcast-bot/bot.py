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
from typing import Optional
from dataclasses import dataclass
from datetime import datetime

import numpy as np
from daily import CallClient, EventHandler
from openai import AsyncOpenAI
from dotenv import load_dotenv

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
VAD_THRESHOLD = 0.01  # Voice activity detection threshold
SILENCE_TIMEOUT_MS = 1500  # End of speech detection (1.5s silence)


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
        self.silence_start: Optional[float] = None
        
    def add_chunk(self, audio_data: np.ndarray) -> Optional[np.ndarray]:
        """Add audio chunk. Returns complete utterance when silence detected."""
        # Calculate RMS volume
        rms = np.sqrt(np.mean(audio_data ** 2))
        
        if rms > VAD_THRESHOLD:
            # Speech detected
            if not self.is_speaking:
                print("🎤 Speech started")
                self.is_speaking = True
            self.buffer.append(audio_data)
            self.silence_start = None
            return None
            
        else:
            # Silence
            if self.is_speaking:
                if self.silence_start is None:
                    self.silence_start = asyncio.get_event_loop().time()
                elif (asyncio.get_event_loop().time() - self.silence_start) * 1000 > SILENCE_TIMEOUT_MS:
                    # End of utterance
                    if len(self.buffer) > 0:
                        utterance = np.concatenate(self.buffer)
                        self.buffer = []
                        self.is_speaking = False
                        self.silence_start = None
                        print(f"🎤 Speech ended ({len(utterance) / self.sample_rate:.1f}s)")
                        return utterance
            return None


class PodcastBot(EventHandler):
    """Main bot class handling Daily connection and conversation."""
    
    def __init__(self):
        self.client: Optional[CallClient] = None
        self.openai = AsyncOpenAI(api_key=OPENAI_API_KEY)
        self.config = BotConfig()
        self.audio_buffer = AudioBuffer()
        self.conversation_history = []
        self.is_processing = False
        self.is_speaking = False
        
    async def run(self):
        """Main entry point."""
        print(f"🚀 Starting {self.config.name}...")
        print(f"🔗 Connecting to: {DAILY_ROOM_URL}")
        
        # Create Daily client
        self.client = CallClient(self)
        
        # Join the room
        self.client.join(DAILY_ROOM_URL, token=DAILY_API_KEY)
        
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
            print(f"❌ Join error: {error}")
            return
        print("🎉 Joined room successfully!")
        print(f"🎙️  Using voice: {self.config.voice}")
        
    def on_left(self, data, error):
        """Called when left the room."""
        print("👋 Left room")
        
    def on_app_message(self, message, sender):
        """Handle text messages (for debugging)."""
        print(f"💬 Message from {sender}: {message}")
        
    def on_audio_data(self, audio_data: np.ndarray):
        """Process incoming audio from room."""
        if self.is_processing or self.is_speaking:
            # Don't process while we're speaking or thinking
            return
            
        # Add to buffer and check for complete utterance
        utterance = self.audio_buffer.add_chunk(audio_data)
        if utterance is not None:
            # Process the utterance
            asyncio.create_task(self._process_utterance(utterance))
            
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
        
        # Call Whisper API
        response = await self.openai.audio.transcriptions.create(
            model="whisper-1",
            file=("audio.wav", wav_buffer, "audio/wav"),
            language="en"
        )
        return response.text
        
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
            max_tokens=150,  # Keep responses concise for audio
            temperature=0.7
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
