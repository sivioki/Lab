"""Generates the game's sound effects as small 16-bit mono WAV files.

Run from the repository root:  python3 tools/make_sounds.py
"""
import math
import random
import struct
import wave

RATE = 22050
OUT = "app/src/main/res/raw/"


def write(name, samples):
    with wave.open(OUT + name + ".wav", "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(RATE)
        f.writeframes(b"".join(
            struct.pack("<h", int(max(-1.0, min(1.0, s)) * 32000)) for s in samples))


def sweep(duration, f0, f1, wave_fn, volume, attack=0.005, decay_pow=1.0):
    n = int(RATE * duration)
    phase = 0.0
    out = []
    for i in range(n):
        t = i / n
        freq = f0 + (f1 - f0) * t
        phase += 2 * math.pi * freq / RATE
        env = min(1.0, i / (RATE * attack)) * (1 - t) ** decay_pow
        out.append(wave_fn(phase) * env * volume)
    return out


def square(p):
    return 0.6 if math.sin(p) >= 0 else -0.6


def sine(p):
    return math.sin(p)


def flap():
    # Short rising chirp
    return sweep(0.09, 380, 900, square, 0.35, decay_pow=1.5)


def point():
    # Two-tone "ding"
    return (sweep(0.07, 988, 988, sine, 0.5, decay_pow=0.5)
            + sweep(0.22, 1319, 1319, sine, 0.5, decay_pow=2.0))


def hit():
    # Noise burst with a low thump
    rnd = random.Random(1)
    n = int(RATE * 0.2)
    out = []
    for i in range(n):
        t = i / n
        env = (1 - t) ** 3
        thump = math.sin(2 * math.pi * (120 - 60 * t) * i / RATE)
        out.append((rnd.uniform(-1, 1) * 0.6 + thump * 0.8) * env * 0.8)
    return out


def die():
    # Falling "swoosh" tone
    return sweep(0.5, 700, 120, square, 0.3, decay_pow=1.2)


if __name__ == "__main__":
    write("sfx_flap", flap())
    write("sfx_point", point())
    write("sfx_hit", hit())
    write("sfx_die", die())
