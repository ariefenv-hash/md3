#!/usr/bin/node
// gen-e2e-inventory.mjs — #272 e2e playwright 化三档清单化生成器（R151 窗 · Job 2932311 · 第 1 定时消息系列）
//
// 职责：
//   ① 对 scripts/e2e-*.mjs 全量裸脚本做只读盘点（零删除零改写零改名）：机械事实
//      （v 前缀 / 行数 / playwright 导入 / 产物写面信号 / npm+workflows 引用面）逐家登记；
//   ② 按 #272 卡面建议②分三档：A 常青回归候选（无 vNNN[a-z]?- 前缀）/ B 一次性取证
//      （有前缀，标记归档可运行保留）/ C 已被 smoke 覆盖删除候选（机械不可判——本批
//      规则性记 0，删除须逐脚本功能对账批，禁止机械判删）；
//   ③ 输出 docs/audits/e2e-inventory.json（内容全派生零时间戳，逐字节可重现）；
//      --check 模式重新生成并与盘上文件逐字节比对，不一致 exit 1（check:docs-index 同律）。
//
// 纯逻辑出口（测试锚钉扎面）：V_PREFIX_RE / detectArtifactSignals / classifyTier /
// buildInventory / verifyArtifact——missing-refs-triage.mjs 先例同律。
//
// 零依赖（node:fs/node:path only）；无时间戳输出。

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(new URL('..', import.meta.url).pathname);
const OUT = join(ROOT, 'docs/audits/e2e-inventory.json');
const SCAN_DIR = 'scripts';
const CHECK = process.argv.includes('--check');

// v 前缀判别：e2e-vNNN[a-z]?- 形态锚（#291 命名纪律 v\d+[a-z]?- 同族正则；
// 前缀锚定——e2e-live-v779.mjs 类中段引用不算前缀）
export const V_PREFIX_RE = /^e2e-v\d+[a-z]?-/;

// 产物写面信号（登记事实用，非档位判据）：这些信号命中说明脚本会改写盘上
// 基线/快照产物，接入 config projects 前须评审其写面行为
export const ARTIFACT_SIGNALS = ['--update', '--write', 'writeFileSync(', '--snapshot'];
export function detectArtifactSignals(text) {
  return ARTIFACT_SIGNALS.filter((s) => text.includes(s));
}

