#!/usr/bin/env python3
# ==================== gen-sample-midis.py — v8.51 #56 示例 MIDI 生成器 ====================
# 公有领域曲目程序化编码（零外网依赖，离线沙箱无法下载外部 MIDI 文件）：
#   1. ode-to-joy.mid   —— 贝多芬《欢乐颂》（1824，Op.125 主旋律 + 和弦伴奏，公有领域）
#   2. twinkle.mid      —— 《小星星》（法国民谣 Ah! vous dirai-je, maman，1761，公有领域）
# 输出：ios-desktop/apps/midi-player/assets/*.mid（format 0 / 单轨 / 480 TPQ / 钢琴音色）
# 同时落 docs 校验：输出每文件的字节数/音符数供 vitest 锚定。

import struct, os

TPQ = 480  # ticks per quarter note

def vlq(n):
    """MIDI variable-length quantity 编码"""
    out = [n & 0x7F]
    n >>= 7
    while n:
        out.append((n & 0x7F) | 0x80)
        n >>= 7
    return bytes(reversed(out))

def track(events):
    """events: [(tick, [bytes...]), ...] 按时间排序后转 delta-time 流"""
    events = sorted(events, key=lambda e: e[0])
    data = b''
    last = 0
    for tick, evs in events:
        data += vlq(tick - last)
        for ev in evs:
            data += ev
        last = tick
    data += vlq(0) + b'\xff\x2f\x00'  # end of track
    return b'MTrk' + struct.pack('>I', len(data)) + data

def note_on(tick, note, vel=90, ch=0):
    return (tick, [bytes([0x90 | ch, note, vel])])

def note_off(tick, note, ch=0):
    return (tick, [bytes([0x80 | ch, note, 0])])

def build(format_, ntrks, division, tracks):
    head = b'MThd' + struct.pack('>IHHH', 6, format_, ntrks, division)
    return head + b''.join(tracks)

# ---------- 曲目 1：欢乐颂（主旋律 + 根音伴奏） ----------
# C 大调，四四拍。旋律 E E F G | G F E D | C C D E | E. D D-（两段）
MELODY = [
    # (pitch, start_beat, dur_beats)
    ('E4', 0, 1), ('E4', 1, 1), ('F4', 2, 1), ('G4', 3, 1),
    ('G4', 4, 1), ('F4', 5, 1), ('E4', 6, 1), ('D4', 7, 1),
    ('C4', 8, 1), ('C4', 9, 1), ('D4', 10, 1), ('E4', 11, 1),
    ('E4', 12, 1.5), ('D4', 13.5, 0.5), ('D4', 14, 2),
    ('E4', 16, 1), ('E4', 17, 1), ('F4', 18, 1), ('G4', 19, 1),
    ('G4', 20, 1), ('F4', 21, 1), ('E4', 22, 1), ('D4', 23, 1),
    ('C4', 24, 1), ('C4', 25, 1), ('D4', 26, 1), ('E4', 27, 1),
    ('D4', 28, 1.5), ('C4', 29.5, 0.5), ('C4', 30, 2),
]
# 和弦伴奏（每两拍一个根音+五音，C/G/C/G 循环）
CHORDS = [
    ('C3', 0, 2), ('G3', 0, 2), ('C3', 2, 2), ('G3', 2, 2),
    ('C3', 4, 2), ('G3', 4, 2), ('G2', 6, 2), ('D3', 6, 2),
    ('C3', 8, 2), ('G3', 8, 2), ('C3', 10, 2), ('G3', 10, 2),
    ('G2', 12, 2), ('D3', 12, 2), ('G2', 14, 2), ('D3', 14, 2),
    ('C3', 16, 2), ('G3', 16, 2), ('C3', 18, 2), ('G3', 18, 2),
    ('C3', 20, 2), ('G3', 20, 2), ('G2', 22, 2), ('D3', 22, 2),
    ('C3', 24, 2), ('G3', 24, 2), ('C3', 26, 2), ('G3', 26, 2),
    ('G2', 28, 2), ('D3', 28, 2), ('C3', 30, 2), ('G3', 30, 2),
]
NOTE_MAP = {'C2': 36, 'D2': 38, 'E2': 40, 'F2': 41, 'G2': 43, 'A2': 45, 'B2': 47,
            'C3': 48, 'D3': 50, 'E3': 52, 'F3': 53, 'G3': 55, 'A3': 57, 'B3': 59,
            'C4': 60, 'D4': 62, 'E4': 64, 'F4': 65, 'G4': 67, 'A4': 69, 'B4': 71,
            'C5': 72}

