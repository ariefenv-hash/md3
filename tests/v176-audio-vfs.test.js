// ==================== v176-audio-vfs.test.js — #176 一期音频数据打通 v9.15 ====================
//
// #176 一期（数据打通优先，不合并 UI）：radio/midi-player/piano/bytebeat 四应用创作产物
// 沉淀 VFS（复用既有 fsWrite 链路，不新建存储范式）：
//   · bytebeat：存曲库按钮（当前公式 → /music/bytebeat/formula_<ts>.txt）+ 收藏镜像 favorites.json
//   · radio：自定义流存档镜像 → /music/radio/custom.json（url 去重，上限 50）
//   · midi-player：导入 .mid 写侧补缺 → /music/midi/<name>（原只读不写，#176 实证表 ❌ 的缺口）
// piano 实测无录音功能（rg record/录音 0 命中），一期不含；二期共享音频模块时一并考虑。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BB = readFileSync(join(ROOT, 'ios-desktop/apps/bytebeat/index.html'), 'utf-8');
const RD = readFileSync(join(ROOT, 'ios-desktop/apps/radio/index.html'), 'utf-8');
const MP = readFileSync(join(ROOT, 'ios-desktop/apps/midi-player/app.mjs'), 'utf-8');

describe('v9.15 #176 一期：音频创作产物沉淀 VFS', () => {
  it('bytebeat：存曲库按钮 + formula_<ts>.txt + 收藏镜像 favorites.json 在册', () => {
    expect(BB).toContain('id="bbSaveVfs"'); // 「⤓ 存曲库」入口
    expect(BB).toContain("'/music/bytebeat/' + name");
    expect(BB).toContain("'/music/bytebeat/favorites.json'");
    expect(BB).toContain('syncFavsVfs();'); // 收藏增删两处镜像调用
    expect((BB.match(/syncFavsVfs\(\);/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(BB).toContain('.catch(function () {})'); // fire-and-forget 不阻塞播放
  });
  it('radio：自定义流镜像 /music/radio/custom.json（url 去重 + 上限 50 + 损档重建）', () => {
    expect(RD).toContain("'/music/radio/custom.json'");
    expect(RD).toContain("'radio-custom'"); // 格式契约标记
    expect(RD).toContain("s.url !== url"); // 去重
    expect(RD).toContain('list.length > 50'); // 上限
    expect(RD).toContain('存档失败不影响播放'); // fire-and-forget 语义留痕
  });
  it('midi-player：导入 .mid 写侧补缺（/music/midi/<name> + 成功即刷库列表）', () => {
    expect(MP).toContain("'/music/midi/' + f.name");
    expect(MP).toContain("fsCall('write'"); // 复用既有 FS 桥（不新建范式）
    expect(MP).toContain('refreshVfsList();'); // 成功后新文件立即可选
    expect(MP).toContain('已存入曲库');
  });
  it('各应用不合并 UI（#176 明确「不是要合成一个应用」）——仅数据链路落点', () => {
    // 三文件均为既有应用内增量接入，无应用注册变更（importCount 恒 48 由 v180/v150 把关）
    expect(BB).not.toContain('apps-data');
    expect(RD).not.toContain('apps-data');
    expect(MP).not.toContain('apps-data');
  });
  it('版本真源 9.17.0（v150 同口径）', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
    expect(pkg.version).toBe('10.11.0');
    const readme = readFileSync(join(ROOT, 'README.md'), 'utf-8');
    expect(readme).toContain('v10.11');
  });
});