// 批 2 逐脚本评审批纠偏表（#272 §5 预留通道兑现：纠偏=OVERRIDES 表化，#291 KEEP 先例同律）。
// A 档是「候选」非「判定」：批 2 对 A 档前 10 家逐脚本实读评审（写面/时延/断言强度三维），
// 非 CI 可复跑常青面经本表纠偏至 B 档——每行附实读理由，评审卷=docs/e2e-playwright-adoption.md
// §6 评审批。新增纠偏必须：①逐脚本实读（禁机械判改）②本表+评审卷双登记 ③随再生清单落盘。
// classifyTier 单一真源语义不变：先机械判别，末查本表——未命中表 = 机械结果原样。
export const TIER_OVERRIDES = {
  'e2e-live-v779.mjs': {
    tier: 'B',
    reason: '线上站点实拍核验（v7.79 时点）：BASE=github.io 线上档外网依赖（违断网纪律）+ SW 版本断言钉扎 geek-v88 + 产物落绝对路径——一次性取证非 CI 常青面',
  },
  'e2e-probe-panel.mjs': {
    tier: 'B',
    reason: '无断言诊断探针：QS 面板展开 FLIP 逐帧截图观察，输出仅 console 打印零退出码断言——证据采集工具非回归门禁',
  },
  'e2e-probe2.mjs': {
    tier: 'B',
    reason: '无断言诊断探针：transform 时间线 + getAnimations 深度插桩打印，零退出码断言——同 probe-panel 证据采集形态',
  },
  'e2e-sweep-a1-compat.mjs': {
    tier: 'B',
    reason: 'Standing Sweep 第 4 轮批次取证：-webkit- 前缀 22 处/clip-path 兑底落地时点断言 + ROOT 绝对路径硬编码——轮次证据形态非常青回归',
  },
  'e2e-sweep-a2-compat-r8.mjs': {
    tier: 'B',
    reason: 'R8 轮次批次取证：R8 修复处零回归断言，CHROME/BASE 轮次常量硬编码——r 系列命名即轮次卷',
  },
  'e2e-sweep-a4-compat-r12.mjs': {
    tier: 'B',
    reason: 'R12 轮次批次取证：R12 修复处 computed 抽证 + 轮次常量硬编码',
  },
  'e2e-sweep-a5-compat-r16.mjs': {
    tier: 'B',
    reason: 'R16 轮次批次取证：R12 口径原样复验 + R16 增量抽证（A8/A9/C3）',
  },
  'e2e-sweep-a6-compat-r20.mjs': {
    tier: 'B',
    reason: 'R20 轮次批次取证：R12/R16 口径复验 + R17/R18/R19 新增面交叉抽证',
  },  'e2e-sweep-a7-compat-r24.mjs': {
    tier: 'B',
    reason: 'R24 轮次批次取证（A 类兼容性：口径原样复验+新增面交叉抽证， 时点断言；头注实读「// R24=A 类（兼容性）e2e：R12/R16/R20 口径原样复验 + R21/R22/R23 新增面兼容维度交」）',
  },
  'e2e-sweep-a8-compat-r28.mjs': {
    tier: 'B',
    reason: 'R28 轮次批次取证（A 类兼容性：口径原样复验+新增面交叉抽证， 时点断言；头注实读「// R28=A 类（兼容性）e2e：R12/R16/R20/R24 口径原样复验 + R25/R26/R27 新增面兼」）',
  },
  'e2e-sweep-a9-compat-r32.mjs': {
    tier: 'B',
    reason: 'R32 轮次批次取证（A 类兼容性：口径原样复验+新增面交叉抽证， 时点断言；头注实读「// R32=A 类（兼容性）e2e：R12/R16/R20/R24/R28 口径原样复验 + R29/R30/R31 」）',
  },
  'e2e-sweep-b1-device-matrix.mjs': {
    tier: 'B',
    reason: '#77 Standing Sweep 第二轮 B 类设备适配证据（七档尺寸冒烟矩阵；v8.46 时点断言）——轮次证据形态非常青回归',
  },
  'e2e-sweep-b2-device-r6.mjs': {
    tier: 'B',
    reason: 'R6 轮次批次取证（B 类设备适配：折叠序列/分屏 resize 轮次硬断言， 时点；头注实读「// ==================== e2e-sweep-b2-device-r6.mjs — #77 Sta」）',
  },
  'e2e-sweep-b3-device-r9.mjs': {
    tier: 'B',
    reason: 'R9 轮次批次取证（B 类设备适配：折叠序列/分屏 resize 轮次硬断言，v8.69 时点；头注实读「// R9=B 类（设备适配）巡查 e2e · v8.69」）',
  },
  'e2e-sweep-b4-device-r13.mjs': {
    tier: 'B',
    reason: 'R13 轮次批次取证（B 类设备适配：折叠序列/分屏 resize 轮次硬断言，v8.73 时点；头注实读「// R13=B 类（设备适配）巡查 e2e · v8.73（R9 后隔 3 轮回归；v8.70-72 连续零产品变更窗」）',
  },
  'e2e-sweep-b5-device-r17.mjs': {
    tier: 'B',
    reason: 'R17 轮次批次取证（B 类设备适配：折叠序列/分屏 resize 轮次硬断言，v8.77 时点；头注实读「// R17=B 类（设备适配）巡查 e2e · v8.77（R13 后隔 3 轮回归；v8.73-76 连续零产品变更」）',
  },
  'e2e-sweep-b6-device-r21.mjs': {
    tier: 'B',
    reason: 'R21 轮次批次取证（B 类设备适配：折叠序列/分屏 resize 轮次硬断言，v8.81 时点；头注实读「// R21=B 类（设备适配）巡查 e2e · v8.81（R17 后隔 3 轮回归；v8.77-80 连续零产品变更」）',
  },
  'e2e-sweep-b7-device-r25.mjs': {
    tier: 'B',
    reason: 'R25 轮次批次取证（B 类设备适配：折叠序列/分屏 resize 轮次硬断言，v8.85 时点；头注实读「// R25=B 类（设备适配）巡查 e2e · v8.85（R21 后隔 3 轮回归；v8.81-84 连续零产品变更」）',
  },
  'e2e-sweep-b8-device-r29.mjs': {
    tier: 'B',
    reason: 'R29 轮次批次取证（B 类设备适配：折叠序列/分屏 resize 轮次硬断言，v8.89 时点；头注实读「// R29=B 类（设备适配）巡查 e2e · v8.89（R25 后隔 3 轮回归；v8.85-88 连续零产品变更」）',
  },
  'e2e-sweep-b9-device-r33.mjs': {
    tier: 'B',
    reason: 'R33 轮次批次取证（B 类设备适配：折叠序列/分屏 resize 轮次硬断言，v8.93 时点；头注实读「// R33=B 类（设备适配）巡查 e2e · v8.93（R29 后隔 3 轮回归；v8.89-92 连续零产品变更」）',
  },
  'e2e-sweep-c1-clock-switch.mjs': {
    tier: 'B',
    reason: '#77 Standing Sweep 第一轮 C 类检查项③证据（clock-app 自绘 .m3-switch v7.39 规格钉扎：16/24/28px 行程 16px）——轮次证据形态',
  },
  'e2e-sweep-c10-ui-r34.mjs': {
    tier: 'B',
    reason: 'R34 轮次批次取证（C 类 UI 细节：transient 弹簧/排版一致性轮次判据，v8.94 时点；头注实读「// R34=C 类（UI 细节）巡查 e2e · v8.94（R30 后隔 3 轮回归窗口）」）',
  },
  'e2e-sweep-c2-ui-detail.mjs': {
    tier: 'B',
    reason: '#77 Standing Sweep 第 5 轮 C 类证据（描边+内层绝对定位重合全库审计 #78 时点）——轮次证据形态',
  },
  'e2e-sweep-c3-ui-r10.mjs': {
    tier: 'B',
    reason: 'R10 轮次批次取证（C 类 UI 细节：transient 弹簧/排版一致性轮次判据，v8.70 时点；头注实读「// R10=C 类（UI 细节）巡查 e2e · v8.70」）',
  },
  'e2e-sweep-c4-ui-r14.mjs': {
    tier: 'B',
    reason: 'R14 轮次批次取证（C 类 UI 细节：transient 弹簧/排版一致性轮次判据，v8.74 时点；头注实读「// R14=C 类（UI 细节）巡查 e2e · v8.74（R13 遗留指向 verbatim：R10 T 组 tr」）',
  },
  'e2e-sweep-c5-ui-r18.mjs': {
    tier: 'B',
    reason: 'R18 轮次批次取证（C 类 UI 细节：transient 弹簧/排版一致性轮次判据，v8.78 时点；头注实读「// R18=C 类（UI 细节）巡查 e2e · v8.78（R17 遗留指向 verbatim：R10/R14 T 」）',
  },
  'e2e-sweep-c6-ui-r22.mjs': {
    tier: 'B',
    reason: 'R22 轮次批次取证（C 类 UI 细节：transient 弹簧/排版一致性轮次判据，v8.82 时点；头注实读「// R22=C 类（UI 细节）巡查 e2e · v8.82（R18 后隔 3 轮回归；v8.78-81 连续零产品变」）',
  },
  'e2e-sweep-c7-ui-r26.mjs': {
    tier: 'B',
    reason: 'R26 轮次批次取证（C 类 UI 细节：transient 弹簧/排版一致性轮次判据，v8.86 时点；头注实读「// R26=C 类（UI 细节）巡查 e2e · v8.86（R22 后隔 3 轮回归；v8.82-85 连续零产品变」）',
  },
  'e2e-sweep-c8-ui-r30.mjs': {
    tier: 'B',
    reason: 'R30 轮次批次取证（C 类 UI 细节：transient 弹簧/排版一致性轮次判据，v8.90 时点；头注实读「// R30=C 类（UI 细节）巡查 e2e · v8.90（R26 后隔 3 轮回归；v8.85-89 连续零产品变」）',
  },
  'e2e-sweep-d1-frame-budget.mjs': {
    tier: 'B',
    reason: '#77 Standing Sweep 第三轮 D 类检查项①②③证据（应用开合全链路帧预算 rAF 分布 v8.47 时点）——轮次证据形态',
  },
  'e2e-sweep-d10-perf-r35.mjs': {
    tier: 'B',
    reason: 'R35 轮次批次取证（D 类性能：帧预算轮次判据 v8.95 时点；头注实读「// R35=D 类（性能）巡查 e2e · v8.95（R31 后隔 3 轮回归窗口）」）',
  },
  'e2e-sweep-d2-perf-r7.mjs': {
    tier: 'B',
    reason: 'R7 轮次批次取证（D 类性能：帧预算轮次判据  时点；头注实读「// ==================== e2e-sweep-d2-perf-r7.mjs — #77 Stand」）',
  },
  'e2e-sweep-d3-perf-r11.mjs': {
    tier: 'B',
    reason: 'R11 轮次批次取证（D 类性能：帧预算轮次判据 v8.71 时点；头注实读「// R11=D 类（性能）巡查 e2e · v8.71」）',
  },
  'e2e-sweep-d4-perf-r15.mjs': {
    tier: 'B',
    reason: 'R15 轮次批次取证（D 类性能：帧预算轮次判据 v8.75 时点；头注实读「// R15=D 类（性能）巡查 e2e · v8.75（R14 遗留指向 verbatim：R11 后隔 3 轮回归窗」）',
  },
  'e2e-sweep-d5-perf-r19.mjs': {
    tier: 'B',
    reason: 'R19 轮次批次取证（D 类性能：帧预算轮次判据 v8.79 时点；头注实读「// R19=D 类（性能）巡查 e2e · v8.79（R18 遗留指向 verbatim：R15 后隔 3 轮回归窗」）',
  },
  'e2e-sweep-d6-perf-r23.mjs': {
    tier: 'B',
    reason: 'R23 轮次批次取证（D 类性能：帧预算轮次判据 v8.83 时点；头注实读「// R23=D 类（性能）巡查 e2e · v8.83（R22 遗留指向 verbatim：R19 后隔 3 轮回归窗」）',
  },
  'e2e-sweep-d7-perf-r27.mjs': {
    tier: 'B',
    reason: 'R27 轮次批次取证（D 类性能：帧预算轮次判据 v8.87 时点；头注实读「// R27=D 类（性能）巡查 e2e · v8.87（R23 后隔 3 轮回归窗口，v8.84-86 连续零产品变更」）',
  },
  'e2e-sweep-d8-perf-r31.mjs': {
    tier: 'B',
    reason: 'R31 轮次批次取证（D 类性能：帧预算轮次判据 v8.91 时点；头注实读「// R31=D 类（性能）巡查 e2e · v8.91（R27 后隔 3 轮回归窗口，v8.85-90 连续零产品变更」）',
  },
  'e2e-u11-f1f3-r36.mjs': {
    tier: 'B',
    reason: 'R35 会话补收证据（#85-F1/F3 壁纸复合入口+主题色跳转链小判据，v8.96 时点）——轮次补收形态',
  },
  'e2e-v765.mjs': {
    tier: 'B',
    reason: 'v7.765 时点「真实浏览器核验」一次性取证卷（头注实读「e2e-v765.mjs — v7.65 真实浏览器逐帧核验」）——v 前缀裸数形态（无行为后缀缀点）机械正则缺口，#291 命名纪律延伸批留改名通道',
  },
  'e2e-v766.mjs': {
    tier: 'B',
    reason: 'v7.766 时点「真实浏览器核验」一次性取证卷（头注实读「e2e-v766.mjs — v7.66 真实浏览器核验」）——v 前缀裸数形态（无行为后缀缀点）机械正则缺口，#291 命名纪律延伸批留改名通道',
  },
  'e2e-v767.mjs': {
    tier: 'B',
    reason: 'v7.767 时点「真实浏览器核验」一次性取证卷（头注实读「e2e-v767.mjs — v7.67 真实浏览器核验」）——v 前缀裸数形态（无行为后缀缀点）机械正则缺口，#291 命名纪律延伸批留改名通道',
  },
  'e2e-v768.mjs': {
    tier: 'B',
    reason: 'v7.768 时点「真实浏览器核验」一次性取证卷（头注实读「e2e-v768.mjs — v7.68 平板 Overview AOSP 同构精修 真实浏览器核验」）——v 前缀裸数形态（无行为后缀缀点）机械正则缺口，#291 命名纪律延伸批留改名通道',
  },
  'e2e-v769.mjs': {
    tier: 'B',
    reason: 'v7.769 时点「真实浏览器核验」一次性取证卷（头注实读「e2e-v769.mjs — v7.69 OPFS 存储引擎 + 文件应用全面增强 真实浏览器核验」）——v 前缀裸数形态（无行为后缀缀点）机械正则缺口，#291 命名纪律延伸批留改名通道',
  },
  'e2e-v770.mjs': {
    tier: 'B',
    reason: 'v7.770 时点「真实浏览器核验」一次性取证卷（头注实读「e2e-v770.mjs — v7.70 文件应用层级返回视差（Android 平台同构）真实浏览器核验」）——v 前缀裸数形态（无行为后缀缀点）机械正则缺口，#291 命名纪律延伸批留改名通道',
  },
  'e2e-v771.mjs': {
    tier: 'B',
    reason: 'v7.771 时点「真实浏览器核验」一次性取证卷（头注实读「e2e-v771.mjs — v7.71 动画流畅性真实浏览器核验（Playwright 390×844）」）——v 前缀裸数形态（无行为后缀缀点）机械正则缺口，#291 命名纪律延伸批留改名通道',
  },
  'e2e-v772.mjs': {
    tier: 'B',
    reason: 'v7.772 时点「真实浏览器核验」一次性取证卷（头注实读「e2e-v772.mjs — v7.72 官方预测性返回 + M3E 组件全家桶 真实浏览器核验（Playwright 」）——v 前缀裸数形态（无行为后缀缀点）机械正则缺口，#291 命名纪律延伸批留改名通道',
  },
  'e2e-v773.mjs': {
    tier: 'B',
    reason: 'v7.773 时点「真实浏览器核验」一次性取证卷（头注实读「e2e-v773.mjs — v7.73 M3E 组件全系统铺开 真实浏览器核验（Playwright 390×844）」）——v 前缀裸数形态（无行为后缀缀点）机械正则缺口，#291 命名纪律延伸批留改名通道',
  },
  'e2e-v777.mjs': {
    tier: 'B',
    reason: 'v7.777 时点「真实浏览器核验」一次性取证卷（头注实读「e2e-v777.mjs — v7.77 M3E 主题动态色 + 下拉/拉伸扩场景 真实浏览器核验」）——v 前缀裸数形态（无行为后缀缀点）机械正则缺口，#291 命名纪律延伸批留改名通道',
  },
  'e2e-v778.mjs': {
    tier: 'B',
    reason: 'v7.778 时点「真实浏览器核验」一次性取证卷（头注实读「e2e-v778.mjs — v7.78 QS 面板容器变换（去底部上升）+ 分体磁贴激活语义 + 矢量图官方化 真实浏」）——v 前缀裸数形态（无行为后缀缀点）机械正则缺口，#291 命名纪律延伸批留改名通道',
  },
  'e2e-v785.mjs': {
    tier: 'B',
    reason: 'v7.785 时点「真实浏览器核验」一次性取证卷（头注实读「e2e-v785.mjs — v7.85 E2E 核验：AOSP 官方三图标重绘 + Dual Shade 分家模式 +」）——v 前缀裸数形态（无行为后缀缀点）机械正则缺口，#291 命名纪律延伸批留改名通道',
  },
};