def events_from_notes(notes, ch=0, vel=90):
    evs = []
    for pitch, start, dur in notes:
        n = NOTE_MAP[pitch]
        s = int(round(start * TPQ))
        e = int(round((start + dur) * TPQ)) - 2  # 略提前 2 tick 防同 tick 重叠
        evs.append(note_on(s, n, vel, ch))
        evs.append(note_off(e, n, ch))
    return evs

def make_ode():
    tempo = int(60_000_000 / 120)  # 120 BPM
    evs = [(0, [b'\xff\x51\x03' + struct.pack('>I', tempo)[1:]]),
           (0, [bytes([0xC0, 0])])]  # program 0 = Acoustic Grand Piano
    evs += events_from_notes(MELODY, ch=0, vel=100)
    evs += events_from_notes(CHORDS, ch=1, vel=60)  # ch1 也走 program 0（format0 单轨共享）
    return build(0, 1, TPQ, [track(evs)])

# ---------- 曲目 2：小星星（单旋律） ----------
TWINKLE = [
    ('C4', 0, 1), ('C4', 1, 1), ('G4', 2, 1), ('G4', 3, 1),
    ('A4', 4, 1), ('A4', 5, 1), ('G4', 6, 2),
    ('F4', 8, 1), ('F4', 9, 1), ('E4', 10, 1), ('E4', 11, 1),
    ('D4', 12, 1), ('D4', 13, 1), ('C4', 14, 2),
    ('G4', 16, 1), ('G4', 17, 1), ('F4', 18, 1), ('F4', 19, 1),
    ('E4', 20, 1), ('E4', 21, 1), ('D4', 22, 2),
    ('G4', 24, 1), ('G4', 25, 1), ('F4', 26, 1), ('F4', 27, 1),
    ('E4', 28, 1), ('E4', 29, 1), ('D4', 30, 2),
    ('C4', 32, 1), ('C4', 33, 1), ('G4', 34, 1), ('G4', 35, 1),
    ('A4', 36, 1), ('A4', 37, 1), ('G4', 38, 2),
    ('F4', 40, 1), ('F4', 41, 1), ('E4', 42, 1), ('E4', 43, 1),
    ('D4', 44, 1), ('D4', 45, 1), ('C4', 46, 2),
]

def make_twinkle():
    tempo = int(60_000_000 / 100)  # 100 BPM
    evs = [(0, [b'\xff\x51\x03' + struct.pack('>I', tempo)[1:]]),
           (0, [bytes([0xC0, 0])])]
    evs += events_from_notes(TWINKLE, ch=0, vel=95)
    return build(0, 1, TPQ, [track(evs)])

def count_notes(data):
    """统计 note-on (0x9n, vel>0) 事件数"""
    # 简易扫描：跳过 MThd，逐轨解析 delta+event（仅统计本实现写入的事件形态）
    i = 14  # MThd(14B)
    n = 0
    assert data[i:i+4] == b'MTrk'
    # format0 单轨，直接扫到末尾
    body = data[i+8:]
    j = 0
    while j < len(body):
        # delta vlq
        while body[j] & 0x80:
            j += 1
        j += 1
        b0 = body[j]
        if b0 == 0xFF:  # meta
            typ, ln = body[j+1], body[j+2]
            j += 3 + ln
        elif b0 & 0xF0 in (0x90, 0x80):
            if b0 & 0xF0 == 0x90 and body[j+2] > 0:
                n += 1
            j += 3
        elif b0 & 0xF0 == 0xC0:
            j += 2
        else:
            raise ValueError('unexpected status %02x at %d' % (b0, j))
    return n

if __name__ == '__main__':
    outdir = os.path.join(os.path.dirname(__file__), '..', 'ios-desktop', 'apps', 'midi-player', 'assets')
    os.makedirs(outdir, exist_ok=True)
    for name, fn in [('ode-to-joy.mid', make_ode), ('twinkle.mid', make_twinkle)]:
        data = fn()
        p = os.path.join(outdir, name)
        with open(p, 'wb') as f:
            f.write(data)
        print(f'{name}: {len(data)} bytes, notes={count_notes(data)}, MThd ok={data[:4]==b"MThd"}, fmt={struct.unpack(">H", data[8:10])[0]}, trks={struct.unpack(">H", data[10:12])[0]}')
