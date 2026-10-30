#!/usr/bin/env python3
"""Erzeugt die Musik für Astro Run (eigene Kompositionen, frei verwendbar).

Ausgabe (WAV, 44,1 kHz Stereo) in das angegebene Verzeichnis:
  menu.wav     ruhiger Ambient-Loop für das Hauptmenü
  run_core.wav Lauf-Musik: Schlagzeug, Bass, Flächen        (Loop, 32 Takte)
  run_lead.wav Lauf-Musik: Arpeggio und Melodie              (gleiche Länge, synchron)
  run_tense.wav Lauf-Musik: bedrohliche Ebene, wenn Aliens nah (gleiche Länge, synchron)
  gameover.wav kurzer Abschluss nach dem Ende einer Mission
  unlock.wav   kurzer Jingle beim Freischalten eines Planeten

Die drei run_*-Spuren sind gleich lang und werden im Spiel gleichzeitig gestartet,
damit sich Melodie und Spannung je nach Tempo und Alien-Abstand ein- und ausblenden lassen.

Aufruf: python3 make_music.py <ausgabeordner>
"""
import sys
import wave
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 44100
rng = np.random.default_rng(7)


def hz(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def lp(x, fc, order=2):
    return sosfilt(butter(order, min(fc, SR * 0.45) / (SR / 2), 'low', output='sos'), x, axis=0)


def hp(x, fc, order=2):
    return sosfilt(butter(order, fc / (SR / 2), 'high', output='sos'), x, axis=0)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo / (SR / 2), hi / (SR / 2)], 'band', output='sos'), x, axis=0)


def saw(freq, n, phase=0.0):
    t = np.arange(n) / SR
    return 2 * ((t * freq + phase) % 1.0) - 1


def pulse(freq, n, duty=0.5):
    t = np.arange(n) / SR
    return np.where((t * freq) % 1.0 < duty, 1.0, -1.0)


def env(n, a, d, s, r_start=None, r=0.05):
    """ADSR-Hüllkurve über n Samples; Release beginnt bei r_start (Sekunden)."""
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-4), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-4)))
    if r_start is not None:
        e = np.where(t > r_start, e * np.exp(-(t - r_start) / max(r, 1e-4)), e)
    return e


def stereo(x, pan=0.0):
    l = np.cos((pan + 1) * np.pi / 4)
    r = np.sin((pan + 1) * np.pi / 4)
    return np.stack([x * l, x * r], axis=1)


def add(buf, start_s, sig):
    i = int(round(start_s * SR))
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i]


def reverb_ir(seconds=2.4, decay=3.2, seed=1):
    r = np.random.default_rng(seed)
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = r.standard_normal((n, 2)) * np.exp(-t * decay)[:, None]
    ir = lp(ir, 6000)
    ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))[:, None]
    return ir / np.sqrt((ir ** 2).sum(axis=0))


def reverb(x, ir, wet):
    y = np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], axis=1)
    return x + y * wet


def pingpong(x, delay_s, fb, wet):
    d = int(delay_s * SR)
    y = np.zeros_like(x)
    tap = x.copy()
    for k in range(1, 7):
        tap = np.roll(tap, d, axis=0)
        tap[:d] = 0
        tap = lp(tap, 4000, 1) * fb
        ch = k % 2
        y[:, ch] += tap[:, ch] + tap[:, 1 - ch] * 0.3
    return x + y * wet


def loopify(buf, loop_len):
    """Nachhall vom Ende an den Anfang falten, damit der Loop nahtlos ist."""
    n = int(round(loop_len * SR))
    out = buf[:n].copy()
    tail = buf[n:]
    while len(tail):
        k = min(n, len(tail))
        out[:k] += tail[:k]
        tail = tail[k:]
    return out


