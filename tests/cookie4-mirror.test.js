import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf-8');

/**
 * v8.18 · #44 —— 四芒星（cookie4）尖角过重：doRepeat 镜像参数误传修正
 *
 * 根因（androidx MaterialShapes.kt 实证，L477-484）：
 *   官方 cookie4() = customPolygon(listOf(
 *       PointNRound(Offset(1.237f, 1.236f), CornerRounding(0.258f)),
 *       PointNRound(Offset(0.500f, 0.918f), CornerRounding(0.233f))), reps = 4)
 *   —— 未传 mirroring → 默认 false（旋转重复 8 顶点）。
 *   md3 移植误传 mirror=true：镜像分支产生 4 对 0.0005 级近重复谷部顶点，
 *   buildOutline 邻接钳位把谷部 0.233 圆角吞成微弧锐谷 → 谷峰比例失衡，
 *   尖角视觉过重（议题实锤「尖角做得有点重」）。
 *
 * 判别数学（单位化 bbox [0,1]²，中心 (0.5,0.5)）：
 *   修复版：谷部 reflex 圆角凸起 —— 谷向（0°/90°/180°/270° ±3°）轮廓最大半径 ≈ 0.4396
 *   镜像版：锐谷顶点在场 —— 谷向最大半径 ≈ 谷顶点距 0.2836（(0.918−0.5)/1.474）
 *   分离度 0.156 —— 阈值 0.35 居中；尖向（45°±3°）两版同为 0.6002（尖弧不受 sliver 影响）
 *   注：轮廓含弧采样固有 0 距相邻重复点（全部七形皆有，非本缺陷特征，不作判据）。
 */
