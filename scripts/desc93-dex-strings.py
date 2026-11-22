#!/usr/bin/env python3
"""dex 字符串池提取器：解析 classes*.dex 的 string_ids 表 → 全部字符串。"""
import sys, struct

def parse_dex_strings(data):
    # dex header: magic(8) checksum(4) sig(20) file_size(4) header_size(4) endian(4) link(8) map(8) string_ids_size(4) string_ids_off(4) ...
    string_ids_size = struct.unpack_from('<I', data, 0x38)[0]
    string_ids_off = struct.unpack_from('<I', data, 0x3c)[0]
    out = []
    for i in range(string_ids_size):
        soff = struct.unpack_from('<I', data, string_ids_off + i * 4)[0]
        # MUTF-8: uleb128 length then bytes
        p = soff
        def uleb(p):
            r = 0; s = 0
            while True:
                b = data[p]; p += 1
                r |= (b & 0x7f) << s
                if not b & 0x80: break
                s += 7
            return r, p
        n, p = uleb(p)
        raw = data[p:p + n]
        out.append(raw.decode('utf-8', 'replace'))
    return out

if __name__ == '__main__':
    all_s = []
    for path in sys.argv[1:]:
        data = open(path, 'rb').read()
        ss = parse_dex_strings(data)
        all_s.append((path, ss))
        print(f'{path}: {len(ss)} strings', file=sys.stderr)
    with open('/tmp/apk93/dex-strings.txt', 'w') as f:
        for path, ss in all_s:
            for s in ss:
                f.write(s + '\n')
