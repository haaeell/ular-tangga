"""Render the original Ular Tangga Cinta piano waltz to a bundled WAV.

Requires NumPy only when regenerating the track; game playback has no dependency.
"""

from pathlib import Path
import sys
import wave

import numpy as np


RATE = 32000
BEAT = 60 / 72
BAR = 3 * BEAT
BAR_COUNT = 16
FRAMES = round(BAR_COUNT * BAR * RATE)
MIX = np.zeros((FRAMES, 2), dtype=np.float64)

# A 16-bar melody written for this game. Each bar contains (beat, length, MIDI note).
MELODY = [
    [(0, 1, 74), (1, .5, 73), (1.5, .5, 71), (2, 1, 69)],
    [(0, 1, 73), (1, 1.5, 76), (2.5, .5, 78)],
    [(0, 1.5, 78), (1.5, .5, 76), (2, 1, 74)],
    [(0, .75, 73), (.75, .75, 70), (1.5, 1.5, 73)],
    [(0, 1, 71), (1, 1, 74), (2, 1, 79)],
    [(0, 1, 78), (1, 1, 76), (2, 1, 74)],
    [(0, 1.5, 71), (1.5, .5, 67), (2, 1, 69)],
    [(0, 1, 73), (1, 1, 71), (2, 1, 76)],
    [(0, 1.5, 78), (1.5, .5, 76), (2, 1, 74)],
    [(0, 1, 71), (1, 1, 73), (2, 1, 74)],
    [(0, 1.5, 76), (1.5, .5, 74), (2, 1, 71)],
    [(0, 1, 69), (1, 1, 74), (2, 1, 73)],
    [(0, 1, 66), (1, .5, 69), (1.5, .5, 73), (2, 1, 76)],
    [(0, 1.5, 74), (1.5, .5, 73), (2, 1, 71)],
    [(0, 1, 67), (1, 1, 71), (2, 1, 74)],
    [(0, 1, 73), (1, 1, 76), (2, 1, 69)],
]

# Root, arpeggio notes and warm string notes for each bar.
HARMONY = [
    (38, [50, 54, 57, 61, 64, 57], [62, 66, 69]),  # Dmaj9
    (37, [49, 52, 57, 61, 64, 57], [61, 64, 69]),  # A/C#
    (35, [47, 50, 54, 57, 62, 54], [59, 62, 66]),  # Bm7
    (42, [54, 58, 61, 64, 70, 61], [58, 61, 64]),  # F#7
    (31, [43, 47, 50, 54, 59, 50], [55, 59, 62]),  # Gmaj7
    (30, [42, 45, 50, 54, 57, 50], [54, 57, 62]),  # D/F#
    (28, [40, 43, 47, 50, 55, 47], [52, 55, 59]),  # Em7
    (33, [45, 49, 52, 55, 59, 52], [57, 61, 64]),  # A7
    (38, [50, 54, 57, 61, 64, 57], [62, 66, 69]),
    (35, [47, 50, 54, 57, 62, 54], [59, 62, 66]),
    (31, [43, 47, 50, 54, 59, 50], [55, 59, 62]),
    (33, [45, 50, 52, 55, 59, 52], [57, 62, 64]),  # A7sus
    (30, [42, 45, 49, 52, 57, 49], [54, 57, 61]),  # F#m7
    (35, [47, 50, 54, 57, 62, 54], [59, 62, 66]),
    (28, [40, 43, 47, 50, 55, 47], [52, 55, 59]),
    (33, [45, 49, 52, 55, 59, 52], [57, 61, 64]),
]


def frequency(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def add_note(midi, start, length, volume, pan=0, instrument="piano"):
    begin = round(start * RATE)
    count = min(round((length + (1.2 if instrument == "piano" else .8)) * RATE), FRAMES - begin)
    if count <= 0:
        return
    t = np.arange(count) / RATE
    freq = frequency(midi)
    if instrument == "piano":
        harmonics = (1, .44, .21, .115, .065, .037)
        body = sum(
            weight * np.sin(2 * np.pi * freq * partial * (1 + .00015 * partial**2) * t)
            * np.exp(-(0.55 + partial * .32) * t)
            for partial, weight in enumerate(harmonics, 1)
        )
        envelope = (1 - np.exp(-75 * t)) * np.exp(-3.2 * np.maximum(t - length, 0))
    else:
        body = np.sin(2 * np.pi * freq * t) + .22 * np.sin(2 * np.pi * freq * 2.01 * t)
        envelope = (1 - np.exp(-3.5 * t)) * np.exp(-2.1 * np.maximum(t - length, 0))
    note = body * envelope * volume
    left = np.sqrt((1 - pan) / 2)
    right = np.sqrt((1 + pan) / 2)
    MIX[begin:begin + count, 0] += note * left
    MIX[begin:begin + count, 1] += note * right


for bar, (bass, arpeggio, strings) in enumerate(HARMONY):
    start = bar * BAR
    add_note(bass, start, 1.7 * BEAT, .067, -.2)
    for beat, midi in enumerate(arpeggio):
        add_note(midi, start + beat * BEAT / 2, .83 * BEAT, .036 if beat % 2 else .043,
                 -.42 if beat % 2 else .3)
    for midi in strings:
        add_note(midi, start, 2.75 * BEAT, .011, .4 if midi % 2 else -.4, "strings")
    for beat, length, midi in MELODY[bar]:
        add_note(midi, start + beat * BEAT, length * BEAT * .93, .115, .08)

# Short stereo reflections give the piano a small-room sound without masking the melody.
DRY = MIX.copy()
for delay, gain in ((.11, .14), (.19, .11), (.31, .09), (.47, .075), (.71, .055)):
    shift = round(delay * RATE)
    MIX[shift:, 0] += DRY[:-shift, 1] * gain
    MIX[shift:, 1] += DRY[:-shift, 0] * gain

edge = round(.12 * RATE)
MIX[:edge] *= np.linspace(0, 1, edge)[:, None]
MIX[-edge:] *= np.linspace(1, 0, edge)[:, None]
MIX *= .88 / max(np.max(np.abs(MIX)), 1e-9)

destination = Path(sys.argv[1] if len(sys.argv) > 1 else "romantic-theme.wav")
destination.parent.mkdir(parents=True, exist_ok=True)
pcm = (MIX * 32767).astype("<i2")
with wave.open(str(destination), "wb") as output:
    output.setnchannels(2)
    output.setsampwidth(2)
    output.setframerate(RATE)
    output.writeframes(pcm.tobytes())
print(f"Wrote {destination}: {BAR_COUNT * BAR:.1f}s, stereo, {RATE} Hz")