describe('v8.18 · #44 cookie4 镜像参数修正（四芒星尖角过重）', () => {
  const m3eJs = src('ios-desktop/js/m3e.js');
  const miniJs = src('ios-desktop/apps/translate/m3e-mini.js');

  const valleyMaxR = (shape) => {
    let m = 0;
    for (const [x, y] of shape) {
      const ang = ((Math.atan2(y - 0.5, x - 0.5) * 180) / Math.PI + 360) % 360;
      const dev = Math.min(Math.abs(ang - 90), Math.abs(ang - 270), Math.abs(ang), Math.abs(ang - 180));
      if (dev < 3) m = Math.max(m, Math.hypot(x - 0.5, y - 0.5));
    }
    return m;
  };
  const tipMinR = (shape) => {
    let m = Infinity;
    for (const [x, y] of shape) {
      const ang = ((Math.atan2(y - 0.5, x - 0.5) * 180) / Math.PI + 360) % 360;
      const dev = Math.min(Math.abs(ang - 45), Math.abs(ang - 135), Math.abs(ang - 225), Math.abs(ang - 315));
      if (dev < 3) m = Math.min(m, Math.hypot(x - 0.5, y - 0.5));
    }
    return m;
  };

  test('源码锚定：cookie4 doRepeat 第 5 参 false（宿主 + 三份 mini 副本），官方原值不动', () => {
    expect(m3eJs).toContain('[pt(1.237, 1.236, 0.258), pt(0.500, 0.918, 0.233)], 4, 0.5, 0.5, false)));');
    // 防过修：官方明确 mirroring=true 的两形（pentagon/pill）保留
    expect(m3eJs).toContain('[pt(0.500, -0.009, 0.172), pt(1.030, 0.365, 0.164), pt(0.828, 0.970, 0.169)], 1, 0.5, 0.5, true)));');
    expect(m3eJs).toContain('[pt(0.961, 0.039, 0.426), pt(1.001, 0.428), pt(1.000, 0.609, 1.0)], 2, 0.5, 0.5, true)));');
    // 三份 mini 副本同修（v777 字节一致约束）
    for (const p of ['apps/_shared/m3e-mini.js', 'apps/messages/m3e-mini.js', 'apps/translate/m3e-mini.js']) {
      expect(src(`ios-desktop/${p}`)).toContain('4, 0.5, 0.5, false)));');
    }
  });

  test('行为级·谷部圆角恢复：谷向（±3°）轮廓最大半径 ≈ 0.440（reflex 凸起），阈值 > 0.38', async () => {
    const { M3E_LOADER_SHAPES } = await import(join(ROOT, 'ios-desktop/js/m3e.js'));
    const vm = valleyMaxR(M3E_LOADER_SHAPES[5]);
    expect(vm).toBeGreaterThan(0.38);
    expect(vm).toBeLessThan(0.48); // 上界守卫：谷不得外溢至尖区（尖 0.600）
  });

  test('行为级·镜像缺陷签名对照：测试内重建镜像版（false→true）——谷向 0.332 锐谷化 + 尖向 0.665 尖角化', async () => {
    const fakeWindow = {};
    const mirrorMini = miniJs.replace('4, 0.5, 0.5, false)));', '4, 0.5, 0.5, true)));');
    new Function('window', mirrorMini)(fakeWindow);
    const mirrorShapes = fakeWindow.__m3eMini.shapes;
    const vmMirror = valleyMaxR(mirrorShapes[5]);
    const tipMirror = tipMinR(mirrorShapes[5]);
    expect(vmMirror).toBeLessThan(0.36); // 谷部圆角被吞（实测 0.332 vs 修复 0.440）
    expect(tipMirror).toBeGreaterThan(0.63); // 尖角过重直接量化（实测 0.665 贴近锐顶 0.707，修复 0.600）
    // 与修复版双指标分离度实证
    const { M3E_LOADER_SHAPES } = await import(join(ROOT, 'ios-desktop/js/m3e.js'));
    expect(valleyMaxR(M3E_LOADER_SHAPES[5]) - vmMirror).toBeGreaterThan(0.08);
    expect(tipMirror - tipMinR(M3E_LOADER_SHAPES[5])).toBeGreaterThan(0.03);
  });

  test('行为级·尖角圆滑守卫：尖向（±3°）轮廓最小半径 ≈ 0.600（0.258 尖弧削角；锐顶 0.707），区间锚定', async () => {
    const { M3E_LOADER_SHAPES } = await import(join(ROOT, 'ios-desktop/js/m3e.js'));
    const tr = tipMinR(M3E_LOADER_SHAPES[5]);
    expect(tr).toBeGreaterThan(0.55); // 尖顶点 0.707 被削至 0.600 = 圆滑
    expect(tr).toBeLessThan(0.63);
  });

  test('mini 同构：__m3eMini.shapes[5]（cookie4）与宿主逐点一致（双端同步修正）', async () => {
    const { M3E_LOADER_SHAPES } = await import(join(ROOT, 'ios-desktop/js/m3e.js'));
    const fakeWindow = {};
    new Function('window', miniJs)(fakeWindow);
    const mini = fakeWindow.__m3eMini;
    expect(mini.shapes[5].length).toBe(M3E_LOADER_SHAPES[5].length);
    for (let k = 0; k < mini.shapes[5].length; k++) {
      expect(mini.shapes[5][k][0]).toBeCloseTo(M3E_LOADER_SHAPES[5][k][0], 10);
      expect(mini.shapes[5][k][1]).toBeCloseTo(M3E_LOADER_SHAPES[5][k][1], 10);
    }
  });

  test('morph 链完整性：七形两两形变缓冲重建无断裂', async () => {
    const { M3E_LOADER_MORPHS } = await import(join(ROOT, 'ios-desktop/js/m3e.js'));
    expect(M3E_LOADER_MORPHS).toHaveLength(7);
    for (const m of M3E_LOADER_MORPHS) {
      expect(m).toBeTruthy();
      expect(m.a.length).toBeGreaterThan(0);
      expect(m.b.length).toBeGreaterThan(0);
    }
  });
});