# ---------------------------------------------------------------- Instrumente
def kick():
    n = int(0.42 * SR)
    t = np.arange(n) / SR
    f = 46 + 130 * np.exp(-t * 32)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7.5)
    click = hp(rng.standard_normal(n), 3000) * np.exp(-t * 400) * 0.35
    return np.tanh((body + click) * 1.6) * 0.9


def snare():
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    noise = bp(rng.standard_normal(n), 1200, 7000) * np.exp(-t * 17)
    tone = np.sin(2 * np.pi * 185 * t) * np.exp(-t * 28) * 0.6
    return (noise * 0.8 + tone) * 0.55


def hat(open_=False):
    n = int((0.3 if open_ else 0.06) * SR)
    t = np.arange(n) / SR
    return hp(rng.standard_normal(n), 8000) * np.exp(-t * (11 if open_ else 70)) * 0.22


def bass_note(note, dur):
    n = int((dur + 0.08) * SR)
    f = hz(note)
    x = saw(f, n) * 0.6 + pulse(f / 2, n) * 0.35
    x = lp(x, 520, 2) + lp(x, 1600, 1) * np.exp(-np.arange(n) / SR * 22)[:] * 0.4
    return x * env(n, 0.004, 0.18, 0.55, dur, 0.04) * 0.5


def pad_chord(notes, dur, bright=1500, voices=4, level=0.11):
    n = int((dur + 1.2) * SR)
    out = np.zeros((n, 2))
    for k, note in enumerate(notes):
        for v in range(voices):
            det = (v - (voices - 1) / 2) * 0.09
            x = saw(hz(note + det), n, phase=rng.random())
            out += stereo(x, pan=((v / max(voices - 1, 1)) * 2 - 1) * 0.7)
    out = lp(out, bright, 2)
    return out * env(n, 0.35, 0.8, 0.85, dur, 0.5)[:, None] * level / (len(notes) * voices) * 3


def pluck(note, dur=0.16, duty=0.25, cutoff=3200, level=0.2):
    n = int((dur + 0.1) * SR)
    x = pulse(hz(note), n, duty) * 0.7 + saw(hz(note) * 1.003, n) * 0.3
    x = lp(x, cutoff, 2)
    return x * env(n, 0.002, dur * 0.45, 0.0) * level


def lead_note(note, dur, level=0.17):
    n = int((dur + 0.25) * SR)
    t = np.arange(n) / SR
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.2 * t) * np.clip(t / 0.3, 0, 1)
    ph = np.cumsum(hz(note) * vib) / SR
    x = (2 * (ph % 1) - 1) * 0.6 + (2 * ((ph * 1.006) % 1) - 1) * 0.4
    x = lp(x, 2600, 2)
    return x * env(n, 0.02, 0.3, 0.7, dur, 0.12) * level


def bell(note, dur=1.6, level=0.12):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = hz(note)
    x = np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 3) + 0.2 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 6)
    return x * np.exp(-t * 2.2) * level


# ---------------------------------------------------------------- Lauf-Musik
BPM = 124
BEAT = 60 / BPM
BAR = BEAT * 4
BARS = 32
LOOP = BAR * BARS

AM, F, C, G, EM = [57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62], [52, 55, 59]
ROOTS = {id(AM): 45, id(F): 41, id(C): 48, id(G): 43, id(EM): 40}
PROG = [AM, F, C, G] * 4 + [F, G, EM, AM] * 4


