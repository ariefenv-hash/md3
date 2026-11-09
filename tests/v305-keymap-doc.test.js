// tests/v305-keymap-doc.test.js — #305 全局键位契约（keymap.md 真源生成 + 对账）锚
//
// 覆盖面：
//   A 生成器结构锚：scripts/gen-keymap-doc.mjs 头注立契（#305 + 单真源禁手改 + --check 模式 +
//     MD3_KEYMAP_PATH 阴性钩子声明）；package.json 已挂 check:keymap 闸；
//   B 生成件对账：docs/keymap.md / docs/keymap-inventory.json 存在且 --check 逐字节可重现
//     （check:apps-doc / check:docs-index 同律）；
//   C 组合键契约：三接线点与源码逐字面交叉核对——power_long_press（quick-settings，500ms =
//     POWER_LONG_PRESS_MS 导出真值）/ accessibility_shortcut（volume-dialog，3000ms =
//     ACCESSIBILITY_CHORD_HOLD_MS）/ screenshot_sysrq（volume-dialog，Ctrl+Shift+S hold 0）；
//   D 注册表与比较点实存：keydown 注册点（bindings）与键面比较点（comparisons）每行 site
//     逐一 fs 实存——注册行真含 addEventListener('keydown'，比较行真含 .key ===/!== 字面；
//     op 字段只允许 === / !== 两值；守卫面（!==）与消费面（===）口径分离；
//   E 裁决面（源码实证复核）：D 键 / A 键 verdict 含「成立」；inventory === 面零 'd'/'D'/'a'/'A'
//     键面消费；lock-screen.js 全文件零 keydown 注册（fs 扫描复核，解锁手势-only）；
//   F README 挂链：README.md 项目约定段含 docs/keymap.md 链接行（处置建议②）；
//   G 阴性钩子（MD3_KEYMAP_PATH，仅测试用）：临时副本删 taskbar Escape 注册行 / 加 'q' 键面 →
//     --check 即红（exit≠0）且盘上生成件零污染（前后逐字节一致 + 临时文件清理铁律）；
//   H docs-index 联动：docs/index.md 已收录 keymap.md 与 keymap-inventory.json（check:docs-index 生成面）。
//
// 车道边界：本文件只锚 #305 交付面（生成器 + 两生成件 + package.json check:keymap 闸 +
// README 挂链）；不改 ios-desktop/js 产品源码（零产品变更车道声明，认领帖 6730618946 在案）。

import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync, copyFileSync, unlinkSync } from 'node:fs';
import { execSync, spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MD_PATH = join(ROOT, 'docs/keymap.md');
const JSON_PATH = join(ROOT, 'docs/keymap-inventory.json');
const GEN = join(ROOT, 'scripts/gen-keymap-doc.mjs');

const inv = () => JSON.parse(readFileSync(JSON_PATH, 'utf8'));

describe('v305 · A 生成器结构锚', () => {
  it('scripts/gen-keymap-doc.mjs 存在且头注立契 #305（单真源 + --check + 阴性钩子声明）', () => {
    expect(existsSync(GEN)).toBe(true);
    const head = readFileSync(GEN, 'utf8').slice(0, 2600);
    expect(head).toContain('#305');
    expect(head).toContain('单真源');
    expect(head).toContain('--check');
    expect(head).toContain('MD3_KEYMAP_PATH');
    expect(head).toContain('keymap-inventory.json');
  });

  it('package.json 已挂 check:keymap 闸（--check 模式）', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    expect(pkg.scripts['check:keymap']).toBe('node scripts/gen-keymap-doc.mjs --check');
  });
});

describe('v305 · B 生成件对账', () => {
  it('docs/keymap.md 与 docs/keymap-inventory.json 均实存且互为单真源对', () => {
    expect(existsSync(MD_PATH)).toBe(true);
    expect(existsSync(JSON_PATH)).toBe(true);
    const md = readFileSync(MD_PATH, 'utf8');
    expect(md).toContain('# 全局键位契约（keymap.md · #305）');
    expect(md).toContain('生成件单真源，禁手改');
    expect(md).toContain('无时间戳');
  });

  it('--check 逐字节可重现（exit 0）', () => {
    const r = spawnSync('node', [GEN, '--check'], { cwd: ROOT, encoding: 'utf8' });
    expect(r.status, r.stderr || r.stdout).toBe(0);
  });
});

