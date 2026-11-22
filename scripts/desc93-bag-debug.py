#!/usr/bin/env python3
"""调试单个 style 条目的 bag 结构：打印 entry 原始字节与逐步解码。"""
import sys, struct

def parse_pool(data, off):
    typ, hs, sz, sc, stc, flags, sstr, ssty = struct.unpack_from('<HHIIIIII', data, off)
    utf8 = bool(flags & (1 << 8))
    out = []
    offs = [struct.unpack_from('<I', data, off + hs + i * 4)[0] for i in range(sc)]
    base = off + sstr
    for so in offs:
        p = base + so
        if utf8:
            def u8len(p):
                b = data[p]; p += 1
                if b & 0x80:
                    b = ((b & 0x7f) << 8) | data[p]; p += 1
                return b, p
            n, p = u8len(p); nb, p = u8len(p)
            out.append(data[p:p + nb].decode('utf-8', 'replace'))
        else:
            n = struct.unpack_from('<H', data, p)[0]; p += 2
            if n & 0x8000:
                n = ((n & 0x7fff) << 16) | struct.unpack_from('<H', data, p)[0]; p += 2
            out.append(data[p:p + n * 2].decode('utf-16-le', 'replace'))
    return out

def main(path, rid_want):
    data = open(path, 'rb').read()
    gstrings = parse_pool(data, 12)
    pos = 12
    p2, phs, psz = struct.unpack_from('<HHI', data, 12)
    pos = 12 + psz
    want = int(rid_want, 16)
    while pos + 8 <= len(data):
        ct, chs, csz = struct.unpack_from('<HHI', data, pos)
        if ct == 0x0200:
            pid = struct.unpack_from('<I', data, pos + 8)[0]
            if (want >> 24) != pid:
                pos += csz; continue
            pos = pos + chs  # 进入 package 内部 chunk 区
            continue
        if ct != 0x0201:
            pos += csz; continue
        tid = data[pos + 8]
        if (want >> 16) & 0xff != tid:
            pos += csz; continue
        entryCount = struct.unpack_from('<I', data, pos + 12)[0]
        entriesStart = struct.unpack_from('<I', data, pos + 16)[0]
        sparse = bool(struct.unpack_from('<H', data, pos + 10)[0] & 0x01)
        for i in range(entryCount):
            eo = pos + chs + i * 4
            eoff = struct.unpack_from('<I', data, eo)[0]
            if sparse:
                ei = eoff >> 16; off16 = eoff & 0xffff
                if off16 == 0xffff: continue
                ep = pos + entriesStart + off16 * 4
            else:
                if eoff == 0xffffffff: continue
                ep = pos + entriesStart + eoff; ei = i
            if (want & 0xffff) != ei: continue
            size, flags16 = struct.unpack_from('<HH', data, ep)
            print(f'entry at ep=0x{ep:x} size={size} flags={flags16:04x}')
            parent = struct.unpack_from('<I', data, ep + 8)[0]
            count = struct.unpack_from('<I', data, ep + 12)[0]
            print(f'parent=0x{parent:08x} count={count} size_field={size}')
            mp = ep + size
            for k in range(count):
                if mp + 8 > len(data): break
                aname = struct.unpack_from('<I', data, mp)[0]
                dsize, dres0, dtyp, ddat = struct.unpack_from('<HBBI', data, mp + 4)
                print(f'  [{k}] mp=0x{mp:x} attr=0x{aname:08x} vsize={dsize} res0={dres0} dtype={dtyp:#x} dat=0x{ddat:08x}')
                mp += 8
            print('  tail hex:', data[mp:mp+32].hex())
            return
        pos += csz

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