def run_core():
    n = int((LOOP + 3) * SR)
    drums = np.zeros((n, 2))
    music = np.zeros((n, 2))
    k, s, h, ho = kick(), snare(), hat(), hat(True)
    for bar in range(BARS):
        t0 = bar * BAR
        chord = PROG[bar]
        root = ROOTS[id(chord)]
        for b in range(4):
            add(drums, t0 + b * BEAT, stereo(k))
            if b in (1, 3):
                add(drums, t0 + b * BEAT, stereo(s, 0.05))
            for sub in range(4):
                tt = t0 + b * BEAT + sub * BEAT / 4
                if sub == 2:
                    add(drums, tt, stereo(ho if (bar % 4 == 3 and b == 3) else h, 0.3))
                elif sub in (1, 3) and bar >= 2:
                    add(drums, tt, stereo(h * 0.45, -0.3))
        # Bass: Achtel, Grundton und Oktave
        for e in range(8):
            note = root + (12 if e % 2 else 0)
            add(music, t0 + e * BEAT / 2, stereo(bass_note(note, BEAT / 2 * 0.9)))
        add(music, t0, pad_chord(chord, BAR))
    # Pumpen im Takt der Bassdrum
    t = np.arange(n) / SR
    pump = 1 - 0.55 * np.exp(-((t % BEAT) / BEAT) * 9)
    music *= pump[:, None]
    ir = reverb_ir(1.6, 4.0, 2)
    drums = reverb(drums, ir, 0.12)
    music = reverb(music, reverb_ir(2.4, 3.0, 3), 0.25)
    return loopify(np.tanh((drums + music) * 1.15), LOOP)


MELODY = [  # (Takt-Offset in Achteln, Note, Länge in Achteln) für 4 Takte, wird wiederholt und variiert
    (0, 69, 3), (3, 72, 3), (6, 76, 2), (8, 74, 4), (12, 72, 2), (14, 71, 2),
    (16, 72, 3), (19, 74, 3), (22, 76, 2), (24, 79, 6), (30, 76, 2),
]


def run_lead():
    n = int((LOOP + 3) * SR)
    arp = np.zeros((n, 2))
    lead = np.zeros((n, 2))
    for bar in range(BARS):
        t0 = bar * BAR
        chord = PROG[bar]
        tones = chord + [c + 12 for c in chord]
        pattern = [0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4, 5, 3, 1]
        for i, p in enumerate(pattern):
            if bar < 2 and i % 2:
                continue
            add(arp, t0 + i * BEAT / 4, stereo(pluck(tones[p] + 12, level=0.16), 0.25 if i % 2 else -0.25))
    for block in range(4, 8):  # Melodie in der zweiten Hälfte
        t0 = block * 4 * BAR
        shift = 0 if block % 2 == 0 else -2
        for off, note, ln in MELODY:
            add(lead, t0 + off * BEAT / 2, stereo(lead_note(note + shift, ln * BEAT / 2 * 0.95)))
    arp = pingpong(arp, BEAT * 3 / 4, 0.45, 0.6)
    lead = pingpong(lead, BEAT * 3 / 4, 0.3, 0.35)
    out = reverb(arp + lead, reverb_ir(2.6, 2.6, 4), 0.3)
    return loopify(hp(out, 40), LOOP)  # Gleichanteil der Pulswelle entfernen


def run_tense():
    n = int((LOOP + 3) * SR)
    out = np.zeros((n, 2))
    t = np.arange(n) / SR
    for bar in range(BARS):
        root = ROOTS[id(PROG[bar])]
        m = int((BAR + 0.4) * SR)
        tt = np.arange(m) / SR
        sub = np.sin(2 * np.pi * hz(root - 12) * tt) + 0.5 * np.tanh(3 * np.sin(2 * np.pi * hz(root) * tt))
        add(out, bar * BAR, stereo(sub * env(m, 0.05, 1, 1, BAR, 0.2) * 0.22))
        # dissonante, flirrende Töne (kleine Sekunde)
        for note, pan in ((root + 36, -0.6), (root + 37, 0.6)):
            x = np.sin(2 * np.pi * hz(note) * tt) * (0.5 + 0.5 * np.sin(2 * np.pi * (BPM / 60 * 4) * tt))
            add(out, bar * BAR, stereo(x * env(m, 0.2, 1, 1, BAR, 0.3) * 0.05, pan))
    # Alien-Rufe: absinkende Glissandi alle 4 Takte
    for bar in range(1, BARS, 4):
        m = int(1.2 * SR)
        tt = np.arange(m) / SR
        f = 900 * np.exp(-tt * 1.6) + 120
        x = np.sin(2 * np.pi * np.cumsum(f) / SR + 3 * np.sin(2 * np.pi * 7 * tt))
        add(out, bar * BAR + BEAT * 2, stereo(lp(x, 2500) * np.exp(-tt * 2.5) * 0.12, rng.uniform(-0.7, 0.7)))
    out *= (1 - 0.35 * np.exp(-((t % (BEAT / 2)) / (BEAT / 2)) * 6))[:, None]
    return loopify(reverb(out, reverb_ir(3.0, 2.0, 5), 0.4), LOOP)


