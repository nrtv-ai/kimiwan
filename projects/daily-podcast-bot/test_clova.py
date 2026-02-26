#!/usr/bin/env python3
"""Test Clova Speech API with a saved audio file."""
import os
import json
import wave
import numpy as np
import nest_pb2
import nest_pb2_grpc
import grpc

# Load credentials
CLOVA_SECRET = os.getenv("CLOVA_SECRET")
if not CLOVA_SECRET:
    print("❌ CLOVA_SECRET not set")
    exit(1)

# Load audio file
wav_path = "/tmp/test_audio.wav"
if not os.path.exists(wav_path):
    print(f"❌ Audio file not found: {wav_path}")
    print("Create one with: arecord -f S16_LE -r 16000 -c 1 /tmp/test_audio.wav")
    exit(1)

# Read WAV file
with wave.open(wav_path, 'rb') as wav_file:
    n_channels = wav_file.getnchannels()
    sample_width = wav_file.getsampwidth()
    sample_rate = wav_file.getframerate()
    n_frames = wav_file.getnframes()
    audio_bytes = wav_file.readframes(n_frames)
    
print(f"📊 Audio: {n_channels}ch, {sample_width}bytes, {sample_rate}Hz, {n_frames} frames")
print(f"📊 Audio bytes: {len(audio_bytes)}")

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

# Create metadata
metadata = (("authorization", f"Bearer {CLOVA_SECRET}"),)

# Generator for streaming requests
def request_generator():
    # First: send config
    yield nest_pb2.NestRequest(
        type=nest_pb2.RequestType.CONFIG,
        config=nest_pb2.NestConfig(config=json.dumps(config))
    )
    
    # Then: stream audio chunks
    chunk_size = 3200  # 100ms chunks at 16kHz
    
    for i in range(0, len(audio_bytes), chunk_size):
        chunk = audio_bytes[i:i+chunk_size]
        yield nest_pb2.NestRequest(
            type=nest_pb2.RequestType.DATA,
            data=nest_pb2.NestData(chunk=chunk)
        )

print("🎙️ Calling Clova gRPC...")
responses = stub.recognize(request_generator(), metadata=metadata)

# Collect all responses
results = []
for i, response in enumerate(responses):
    print(f"\n🎙️ Response {i+1}:")
    print(f"   Contents: {response.contents[:500] if response.contents else 'empty'}")
    
    if response.contents:
        try:
            result = json.loads(response.contents)
            print(f"   Keys: {result.keys()}")
            
            # Look for text in various locations
            if "text" in result:
                print(f"   ✓ Text found: {result['text']}")
                results.append(result["text"])
            elif "transcription" in result and isinstance(result["transcription"], dict):
                if "text" in result["transcription"]:
                    print(f"   ✓ Text in transcription: {result['transcription']['text']}")
                    results.append(result["transcription"]["text"])
            elif "result" in result:
                print(f"   ✓ Result: {result['result']}")
                results.append(result["result"])
            elif "utterance" in result:
                print(f"   ✓ Utterance: {result['utterance']}")
                results.append(result["utterance"])
            else:
                print(f"   Full result: {json.dumps(result, indent=2, ensure_ascii=False)[:500]}")
        except json.JSONDecodeError as e:
            print(f"   Not JSON: {e}")
            results.append(response.contents)

channel.close()

print(f"\n{'='*50}")
if results:
    print(f"✅ Transcription: {' '.join(results)}")
else:
    print("❌ No transcription results")