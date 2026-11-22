// ==================== launcher-clock-icon.test.js — v11.53 动态时钟图标真源化 ====================
// 用户铁律：不要 svg/CSS 制造样式 —— APK 里面内置的有。实现链逐字对齐：
//   1. APK AndroidManifest.xml meta-data 7 键（本沙箱 axml-dump.py 实测 base.apk）：
//      com.android.launcher3.LEVEL_PER_TICK_ICON_ROUND → @0x7f110000 launcher_clock = res/RJ.xml
//      HOUR_LAYER_INDEX=1 / MINUTE_LAYER_INDEX=2 / SECOND_LAYER_INDEX=3（RJ.xml 前景层序 0=占位）
//      DEFAULT_HOUR=10 / DEFAULT_MINUTE=10 / DEFAULT_SECOND=30
//   2. res/RJ.xml（axml-all93.txt 实录）：background=launcher_clock_face；
//      foreground layer-list = 占位 + rotate(hour from=300 to=5300) + rotate(minute from=60
//      to=60060) + rotate(second from=180 to=6180 level="300") + banner；pivot 0.5/0.5。
//   3. AOSP iconloaderlib ClockDrawableWrapper.applyTime（LawnchairLauncher 镜像实拉）：
//      convertedX = (当前值 + (周期 - defaultX)) % 周期 → setLevel(...)；
//      RotateDrawable：angle = from + (to - from) × level / 10000。
//   4. 位图资产 = APK base.apk res/{pp,C5,vD,7_}.webp（xxxhdpi 432×432，sha256 在锚内）。
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { launcherClockAngles, createDynamicIconHTML } from '../ios-desktop/js/dynamic-icons.js';

const ROOT = process.cwd();
const read = (p) => readFileSync(join(ROOT, p), 'utf-8');

const ASSET_SHA256 = {
  // base.apk res/pp.webp / C5.webp / vD.webp / 7_.webp 入库原样
  face: '549811f1d284c1b6a8eb4f540342e8a60eb57b6eb489a1aa76e5bc45cf0994fd',
  hour: '5df6406f3148906be3aae38e032d5682215ef18f8d842911c2660badf08ae09b',
  minute: '4b074009a0146482d46e6643df319c6d23a96ffb4995c1f01029b426e693a803',
  second: '1a8fd1a9ad2c46acc4976c4e249fedaeb2fb9648c678058504607efb6b62d043',
};

describe('v11.53 动态时钟图标：APK 内置位图资产入库', () => {
  it('四资产在位（face/hour/minute/second xxxhdpi webp）', () => {
    for (const name of ['face', 'hour', 'minute', 'second']) {
      const p = join(ROOT, 'ios-desktop/assets/icons/launcher-clock', name + '.webp');
      expect(existsSync(p), name).toBe(true);
      expect(statSync(p).size, name).toBeGreaterThan(1000);
    }
  });

  it('sha256 与 base.apk 提取源逐字节一致（真源非手绘）', async () => {
    const { createHash } = await import('node:crypto');
    for (const [name, sha] of Object.entries(ASSET_SHA256)) {
      const buf = readFileSync(join(ROOT, 'ios-desktop/assets/icons/launcher-clock', name + '.webp'));
      expect(createHash('sha256').update(buf).digest('hex')).toBe(sha);
    }
  });
});

describe('v11.53 动态时钟图标：applyTime × RotateDrawable 源码公式', () => {
  const mk = (h, m, s) => new Date(2026, 10, 22, h, m, s);

  it('default 时刻 10:10:30 自洽：三针落位 = 位图 from 基线（300°/60°/180° 体系）', () => {
    const a = launcherClockAngles(mk(10, 10, 30));
    // convertedHour=(10+2)%12=0 → hourLevel=10 → 300+0.5×10=305（10 点 + 10 分进位）
    expect(a.hour).toBe('305.00');
    // minuteLevel=10×60+(10+50)%60=600 → 60+6×600=3660 ≡ 60°（10 分方向）
    expect(parseFloat(a.minute) % 360).toBeCloseTo(60, 5);
    // secondLevel=(30+30)%60×10=0 → 180°（30 秒方向，位图秒针段基线）
    expect(parseFloat(a.second) % 360).toBeCloseTo(180, 5);
  });

  it('秒针每秒 +6°（LEVELS_PER_SECOND=10 × 0.6°/level）', () => {
    const a0 = launcherClockAngles(mk(3, 0, 0));
    const a1 = launcherClockAngles(mk(3, 0, 1));
    const a5 = launcherClockAngles(mk(3, 0, 5));
    expect(parseFloat(a1.second) - parseFloat(a0.second)).toBeCloseTo(6, 5);
    expect(parseFloat(a5.second) - parseFloat(a0.second)).toBeCloseTo(30, 5);
  });

  it('分针每分钟 +6°（span 60000 → 6°/level·分）', () => {
    const a0 = launcherClockAngles(mk(3, 0, 0));
    const a1 = launcherClockAngles(mk(3, 1, 0));
    expect(parseFloat(a1.minute) - parseFloat(a0.minute)).toBeCloseTo(6, 5);
  });

  it('时针每分钟 +0.5°、12 小时整圈闭合（span 5000 → 0.5°/level·分）', () => {
    const a0 = launcherClockAngles(mk(3, 0, 0));
    const a1 = launcherClockAngles(mk(3, 1, 0));
    expect(parseFloat(a1.hour) - parseFloat(a0.hour)).toBeCloseTo(0.5, 5);
    // 3 点 → 15 点（同 12h 相位）：convertedHour 循环，角度 mod 360 相等
    const am = launcherClockAngles(mk(15, 30, 0));
    const ap = launcherClockAngles(mk(3, 30, 0));
    expect(parseFloat(am.hour) % 360).toBeCloseTo(parseFloat(ap.hour) % 360, 5);
  });

  it('3:00 时针落位 90°（12 点基准位图 + 旋转量与钟面读数一致）', () => {
    const a = launcherClockAngles(mk(3, 0, 0));
    expect(parseFloat(a.hour) % 360).toBeCloseTo(90, 5);
    const b = launcherClockAngles(mk(12, 0, 0));
    // 12 点：convertedHour=(0+2)%12=2 → level=120+0 → 300+60=360 ≡ 0°
    expect(parseFloat(b.hour) % 360).toBeCloseTo(0, 5);
  });
});

