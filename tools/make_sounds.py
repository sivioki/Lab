"""Generates the game's sound effects as small 16-bit mono WAV files.

Also renders the background music loop (needs ffmpeg for the OGG encoding).

Run from the repository root:  python3 tools/make_sounds.py
"""
import math
import os
import random
import struct
import subprocess
import tempfile
import wave

RATE = 22050
OUT = "app/src/main/res/raw/"


def write(name, samples, path=None):
    with wave.open(path or OUT + name + ".wav", "wb") as f:
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


# ---------------------------------------------------------------- music

BPM = 140
STEP = 60 / BPM / 4  # one 16th note in seconds
NOTES = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6,
         "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}


def freq(note):
    """'A4' -> 440.0"""
    name, octave = note[:-1], int(note[-1])
    return 440.0 * 2 ** ((NOTES[name] - 9) / 12 + (octave - 4))


def pulse(p, duty):
    return 1.0 if (p / (2 * math.pi)) % 1.0 < duty else -1.0


def triangle(p):
    x = (p / (2 * math.pi)) % 1.0
    return 4 * abs(x - 0.5) - 1


def add_note(buf, start, length, f, wave_fn, volume, release=0.3):
    s0 = int(start * RATE)
    n = int(length * RATE)
    rel = max(1, int(n * release))
    for i in range(n):
        if s0 + i >= len(buf):
            break
        env = 1.0 if i < n - rel else (n - i) / rel
        env *= min(1.0, i / 40)  # tiny attack against clicks
        buf[s0 + i] += wave_fn(2 * math.pi * f * i / RATE) * env * volume


# One bar per chord: C - Am - F - G, played twice with a different melody
CHORDS = [("C3", ["C4", "E4", "G4"]), ("A2", ["A3", "C4", "E4"]),
          ("F2", ["F3", "A3", "C4"]), ("G2", ["G3", "B3", "D4"])]
# Melody as (note or None, length in 16ths); each bar sums to 16
MELODY = [
    [("E5", 2), ("G5", 2), ("C6", 4), ("G5", 2), ("E5", 2), ("G5", 4)],
    [("A5", 4), ("E5", 2), ("C5", 2), ("E5", 4), ("A5", 4)],
    [("F5", 2), ("A5", 2), ("C6", 2), ("A5", 2), ("F5", 4), ("C5", 4)],
    [("D5", 2), ("G5", 2), ("B5", 4), ("A5", 2), ("G5", 2), ("D5", 4)],
    [("G5", 4), ("E5", 2), ("G5", 2), ("C6", 2), ("D6", 2), ("E6", 4)],
    [("C6", 4), ("A5", 4), ("E5", 2), ("G5", 2), ("A5", 4)],
    [("A5", 2), ("G5", 2), ("F5", 2), ("A5", 2), ("C6", 4), ("A5", 4)],
    [("B5", 4), ("D6", 4), ("G5", 4), (None, 4)],
]


def music():
    bars = len(MELODY)
    total = bars * 16 * STEP
    buf = [0.0] * int(total * RATE)
    rnd = random.Random(7)

    for bar in range(bars):
        t0 = bar * 16 * STEP
        root, chord = CHORDS[bar % len(CHORDS)]

        # Bass: root on 8th notes, octave jump on the off-beats
        for k in range(8):
            f = freq(root) * (2 if k % 2 else 1)
            add_note(buf, t0 + k * 2 * STEP, 2 * STEP * 0.9, f, triangle, 0.30)

        # Arpeggio: quiet 12.5% pulse over the chord
        for k in range(16):
            f = freq(chord[k % 3]) * 2
            add_note(buf, t0 + k * STEP, STEP * 0.8, f,
                     lambda p: pulse(p, 0.125), 0.06, release=0.6)

        # Melody: 25% pulse
        t = t0
        for note, length in MELODY[bar]:
            if note:
                add_note(buf, t, length * STEP * 0.85, freq(note),
                         lambda p: pulse(p, 0.25), 0.11)
            t += length * STEP

        # Drums: kick on beats 1 and 3, noise hi-hat on every 8th
        for beat in range(4):
            bt = t0 + beat * 4 * STEP
            if beat % 2 == 0:
                s0 = int(bt * RATE)
                for i in range(int(0.12 * RATE)):
                    x = i / (0.12 * RATE)
                    buf[s0 + i] += math.sin(2 * math.pi * (110 - 70 * x) * i / RATE) * (1 - x) ** 2 * 0.45
            for half in range(2):
                s0 = int((bt + half * 2 * STEP) * RATE)
                n = int(0.03 * RATE)
                for i in range(n):
                    buf[s0 + i] += rnd.uniform(-1, 1) * (1 - i / n) ** 2 * (0.08 if half else 0.05)

    peak = max(abs(x) for x in buf)
    return [x / peak * 0.85 for x in buf]


def write_ogg(name, samples):
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, name + ".wav")
        write(name, samples, wav)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav,
                        "-c:a", "libvorbis", "-q:a", "3", OUT + name + ".ogg"], check=True)


if __name__ == "__main__":
    write("sfx_flap", flap())
    write("sfx_point", point())
    write("sfx_hit", hit())
    write("sfx_die", die())
    write_ogg("music", music())