# ---------------------------------------------------------------- Menü
def menu():
    bpm = 80
    beat = 60 / bpm
    bar = beat * 4
    prog = [AM, F, C, EM] * 4
    loop = bar * len(prog)
    n = int((loop + 4) * SR)
    out = np.zeros((n, 2))
    for i, chord in enumerate(prog):
        t0 = i * bar
        add(out, t0, pad_chord([c - 12 for c in chord] + [chord[0]], bar, bright=900, voices=3, level=0.16))
        add(out, t0, stereo(lp(np.sin(2 * np.pi * hz(ROOTS[id(chord)] - 12) * np.arange(int(bar * SR)) / SR), 200) * env(int(bar * SR), 0.6, 2, 0.8, bar - 0.6, 0.5) * 0.12))
        for k in range(8):
            if rng.random() < 0.75:
                note = chord[k % 3] + 12 + (12 if k >= 6 else 0)
                add(out, t0 + k * beat / 2, stereo(bell(note, level=0.06), rng.uniform(-0.6, 0.6)))
    out = pingpong(out, beat * 0.75, 0.5, 0.5)
    out = reverb(out, reverb_ir(4.0, 1.4, 6), 0.55)
    return loopify(out, loop)


def gameover():
    n = int(3.2 * SR)
    out = np.zeros((n, 2))
    for i, note in enumerate([76, 72, 69, 64, 57]):
        add(out, i * 0.16, stereo(lead_note(note, 0.5 if i < 4 else 1.6, level=0.2), (-0.3, 0.3)[i % 2]))
    add(out, 0.64, pad_chord([45, 52, 57, 60], 1.8, bright=1100, level=0.2))
    return reverb(out, reverb_ir(2.8, 2.2, 8), 0.4)


def unlock():
    n = int(2.0 * SR)
    out = np.zeros((n, 2))
    for i, note in enumerate([72, 76, 79, 84, 88]):
        add(out, i * 0.07, stereo(bell(note, 1.2, level=0.16), (-0.4, 0.4)[i % 2]))
    add(out, 0.3, pad_chord([60, 64, 67, 72], 0.9, bright=2200, level=0.14))
    return reverb(out, reverb_ir(2.0, 2.6, 9), 0.35)


def write_wav(path, x, peak=0.89):
    x = x - x.mean(axis=0)
    x = x / max(1e-9, np.abs(x).max()) * peak
    data = (np.clip(x, -1, 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


def main(out):
    core, lead, tense = run_core(), run_lead(), run_tense()
    # gemeinsam normalisieren, damit alle Ebenen zusammen nicht übersteuern
    k = 0.9 / np.abs(core + lead * 0.9 + tense * 0.8).max()
    for name, x in (('run_core', core), ('run_lead', lead), ('run_tense', tense)):
        write_wav(f'{out}/{name}.wav', x * k, peak=np.abs(x * k).max())
    write_wav(f'{out}/menu.wav', menu(), 0.8)
    write_wav(f'{out}/gameover.wav', gameover(), 0.85)
    write_wav(f'{out}/unlock.wav', unlock(), 0.85)
    print('Loop-Länge Lauf-Musik:', round(LOOP, 3), 's')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '.')