describe('v11.53 动态时钟图标：结构与接线锚', () => {
  it('createDynamicIconHTML("clock")：位图四层结构 + id 前缀 + 首帧 inline 角度', () => {
    const html = createDynamicIconHTML('clock', false);
    expect(html).toContain('dynamic-clock-icon');
    expect(html).toContain('lc-face');
    expect(html).toContain('id="grid_hourHand"');
    expect(html).toContain('id="grid_minuteHand"');
    expect(html).toContain('id="grid_secondHand"');
    expect(html).toContain('transform:rotate(');
    expect(html).toContain('face.webp');
    expect(html).toContain('hour.webp');
    expect(html).toContain('minute.webp');
    expect(html).toContain('second.webp');
    // 启动屏前缀
    const launch = createDynamicIconHTML('clock', true);
    expect(launch).toContain('id="launch_hourHand"');
    // 退役断言：不再有 CSS div 手绘指针/刻度
    expect(html).not.toContain('clock-hand');
    expect(html).not.toContain('clock-tick');
    expect(html).not.toContain('clock-center-dot');
  });

  it('资产 URL 单源：相对主文档基准（iframe-app 同律，三构命中）', () => {
    const src = read('ios-desktop/js/dynamic-icons.js');
    // bundle 在 dist 落顶层 assets/ → import.meta.url 相对基准失效（vite 静态转换亦
    // 不稳：对象字面量仅首条、动态模板残留 ${e} —— e2e-dist #260/#299 双防线实拦）。
    // 相对主文档（/ios-desktop/ 基准）与 iframeAppContent('apps/…') 同律。
    expect(src).toContain("const LAUNCHER_CLOCK_BASE = 'assets/icons/launcher-clock/';");
    expect(src).not.toContain('import.meta.url');
    expect(src).toContain("launcherClockAsset('face')");
  });

  it('tick 接线：updateDynamicIcons 三针 id 经 launcherClockAngles 驱动（值比对去重保留）', () => {
    const src = read('ios-desktop/js/dynamic-icons.js');
    expect(src).toMatch(/const a = launcherClockAngles\(now\)/);
    expect(src).toMatch(/syncIconStyle\(p \+ 'hourHand', `rotate\(\$\{a\.hour\}deg\)`\)/);
    expect(src).toMatch(/syncIconStyle\(p \+ 'secondHand', `rotate\(\$\{a\.second\}deg\)`\)/);
    expect(src).toContain('syncIconStyle');
  });

  it('CSS 真源层：lc-hand pivot 50% 50%（RotateDrawable 同构）+ 旧手绘类退役', () => {
    const css = read('ios-desktop/css/dynamic-icons.css');
    expect(css).toContain('.dynamic-clock-icon .lc-hand');
    expect(css).toContain('transform-origin: 50% 50%');
    expect(css).not.toMatch(/\.clock-face\s*\{/);
    expect(css).not.toMatch(/\.clock-tick\s*\{/);
    expect(css).not.toMatch(/\.hour-hand\s*\{/);
    expect(css).not.toMatch(/\.clock-center-dot\s*\{/);
  });

  it('clock93 注册：type="clock"（桌面/文件夹/全部应用/分屏/启动屏全联动）+ Gastown 深底', () => {
    const src = read('ios-desktop/js/apps/clock93.js');
    expect(src).toMatch(/type: 'clock'/);
    expect(src).toMatch(/bgColor: '#18181B'/);
    // 旧 #3C5A99 仅允许出现在退役注记注释，不得再作赋值字面
    expect(src).not.toMatch(/bgColor: '#3C5A99'/);
  });

  it('考证注释在源：manifest 7 键 + applyTime 公式 + from/to 实测值随源码在录', () => {
    const src = read('ios-desktop/js/dynamic-icons.js');
    expect(src).toContain('LEVEL_PER_TICK_ICON_ROUND');
    expect(src).toContain('ClockDrawableWrapper.applyTime');
    expect(src).toContain('defaultHour = 10');
    expect(src).toContain('LEVELS_PER_SECOND = 10');
    expect(src).toContain('300 + (5300 - 300)');
    expect(src).toContain('60 + (60060 - 60)');
    expect(src).toContain('180 + (6180 - 180)');
  });
});
