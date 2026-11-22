#!/usr/bin/env python3
"""resources.arsc 全量解析器（Clock 9.3 取证）— 纯标准库。
输出：
  arsc93-full.tsv    全资源行：hexid, type, config, name, value（字符串/颜色/dimen/float 全解码）
  styles93.tsv       style 条目：id, name, parent(已解 id 链), attr_raw→value
用法：python3 desc93-arsc.py <resources.arsc> <outdir>
"""
import sys, struct, os

def parse_pool(data, off):
    typ, hs, sz, sc, stc, flags, sstr, ssty = struct.unpack_from('<HHIIIIII', data, off)
    utf8 = bool(flags & (1 << 8))
    out = []
    if sc == 0: return out
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

COMPLEX_UNITS = {0: 'px', 1: 'dp', 2: 'sp', 3: 'pt', 4: 'in', 5: 'mm'}
FRACTION_UNITS = {0: '%', 1: '%p'}
RADIX_MULTS = {0: 1 / 256, 1: 1 / 32768, 2: 1 / 8388608, 3: 1 / 2147483648}

def complex_to_float(dat):
    return (dat & 0xffffff00) * RADIX_MULTS[(dat >> 4) & 3]

def decode_val(typ, dat, gstrings):
    if typ == 0x03:  # string
        return gstrings[dat] if dat < len(gstrings) else f'@str#{dat}'
    if typ == 0x12:  # bool
        return 'true' if dat == 0xffffffff else 'false'
    if typ == 0x10:  # int
        v = dat if dat < 0x80000000 else dat - 0x100000000
        return f'{v}i'
    if typ == 0x11:  # int hex
        return f'0x{dat:08x}'
    if typ == 0x04:  # IEEE float
        f = struct.unpack('<f', struct.pack('<I', dat))[0]
        return f'{f:g}f'
    if typ == 0x05:  # dimension: mantissa bits 8-31, radix bits 4-7, unit bits 0-3
        unit = COMPLEX_UNITS.get(dat & 0xf)
        if unit is None:
            return f'raw{dat:08x}'
        val = complex_to_float(dat)
        return f'{val:g}{unit}'
    if typ == 0x06:  # fraction
        unit = FRACTION_UNITS.get(dat & 0xf, 'raw%')
        val = complex_to_float(dat)
        return f'{val:g}{unit}'
    if 0x1c <= typ <= 0x20:  # colors
        if typ == 0x1c: return f'#{dat:08x}'
        if typ == 0x1f: return f'#{dat:06x}'
        if typ == 0x1d: return f'#{dat:04x}'
        if typ == 0x1e: return f'#{dat:04x}argb4'
        return f'#{dat:08x}rgb2'
    if typ == 0x01: return f'@ref/0x{dat:08x}'
    return f'raw:{dat:08x}/t{typ:02x}'

def main(path, outdir):
    data = open(path, 'rb').read()
    gstrings = parse_pool(data, 12)
    pos = 12
    p2, phs, psz = struct.unpack_from('<HHI', data, 12)
    pos = 12 + psz
    full_rows, style_rows = [], []
    while pos + 8 <= len(data):
        ct, chs, csz = struct.unpack_from('<HHI', data, pos)
        if ct == 0x0200:
            idf = struct.unpack_from('<I', data, pos + 8)[0]
            tstrOff = struct.unpack_from('<I', data, pos + 268)[0]
            kstrOff = struct.unpack_from('<I', data, pos + 276)[0]
            tstrings = parse_pool(data, pos + tstrOff) if tstrOff else []
            kstrings = parse_pool(data, pos + kstrOff) if kstrOff else []
            # 第一遍：先扫全部，构建 0x7f attr / style / resource id→(type,name) 表
            walk(data, pos + chs, pos + csz, tstrings, kstrings, idf, gstrings, full_rows, style_rows)
        pos += csz
    os.makedirs(outdir, exist_ok=True)
    with open(os.path.join(outdir, 'arsc93-full.tsv'), 'w') as f:
        f.write('\n'.join(full_rows))
    with open(os.path.join(outdir, 'styles93.tsv'), 'w') as f:
        f.write('\n'.join(style_rows))
    print(f'full={len(full_rows)} styles={len(style_rows)}')