describe('v305 · C 组合键契约（与源码交叉核对）', () => {
  const wiring = () => inv().dispatcherWiring;

  it('三接线点在账：power_long_press / accessibility_shortcut / screenshot_sysrq', () => {
    const ids = wiring().map((w) => w.chordId).sort();
    expect(ids).toEqual(['accessibility_shortcut', 'power_long_press', 'screenshot_sysrq']);
  });

  it('power_long_press：quick-settings 接线 500ms = POWER_LONG_PRESS_MS 导出真值', () => {
    const w = wiring().find((x) => x.chordId === 'power_long_press');
    expect(w.wiring.startsWith('js/quick-settings.js:')).toBe(true);
    expect(w.holdMs).toBe(500);
    expect(w.holdMsSrc).toBe('POWER_LONG_PRESS_MS');
    expect(w.keys).toEqual(['power']);
    // 源码字面交叉：接线行真在 quick-settings.js，常量真值 500 在 key-dispatcher.js 导出
    const qs = readFileSync(join(ROOT, 'ios-desktop', w.wiring.split(':')[0].replace(/^js\//, 'js/')), 'utf8');
    expect(qs).toContain("chords: [{ id: 'power_long_press', keys: ['power'], holdMs: POWER_LONG_PRESS_MS }]");
    const kd = readFileSync(join(ROOT, 'ios-desktop/js/aosp/key-dispatcher.js'), 'utf8');
    expect(kd).toContain('export const POWER_LONG_PRESS_MS = 500');
    expect(w.sinks.join()).toContain('openPowerDialog');
  });

  it('accessibility_shortcut：volume-dialog 接线 3000ms + 双音量键', () => {
    const w = wiring().find((x) => x.chordId === 'accessibility_shortcut');
    expect(w.wiring.startsWith('js/volume-dialog.js:')).toBe(true);
    expect(w.holdMs).toBe(3000);
    expect(w.holdMsSrc).toBe('ACCESSIBILITY_CHORD_HOLD_MS');
    expect(w.keys).toEqual(['volume-up', 'volume-down']);
    const kd = readFileSync(join(ROOT, 'ios-desktop/js/aosp/key-dispatcher.js'), 'utf8');
    expect(kd).toContain('export const ACCESSIBILITY_CHORD_HOLD_MS = 3000');
  });

  it('screenshot_sysrq：Ctrl+Shift+S 齐按 hold 0（铁律#2 超越边界标注）', () => {
    const w = wiring().find((x) => x.chordId === 'screenshot_sysrq');
    expect(w.keys).toEqual(['control', 'shift', 's']);
    expect(w.holdMs).toBe(0);
    expect(w.holdMsSrc).toBe('literal');
    expect(w.sinks.join()).toContain('screenshot');
  });
});

describe('v305 · D 注册表与比较点实存', () => {
  it('keydown 注册点每行 fs 实存：site 行真含 addEventListener(…keydown…', () => {
    const rows = inv().bindings;
    expect(rows.length).toBeGreaterThanOrEqual(30);
    for (const b of rows) {
      const [rel, ln] = [b.site.split(':')[0], Number(b.site.split(':')[1])];
      const line = readFileSync(join(ROOT, 'ios-desktop', rel), 'utf8').split('\n')[ln - 1];
      expect(line, b.site).toContain("addEventListener('keydown'");
      expect(['document', 'window', 'element']).toContain(b.target);
      expect(typeof b.capture).toBe('boolean');
    }
  });

  it('键面比较点每行 fs 实存：比较行真含 .key ===/!== 字面；op 两值封域；键面非空', () => {
    const rows = inv().comparisons;
    expect(rows.length).toBeGreaterThanOrEqual(55);
    for (const c of rows) {
      const [rel, ln] = [c.site.split(':')[0], Number(c.site.split(':')[1])];
      const line = readFileSync(join(ROOT, 'ios-desktop', rel), 'utf8').split('\n')[ln - 1];
      expect(line, c.site).toMatch(/\.key\s*(===|!==)\s*['"]/);
      expect(['===', '!==']).toContain(c.op);
      expect(typeof c.key).toBe('string');
      expect(c.key.length).toBeGreaterThan(0);
      expect(c.key).not.toBe('undefined');
    }
  });

  it('守卫面（!==）与消费面（===）口径分离：sidebubble 守卫在账且消费面判定不受污染', () => {
    const rows = inv().comparisons;
    const guard = rows.find((r) => r.site === 'js/sidebubble.js:504');
    expect(guard).toBeTruthy();
    expect(guard.op).toBe('!==');
    expect(guard.key).toBe('Escape');
    // 消费面（===）中不得出现守卫行
    expect(rows.some((r) => r.site === 'js/sidebubble.js:504' && r.op === '===')).toBe(false);
  });

  it('Escape 仲裁表：17 处消费面齐账且相位序单调（capture → bubble → 移位殿后）', () => {
    const esc = inv().escapeArbitration;
    expect(esc.length).toBe(17);
    const rank = (r) => (r.contextCapture === true ? 0 : r.contextCapture === false ? 1 : 2);
    for (let i = 1; i < esc.length; i++) expect(rank(esc[i - 1]) <= rank(esc[i])).toBe(true);
    // 源码事实：全树零 capture 相位 Escape 字面比较（aod activity capture 不消费键面；
    // sidebubble/torch 守卫在具名处理器内）→ 仲裁序以 bubble 开段、移位/具名殿后收尾
    expect(rank(esc[0])).toBe(1);
    expect(rank(esc[esc.length - 1])).toBe(2);
    expect(esc.some((r) => r.site === 'js/sidebubble.js:504' && rank(r) === 2)).toBe(true);
  });
});

describe('v305 · E 裁决面（源码实证复核）', () => {
  it('D 键裁决「成立」：=== 消费面零 d/D + lock-screen.js 全文件零 keydown 注册', () => {
    const v = inv().verdicts.dKey;
    expect(v.verdict).toContain('成立');
    expect(v.bound).toBe(false);
    expect(v.lockScreenKeydownSites).toBe(0);
    expect(v.unlockGestureAnchor).toMatch(/^js\/lock-screen\.js:\d+$/);
    // fs 复核：lock-screen.js 无 keydown 注册 + === 消费面零 d/D
    const ls = readFileSync(join(ROOT, 'ios-desktop/js/lock-screen.js'), 'utf8');
    expect(ls).not.toContain("addEventListener('keydown'");
    const consume = inv().comparisons.filter((r) => r.op === '===').map((r) => r.key);
    expect(consume).not.toContain('d');
    expect(consume).not.toContain('D');
  });

  it('A 键裁决「成立」：=== 消费面零 a/A + aod 任意键 activity 源锚实存', () => {
    const v = inv().verdicts.aKey;
    expect(v.verdict).toContain('成立');
    expect(v.bound).toBe(false);
    expect(v.aodAnyKeyActivityAnchor).toBe('js/aod-ui.js:132');
    const aod = readFileSync(join(ROOT, 'ios-desktop/js/aod-ui.js'), 'utf8').split('\n');
    expect(aod[131]).toContain("addEventListener('keydown'");
    const consume = inv().comparisons.filter((r) => r.op === '===').map((r) => r.key);
    expect(consume).not.toContain('a');
    expect(consume).not.toContain('A');
  });
});

describe('v305 · F README 挂链', () => {
  it('README.md 项目约定段含 docs/keymap.md 契约链接行（#305 处置建议②）', () => {
    const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
    expect(readme).toContain('docs/keymap.md');
    expect(readme).toContain('#305');
    expect(readme).toContain('D 键不解锁为设计意图');
  });
});

describe('v305 · G 阴性钩子（MD3_KEYMAP_PATH，仅测试用）', () => {
  const TMP = join(tmpdir(), 'v305-taskbar-mutated.js');
  const docBefore = readFileSync(MD_PATH, 'utf8');
  const jsonBefore = readFileSync(JSON_PATH, 'utf8');

  it('G1 注册行删除 → --check 红（exit≠0）且盘上生成件零污染', () => {
    const src = readFileSync(join(ROOT, 'ios-desktop/js/taskbar.js'), 'utf8');
    const mutated = src.replace("if (e.key === 'Escape') closeOverflowPanel();", '// v305 阴性钩子：Escape 注册行删除');
    expect(mutated).not.toBe(src);
    writeFileSync(TMP, mutated);
    try {
      const r = spawnSync('node', [GEN, '--check'], {
        cwd: ROOT,
        encoding: 'utf8',
        env: { ...process.env, MD3_KEYMAP_PATH: TMP },
      });
      expect(r.status).not.toBe(0);
      // 盘上生成件零污染（备份-恢复铁律：生成器 --check 不写盘）
      expect(readFileSync(MD_PATH, 'utf8')).toBe(docBefore);
      expect(readFileSync(JSON_PATH, 'utf8')).toBe(jsonBefore);
    } finally {
      if (existsSync(TMP)) unlinkSync(TMP);
    }
    expect(existsSync(TMP)).toBe(false);
  });

  it('G2 外来键面（q）注入 → --check 红（exit≠0）且盘上生成件零污染', () => {
    const src = readFileSync(join(ROOT, 'ios-desktop/js/taskbar.js'), 'utf8');
    const mutated = src.replace(
      "if (e.key === 'Escape') closeOverflowPanel();",
      "if (e.key === 'q') closeOverflowPanel(); // v305 阴性钩子：外来键面",
    );
    expect(mutated).not.toBe(src);
    writeFileSync(TMP, mutated);
    try {
      const r = spawnSync('node', [GEN, '--check'], {
        cwd: ROOT,
        encoding: 'utf8',
        env: { ...process.env, MD3_KEYMAP_PATH: TMP },
      });
      expect(r.status).not.toBe(0);
      expect(readFileSync(MD_PATH, 'utf8')).toBe(docBefore);
      expect(readFileSync(JSON_PATH, 'utf8')).toBe(jsonBefore);
    } finally {
      if (existsSync(TMP)) unlinkSync(TMP);
    }
    expect(existsSync(TMP)).toBe(false);
  });
});

describe('v305 · H docs-index 联动', () => {
  it('docs/index.md 已收录 keymap.md 与 keymap-inventory.json（check:docs-index 生成面）', () => {
    const idx = readFileSync(join(ROOT, 'docs/index.md'), 'utf8');
    expect(idx).toContain('keymap.md');
    expect(idx).toContain('keymap-inventory.json');
  });
});
