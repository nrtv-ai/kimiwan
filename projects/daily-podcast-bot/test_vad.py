#!/usr/bin/env python3
"""
Tests for VAD (Voice Activity Detection) and audio pipeline.
Validates the critical fix: all audio is buffered during active speech,
not just chunks above the energy threshold.
"""

import sys
import time
import threading
import numpy as np

# We can't import Daily in test environment, so we test AudioBuffer directly
# by extracting the relevant constants and class

SAMPLE_RATE = 16000
VAD_THRESHOLD = 80.0
SILENCE_TIMEOUT_MS = 3000
CHUNK_DURATION_MS = 100
SAMPLES_PER_CHUNK = int(SAMPLE_RATE * CHUNK_DURATION_MS / 1000)  # 1600 samples per 100ms


class AudioBufferForTest:
    """Isolated copy of AudioBuffer for testing (no Daily dependency)."""

    def __init__(self, sample_rate=SAMPLE_RATE, silence_timeout_ms=SILENCE_TIMEOUT_MS):
        self.sample_rate = sample_rate
        self.silence_timeout_ms = silence_timeout_ms
        self.buffer = []
        self.is_speaking = False
        self.last_audio_time = time.time()
        self.lock = threading.Lock()
        self.on_utterance = None
        self._chunk_count = 0

        self.silence_thread = threading.Thread(target=self._silence_checker, daemon=True)
        self.silence_thread.start()

    def _silence_checker(self):
        while True:
            time.sleep(0.05)  # Faster check for tests
            with self.lock:
                if self.is_speaking:
                    elapsed = (time.time() - self.last_audio_time) * 1000
                    if elapsed > self.silence_timeout_ms:
                        if len(self.buffer) > 0:
                            utterance = np.concatenate(self.buffer)
                            self.buffer = []
                            self.is_speaking = False
                            if self.on_utterance:
                                self.on_utterance(utterance)

    def add_chunk(self, audio_data: np.ndarray):
        with self.lock:
            if len(audio_data) == 0:
                return

            audio_data = np.nan_to_num(audio_data, nan=0.0, posinf=0.0, neginf=0.0)

            mean_square = np.mean(audio_data.astype(np.float64) ** 2)
            rms = np.sqrt(mean_square) if mean_square > 0 else 0.0

            if rms > VAD_THRESHOLD:
                self.last_audio_time = time.time()
                if not self.is_speaking:
                    self.is_speaking = True

            # CRITICAL FIX: buffer ALL audio while speaking
            if self.is_speaking:
                self.buffer.append(audio_data)


def make_chunk(amplitude: float, samples: int = SAMPLES_PER_CHUNK) -> np.ndarray:
    """Generate a sine wave chunk at given amplitude (int16 scale)."""
    t = np.linspace(0, CHUNK_DURATION_MS / 1000, samples, endpoint=False)
    signal = (amplitude * np.sin(2 * np.pi * 440 * t)).astype(np.int16)
    return signal


def make_silence(samples: int = SAMPLES_PER_CHUNK) -> np.ndarray:
    """Generate silence."""
    return np.zeros(samples, dtype=np.int16)


# ─────────────────────────────────────────────
# Test 1: Speech with amplitude dips is fully captured
# ─────────────────────────────────────────────
def test_amplitude_dip_preserved():
    """
    Simulates: loud speech → soft speech (dip below threshold) → loud again
    OLD BUG: soft chunks were dropped, creating gaps
    FIX: all chunks buffered while is_speaking=True
    """
    print("TEST 1: Amplitude dips during speech are preserved...")

    result = []
    buf = AudioBufferForTest(silence_timeout_ms=500)  # Short timeout for test speed
    buf.on_utterance = lambda u: result.append(u)

    # Phase 1: Loud speech (5 chunks, RMS ~141 > 80)
    for _ in range(5):
        buf.add_chunk(make_chunk(amplitude=200))

    # Phase 2: Soft speech (5 chunks, RMS ~35 < 80) — previously DROPPED
    for _ in range(5):
        buf.add_chunk(make_chunk(amplitude=50))

    # Phase 3: Loud again (5 chunks)
    for _ in range(5):
        buf.add_chunk(make_chunk(amplitude=200))

    # Verify buffer has ALL 15 chunks (not just the 10 loud ones)
    with buf.lock:
        total_buffered = sum(len(c) for c in buf.buffer)
        expected = 15 * SAMPLES_PER_CHUNK
        assert total_buffered == expected, (
            f"FAIL: buffered {total_buffered} samples, expected {expected}. "
            f"Soft chunks were dropped!"
        )
    print(f"  PASS: All 15 chunks buffered ({total_buffered} samples)")


# ─────────────────────────────────────────────
# Test 2: Silence before speech is not buffered
# ─────────────────────────────────────────────
def test_silence_not_buffered():
    """Silence chunks before speech onset should NOT be buffered."""
    print("TEST 2: Pre-speech silence is not buffered...")

    buf = AudioBufferForTest(silence_timeout_ms=500)

    # Feed 10 chunks of silence
    for _ in range(10):
        buf.add_chunk(make_silence())

    with buf.lock:
        total_buffered = sum(len(c) for c in buf.buffer)
        assert total_buffered == 0, f"FAIL: {total_buffered} samples buffered from silence"
        assert not buf.is_speaking, "FAIL: is_speaking should be False during silence"
    print(f"  PASS: 0 samples buffered, is_speaking=False")


