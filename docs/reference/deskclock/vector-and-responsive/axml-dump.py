#!/usr/bin/env python3
"""AXML 解析器 v2 — 修正 chunk 头与属性条目偏移。纯标准库。
用法：python3 axml-dump.py <file...>；stderr 报非 AXML。
"""
import sys, struct

def parse_string_pool(data, off):
    typ, hs, sz, sc, stc, flags, sstr, ssty = struct.unpack_from('<HHIIIIII', data, off)
    utf8 = bool(flags & (1 << 8))
    str_offs = [struct.unpack_from('<I', data, off + hs + i * 4)[0] for i in range(sc)]
    pool_base = off + sstr
    out = []
    for so in str_offs:
        p = pool_base + so
        if utf8:
            def u8len(p):
                b = data[p]; p += 1
                if b & 0x80:
                    b = ((b & 0x7f) << 8) | data[p]; p += 1
                return b, p
            n, p = u8len(p)
            nb, p = u8len(p)
            out.append(data[p:p + nb].decode('utf-8', 'replace'))
        else:
            n = struct.unpack_from('<H', data, p)[0]; p += 2
            if n & 0x8000:
                n = ((n & 0x7fff) << 16) | struct.unpack_from('<H', data, p)[0]; p += 2
            out.append(data[p:p + n * 2].decode('utf-16-le', 'replace'))
    return out

def dump(fpath):
    data = open(fpath, 'rb').read()
    if len(data) < 16:
        print(f'<!-- {fpath}: 太小 -->'); return
    t, hs, tsz = struct.unpack_from('<HHI', data, 0)
    if t != 0x0003:
        print(f'<!-- {fpath}: 非 AXML (type=0x{t:04x}) -->'); return
    strings = []
    pos = 8  # 顶层头固定 8 字节，子 chunk 从 8 开始
    # 先扫 string pool（可能后面才出现，但通常第一个）
    scan = pos
    while scan + 8 <= len(data):
        ct, chs, csz = struct.unpack_from('<HHI', data, scan)
        if ct == 0x0001:
            strings = parse_string_pool(data, scan)
            break
        if csz <= 0: break
        scan += csz
    depth = 0
    out = []
    while pos + 8 <= len(data):
        ctyp, chs, csz = struct.unpack_from('<HHI', data, pos)
        if csz <= 0: break
        if ctyp == 0x0102:  # START_TAG
            # node 头 16 字节(header8+lineNumber4+comment4)，attrExt @ pos+16
            ax = pos + 16
            ns, name = struct.unpack_from('<II', data, ax)
            attrStart, attrSize, attrCount = struct.unpack_from('<HHH', data, ax + 8)
            tag = strings[name] if name < len(strings) else f'@{name}'
            attrs = []
            for i in range(attrCount):
                ab = ax + attrStart + i * attrSize
                ans, aname, araw = struct.unpack_from('<III', data, ab)
                atyp = data[ab + 15]
                adata = struct.unpack_from('<I', data, ab + 16)[0]
                an = strings[aname] if aname < len(strings) else ''
                if araw < len(strings) and araw != 0xffffffff:
                    val = strings[araw]
                else:
                    if atyp == 0x12: val = 'true' if adata == 0xffffffff else 'false'
                    elif atyp == 0x10: val = str(adata if adata < 0x80000000 else adata - 0x100000000)
                    elif atyp == 0x04: val = f'@dim/0x{adata:08x}'
                    elif atyp == 0x05: val = f'@color/0x{adata:08x}'
                    elif atyp == 0x01: val = f'@ref/0x{adata:08x}'
                    else: val = f'@0x{adata:08x}/t{atyp:02x}'
                attrs.append((an, val))
            out.append('  ' * depth + f'<{tag}' + ''.join(f' {a}="{v}"' for a, v in attrs if a) + '>')
            depth += 1
        elif ctyp == 0x0103:  # END_TAG
            depth -= 1
            ax = pos + 16
            ns, name = struct.unpack_from('<II', data, ax)
            tag = strings[name] if name < len(strings) else f'@{name}'
            out.append('  ' * max(depth, 0) + f'</{tag}>')
        pos += csz
    print(f'<!-- FILE {fpath} -->')
    print('\n'.join(out))

if __name__ == '__main__':
    for f in sys.argv[1:]:
        try: dump(f)
        except Exception as e: print(f'<!-- {f}: parse error {e} -->')
