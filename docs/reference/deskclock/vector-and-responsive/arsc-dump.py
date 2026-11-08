#!/usr/bin/env python3
"""resources.arsc 解析器 — 提取 资源ID→(type,name,config/值) 映射。
纯标准库。输出 TSV：hexid  type  config  name  value(仅简单类型)
"""
import sys, struct

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

COMPLEX_UNITS = {0:'px',1:'dip',2:'sp',3:'pt',4:'in',5:'mm'}
COMPLEX_FRACTION = {0:'%',1:'%p'}

def decode_val(typ, dat):
    if typ == 0x03: return None  # string: 需要 str 池 idx（上层处理）
    if typ == 0x12: return 'true' if dat == 0xffffffff else 'false'
    if typ == 0x10: return str(dat if dat < 0x80000000 else dat - 0x100000000)
    if typ in (0x04, 0x05):
        f = struct.unpack('<f', struct.pack('<I', dat))[0]
        return f'{f:g}'
    if typ == 0x01: return None
    return f'raw:{dat:08x}/t{typ:02x}'

def walk_type_chunk(data, start, end, tstrings, kstrings, pkg_id, out_rows):
    pos = start
    while pos + 8 <= end:
        ct, chs, csz = struct.unpack_from('<HHI', data, pos)
        if csz <= 0: break
        if ct == 0x0001:  # string pool in type chunk? (values 文件是独立的，arsc 里 TYPE_TYPE=0x0201)
            pos += csz; continue
        if ct in (0x0201, 0x0202):  # RES_TABLE_TYPE_TYPE / SPEC
            is_type = ct == 0x0201
            if is_type:
                tid = data[pos + 8]
                entryCount = struct.unpack_from('<I', data, pos + 12)[0]
                entriesStart = struct.unpack_from('<I', data, pos + 16)[0]
                # config: pos+20 起到 pos+entriesStart
                cfg = data[pos + 20:pos + entriesStart]
                # ResTable_config: size(2) mcc(2) mnc(2) language(2) country(2) orientation(1) touchscreen(1) density(2)...
                if len(cfg) >= 16:
                    cfgsz, mcc, mnc = struct.unpack_from('<HHH', cfg, 0)
                    lang = cfg[8:10].decode('ascii', 'replace') if len(cfg) >= 10 else ''
                    ctry = cfg[10:12].decode('ascii', 'replace') if len(cfg) >= 12 else ''
                    orient = cfg[12] if len(cfg) >= 13 else 0
                    density = struct.unpack_from('<H', cfg, 14)[0] if len(cfg) >= 16 else 0
                    parts = []
                    if mcc: parts.append(f'mcc{mcc}')
                    if lang.strip('\0'): parts.append(lang.replace('\0','') + (ctry.replace('\0','')))
                    ormap = {0:'',1:'port',2:'land'}
                    parts.append(ormap.get(orient, f'or{orient}'))
                    dn = {0:'',120:'ldpi',160:'mdpi',240:'hdpi',320:'xhdpi',480:'xxhdpi',640:'xxxhdpi'}.get(density, f'd{density}dpi' if density else '')
                    if dn: parts.append(dn)
                    # sw/w 限定符在 cfg 更后字段（screenLayout 等），简化不解析
                    cfgstr = '-'.join(p for p in parts if p)
                else:
                    cfgstr = '?'
                tname = tstrings[tid - 1] if tid - 1 < len(tstrings) else f't{tid}'
                # sparse 格式检测：ResTable_type flags 在 res1 字段 (pos+10, 2字节)
                sparse = bool(struct.unpack_from('<H', data, pos + 10)[0] & 0x01)
                for i in range(entryCount):
                    eo = pos + chs + i * 4
                    if eo + 4 > len(data): break
                    eoff = struct.unpack_from('<I', data, eo)[0]
                    if sparse:
                        ei = eoff >> 16
                        off16 = eoff & 0xffff
                        if off16 == 0xffff: continue
                        ep = pos + entriesStart + off16 * 4
                    else:
                        if eoff == 0xffffffff: continue
                        ep = pos + entriesStart + eoff
                    if ep + 8 > len(data): continue
                    size, flags16 = struct.unpack_from('<HH', data, ep)
                    kidx = struct.unpack_from('<I', data, ep + 4)[0]
                    key = kstrings[kidx] if kidx < len(kstrings) else f'k{kidx}'
                    rid = (pkg_id << 24) | (tid << 16) | (ei if sparse else i)
                    if flags16 & 0x0001:  # complex entry
                        out_rows.append(f'0x{rid:08x}\t{tname}\t{cfgstr}\t{key}\t@complex')
                        continue
                    vo = ep + 8
                    if size >= 8:
                        dsize, dres0, dtyp, ddat = struct.unpack_from('<HBBI', data, vo)
                        if dtyp == 0x03:
                            # string value: 引用全局字符串池（此简化版输出 idx）
                            out_rows.append(f'0x{rid:08x}\t{tname}\t{cfgstr}\t{key}\t@str#{ddat}')
                        else:
                            v = decode_val(dtyp, ddat)
                            out_rows.append(f'0x{rid:08x}\t{tname}\t{cfgstr}\t{key}\t{v}')
        pos += csz

def main(path, outpath):
    data = open(path, 'rb').read()
    # ResTable_header: header(8) + packageCount(4)；全局池 @12
    gstrings = parse_pool(data, 12)
    pos = 12
    p2, phs, psz = struct.unpack_from('<HHI', data, 12)
    pos = 12 + psz
    rows = []
    while pos + 8 <= len(data):
        ct, chs, csz = struct.unpack_from('<HHI', data, pos)
        if ct == 0x0200:  # RES_TABLE_PACKAGE_TYPE
            pid = struct.unpack_from('<I', data, pos + 8)[0]
            tstrOff, tstrCnt, kstrOff, kstrCnt = struct.unpack_from('<IIII', data, pos + 268) if False else (None,)*4
            # ResTable_package header: id(4) name(256B) typeStrings(4) lastPublicType(4) keyStrings(4) lastPublicKey(4)
            # 结构: header(8) + id(4) + name(128*2) + typeStrings(4) + lastPublicType(4) + keyStrings(4) + lastPublicKey(4) = 8+4+256+16=284
            idf = struct.unpack_from('<I', data, pos + 8)[0]
            typeStringsOff = struct.unpack_from('<I', data, pos + 268)[0]
            keyStringsOff = struct.unpack_from('<I', data, pos + 276)[0]
            tstrings = parse_pool(data, pos + typeStringsOff) if typeStringsOff else []
            kstrings = parse_pool(data, pos + keyStringsOff) if keyStringsOff else []
            walk_type_chunk(data, pos + chs, pos + csz, tstrings, kstrings, idf, rows)
        pos += csz
    with open(outpath, 'w') as f:
        f.write('\n'.join(rows))
    print(f'共 {len(rows)} 条资源映射 → {outpath}')

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