// 三档判别（机械规则，卡面建议②逐字兑现；A 档是「候选」非「判定」——接入须逐脚本评审；
// 批 2 起：机械判别后查 TIER_OVERRIDES 纠偏表，命中即取表内档位）
export function classifyTier(basename) {
  if (V_PREFIX_RE.test(basename)) return 'B';
  const override = TIER_OVERRIDES[basename];
  if (override) return override.tier;
  return 'A';
}

export function buildInventory(files) {
  // files: [{ file, basename, text, referencedByNpm, referencedByWorkflows }]
  const rows = files
    .slice()
    .sort((a, b) => (a.basename < b.basename ? -1 : a.basename > b.basename ? 1 : 0))
    .map((f) => {
      const lines = f.text.split('\n');
      const tier = classifyTier(f.basename);
      const headMatch = f.text.match(/^\/\/\s*=+\s*(.+?)\s*=+\s*$/m);
      return {
        file: f.file,
        basename: f.basename,
        tier,
        tierOverride: (TIER_OVERRIDES[f.basename] && TIER_OVERRIDES[f.basename].reason) || '',
        vPrefix: V_PREFIX_RE.test(f.basename),
        lines: lines.length,
        importsPlaywright: /^import\s+\{[^}]*chromium[^}]*\}\s+from\s+'playwright';/m.test(f.text),
        writesArtifacts: detectArtifactSignals(f.text),
        referencedByNpm: f.referencedByNpm,
        referencedByWorkflows: f.referencedByWorkflows,
        head: headMatch ? headMatch[1] : '',
      };
    });
  const counts = { A: 0, B: 0, C: 0 };
  for (const r of rows) counts[r.tier]++;
  counts.total = rows.length;
  return {
    card: '#272 e2e playwright 化三档清单（R151 窗批 1 立卡 · R152 窗批 2 评审批启用 TIER_OVERRIDES 纠偏表化；版本随滚版 stamp，不内嵌）',
    scanDir: SCAN_DIR,
    pattern: 'e2e-*.mjs',
    tierRules: {
      A: '无 vNNN[a-z]?- 前缀（常青命名）→ 常青回归候选；接入 config projects 须逐脚本评审（渐进批）；评审非常青面经 TIER_OVERRIDES 纠偏至 B 档（批 2 启用，逐脚本实读理由随表）',
      B: '有 vNNN[a-z]?- 前缀 → 一次性取证（标记归档、可运行保留；改名属 #291 命名纪律延伸批）',
      C: '已被 smoke 覆盖删除候选——机械不可判：须逐脚本功能对账批（issue 卷对账），本批规则性记 0，禁止机械判删',
    },
    read_only_pledge: '本清单为只读盘点：对 230 家裸脚本（生成时点现值）零删除零改写零改名；既有三通道（npm e2e:dist / npm e2e:sweep / 直跑）零触碰',
    counts,
    scripts: rows,
  };
}