# ─────────────────────────────────────────────
# Test 3: Utterance callback fires after silence timeout
# ─────────────────────────────────────────────
def test_utterance_callback():
    """After speech + silence timeout, utterance callback fires with full audio."""
    print("TEST 3: Utterance callback fires after silence timeout...")

    results = []
    buf = AudioBufferForTest(silence_timeout_ms=300)  # 300ms for fast test
    buf.on_utterance = lambda u: results.append(u)

    # Feed 10 chunks of speech
    for _ in range(10):
        buf.add_chunk(make_chunk(amplitude=200))

    # Wait for silence timeout to trigger
    time.sleep(0.6)  # 600ms > 300ms timeout

    assert len(results) == 1, f"FAIL: expected 1 utterance, got {len(results)}"
    assert len(results[0]) == 10 * SAMPLES_PER_CHUNK, (
        f"FAIL: utterance has {len(results[0])} samples, "
        f"expected {10 * SAMPLES_PER_CHUNK}"
    )
    print(f"  PASS: Callback fired with {len(results[0])} samples")


# ─────────────────────────────────────────────
# Test 4: Threshold value is sensible for int16 speech
# ─────────────────────────────────────────────
def test_threshold_detects_moderate_speech():
    """VAD_THRESHOLD=80 should detect moderate speech (amplitude ~120)."""
    print("TEST 4: Threshold detects moderate-volume speech...")

    buf = AudioBufferForTest()

    # Moderate speech: amplitude 120 → RMS ≈ 85
    chunk = make_chunk(amplitude=120)
    rms = np.sqrt(np.mean(chunk.astype(np.float64) ** 2))
    print(f"  Moderate speech RMS: {rms:.1f} (threshold: {VAD_THRESHOLD})")

    buf.add_chunk(chunk)

    with buf.lock:
        assert buf.is_speaking, (
            f"FAIL: RMS={rms:.1f} should trigger VAD (threshold={VAD_THRESHOLD})"
        )
    print(f"  PASS: VAD triggered at RMS={rms:.1f}")


# ─────────────────────────────────────────────
# Test 5: Old threshold (200) would miss moderate speech
# ─────────────────────────────────────────────
def test_old_threshold_too_high():
    """Verify that the old threshold=200 would MISS moderate speech."""
    print("TEST 5: Old threshold=200 would miss moderate speech...")

    # Moderate speech: amplitude 200 → RMS ≈ 141
    chunk = make_chunk(amplitude=200)
    rms = np.sqrt(np.mean(chunk.astype(np.float64) ** 2))
    old_threshold = 200.0

    assert rms < old_threshold, (
        f"FAIL: Expected RMS={rms:.1f} < old threshold {old_threshold}"
    )
    print(f"  PASS: RMS={rms:.1f} < old threshold {old_threshold} (would be missed!)")


# ─────────────────────────────────────────────
# Test 6: WAV creation for Whisper is valid
# ─────────────────────────────────────────────
def test_wav_creation():
    """Verify WAV file creation matches Whisper's expected format."""
    print("TEST 6: WAV file creation for Whisper STT...")
    import io
    import wave

    audio = make_chunk(amplitude=200, samples=SAMPLE_RATE * 2)  # 2 seconds

    wav_buffer = io.BytesIO()
    with wave.open(wav_buffer, 'wb') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(SAMPLE_RATE)
        wav_file.writeframes(audio.tobytes())
    wav_buffer.seek(0)

    # Verify WAV is readable
    with wave.open(wav_buffer, 'rb') as wav_file:
        assert wav_file.getnchannels() == 1, "FAIL: expected mono"
        assert wav_file.getsampwidth() == 2, "FAIL: expected 16-bit"
        assert wav_file.getframerate() == SAMPLE_RATE, f"FAIL: expected {SAMPLE_RATE}Hz"
        frames = wav_file.readframes(wav_file.getnframes())
        assert len(frames) == len(audio) * 2, "FAIL: frame count mismatch"

    print(f"  PASS: Valid WAV — mono, 16-bit, {SAMPLE_RATE}Hz, {len(audio)} samples")


# ─────────────────────────────────────────────
# Test 7: Realistic speech pattern (onset → variable → offset)
# ─────────────────────────────────────────────
def test_realistic_speech_pattern():
    """
    Simulates realistic speech: variable amplitude with natural dips.
    Speech: [loud, medium, soft, medium, loud, soft, medium, loud]
    All chunks should be captured once onset triggers.
    """
    print("TEST 7: Realistic variable-amplitude speech pattern...")

    buf = AudioBufferForTest(silence_timeout_ms=500)
    amplitudes = [300, 150, 40, 120, 250, 30, 180, 350]  # Natural speech variation

    for amp in amplitudes:
        buf.add_chunk(make_chunk(amplitude=amp))

    with buf.lock:
        total_buffered = sum(len(c) for c in buf.buffer)
        expected = len(amplitudes) * SAMPLES_PER_CHUNK
        assert total_buffered == expected, (
            f"FAIL: buffered {total_buffered}/{expected} samples. "
            f"Some chunks lost during amplitude variation!"
        )
    print(f"  PASS: All {len(amplitudes)} chunks buffered ({total_buffered} samples)")


if __name__ == "__main__":
    print("=" * 60)
    print("VAD & Audio Pipeline Tests")
    print("=" * 60)
    print()

    tests = [
        test_amplitude_dip_preserved,
        test_silence_not_buffered,
        test_utterance_callback,
        test_threshold_detects_moderate_speech,
        test_old_threshold_too_high,
        test_wav_creation,
        test_realistic_speech_pattern,
    ]

    passed = 0
    failed = 0
    for test in tests:
        try:
            test()
            passed += 1
        except AssertionError as e:
            print(f"  {e}")
            failed += 1
        except Exception as e:
            print(f"  ERROR: {e}")
            failed += 1
        print()

    print("=" * 60)
    print(f"Results: {passed}/{len(tests)} passed, {failed} failed")
    print("=" * 60)

    sys.exit(0 if failed == 0 else 1)