def walk(data, start, end, tstrings, kstrings, pkg_id, gstrings, full_rows, style_rows):
    pos = start
    while pos + 8 <= end:
        ct, chs, csz = struct.unpack_from('<HHI', data, pos)
        if csz <= 0 or ct not in (0x0201, 0x0202):
            if csz <= 0: break
            pos += csz; continue
        if ct != 0x0201:
            pos += csz; continue
        tid = data[pos + 8]
        entryCount = struct.unpack_from('<I', data, pos + 12)[0]
        entriesStart = struct.unpack_from('<I', data, pos + 16)[0]
        cfg = data[pos + 20:pos + entriesStart]
        cfgstr = config_str(cfg)
        tname = tstrings[tid - 1] if tid - 1 < len(tstrings) else f't{tid}'
        sparse = bool(struct.unpack_from('<H', data, pos + 10)[0] & 0x01)
        for i in range(entryCount):
            eo = pos + chs + i * 4
            if eo + 4 > len(data): break
            eoff = struct.unpack_from('<I', data, eo)[0]
            if sparse:
                ei = eoff >> 16; off16 = eoff & 0xffff
                if off16 == 0xffff: continue
                ep = pos + entriesStart + off16 * 4
            else:
                if eoff == 0xffffffff: continue
                ep = pos + entriesStart + eoff; ei = i
            if ep + 8 > len(data): continue
            size, flags16 = struct.unpack_from('<HH', data, ep)
            kidx = struct.unpack_from('<I', data, ep + 4)[0]
            key = kstrings[kidx] if kidx < len(kstrings) else f'k{kidx}'
            rid = (pkg_id << 24) | (tid << 16) | (ei if sparse else i)
            head = f'0x{rid:08x}\t{tname}\t{cfgstr}\t{key}'
            if flags16 & 0x0001:  # complex → style/attr bag
                parent = struct.unpack_from('<I', data, ep + 8)[0]
                count = struct.unpack_from('<I', data, ep + 12)[0]
                mp = ep + size  # map 起点严格按 entry.size（ResTable_map_entry 16，含扩展可能更大）
                bag = []
                for k in range(count):
                    aname, = struct.unpack_from('<I', data, mp)
                    dsize, dres0, dtyp, ddat = struct.unpack_from('<HBBI', data, mp + 4)
                    aval = decode_val(dtyp, ddat, gstrings)
                    bag.append(f'@{aname:08x}={aval}')
                    mp += 12  # ResTable_map = name(4) + Res_value(8)
                style_rows.append(f'0x{rid:08x}\t{tname}\t{key}\tparent=0x{parent:08x}\t' + '\t'.join(bag))
                full_rows.append(f'{head}\t@bag({count} attrs;parent 0x{parent:08x})')
            else:
                vo = ep + 8
                if size >= 8:
                    dsize, dres0, dtyp, ddat = struct.unpack_from('<HBBI', data, vo)
                    full_rows.append(f'{head}\t{decode_val(dtyp, ddat, gstrings)}')
                else:
                    full_rows.append(f'{head}\t@empty')
        pos += csz

def config_str(cfg):
    if len(cfg) < 4: return ''
    cfgsz, = struct.unpack_from('<H', cfg, 0)
    if cfgsz < 28: return ''
    mcc, mnc = struct.unpack_from('<HH', cfg, 2)
    lang = cfg[8:10].decode('ascii', 'replace').strip('\0')
    ctry = cfg[10:12].decode('ascii', 'replace').strip('\0')
    orient = cfg[12]
    density = struct.unpack_from('<H', cfg, 14)[0]
    sw = struct.unpack_from('<H', cfg, 24)[0] if cfgsz >= 28 else 0
    w = struct.unpack_from('<H', cfg, 26)[0] if cfgsz >= 28 else 0
    h = struct.unpack_from('<H', cfg, 28)[0] if cfgsz >= 30 else 0
    parts = []
    if lang: parts.append(lang + ctry)
    if density: parts.append({120: 'ldpi', 160: 'mdpi', 240: 'hdpi', 320: 'xhdpi', 480: 'xxhdpi', 640: 'xxxhdpi'}.get(density, f'{density}dpi'))
    if sw: parts.append(f'sw{sw}dp')
    if w and h: parts.append(f'{w}x{h}')
    return '-'.join(parts)

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