// 产物对账闸（防清单漂移/洗账）：新增或删除脚本而清单未再生 → mismatch
export function verifyArtifact(files, artifact) {
  const rebuilt = buildInventory(files);
  const rebuiltNames = rebuilt.scripts.map((s) => s.file);
  const artifactNames = artifact.scripts.map((s) => s.file);
  for (const n of rebuiltNames) if (!artifactNames.includes(n)) return { ok: false, reason: `missing in artifact: ${n}` };
  for (const n of artifactNames) if (!rebuiltNames.includes(n)) return { ok: false, reason: `stale in artifact: ${n}` };
  if (rebuilt.counts.total !== artifact.counts.total) return { ok: false, reason: `total drift: rebuilt=${rebuilt.counts.total} artifact=${artifact.counts.total}` };
  return { ok: true, reason: '' };
}

function scan() {
  const dir = join(ROOT, SCAN_DIR);
  const names = readdirSync(dir).filter((n) => /^e2e-.*\.mjs$/.test(n)).sort();
  const pkgRaw = readFileSync(join(ROOT, 'package.json'), 'utf8');
  const wfDir = join(ROOT, '.github/workflows');
  let wfRaw = '';
  if (existsSync(wfDir)) {
    for (const w of readdirSync(wfDir)) wfRaw += readFileSync(join(wfDir, w), 'utf8') + '\n';
  }
  const files = names.map((n) => {
    const text = readFileSync(join(dir, n), 'utf8');
    return {
      file: `${SCAN_DIR}/${n}`,
      basename: n,
      text,
      referencedByNpm: pkgRaw.includes(n),
      referencedByWorkflows: wfRaw.includes(n),
    };
  });
  return files;
}

function main() {
  const files = scan();
  const inv = buildInventory(files);
  const json = JSON.stringify(inv, null, 2) + '\n';
  if (CHECK) {
    if (!existsSync(OUT)) {
      console.error(`--check FAIL: ${'docs/audits/e2e-inventory.json'} 缺失`);
      process.exit(1);
    }
    const onDisk = readFileSync(OUT, 'utf8');
    if (onDisk !== json) {
      console.error('--check FAIL: 盘上产物与再生结果逐字节不一致（清单漂移——须再生提交）');
      process.exit(1);
    }
    console.log(`--check OK: total=${inv.counts.total} A=${inv.counts.A} B=${inv.counts.B} C=${inv.counts.C}`);
    return;
  }
  writeFileSync(OUT, json);
  console.log(`written: docs/audits/e2e-inventory.json total=${inv.counts.total} A=${inv.counts.A} B=${inv.counts.B} C=${inv.counts.C}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
