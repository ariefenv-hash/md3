// ==================== e2e-v855-driving.mjs — #62 驾考题库无头回归 ====================
//
// DoD（#62 验收原文逐条）：
//   A. UI 骨架：标题/徽章顺序练习/统计四格/第一题渲染（判断题）/进度 1/118
//   B. 顺序练习作答正确：点正确项 → 绿色 + 解析 + 已练/正确率更新
//   C. 答错入错题本：点错误项 → 红色 + 正确高亮 + 错题计数 +1 + toast
//   D. 错题本模式：due 队列 + 阶梯徽标 + 答对升阶（下阶段复习日期）
//   E. 多选题：确认键门控（<2 禁用）→ 勾选三项确认 → 即时判分正确
//   F. 程序化标志渲染：标志题 SVG（createElementNS）显形 + 元素计数
//   G. 模拟考真考格式：不自动开考（开考覆盖）→ 开始 → 倒计时 45:00 + 进度 →
//      作答不即时判分 → 未答交卷确认（dialog accept）→ 成绩卡/历史最佳/EXAM_KEY 清除
//   H. 缺席到点自动交卷：EXAM_KEY 注入过期 startTs → reload → 自动入档 + 成绩可查
//   I. 生命周期：作答中 APP_FREEZE → 状态落盘 → reload 续考（startTs 墙钟延续 + 答案保留）
//   J. 深链：BUS_DELIVER driving/open 运行时直投 + inline 缓冲重放
//   K. 持久化恢复：subject/mode/统计/错题计数跨重载保持
//   L. 零 pageerror
//
// 教训沿袭：v850-v854（?nolock=1 跳锁屏 / domcontentloaded + 固定等待 / evaluate 点击 /
// 外域资源一律 abort 隔离沙箱外网波动）。

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v855');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8085/ios-desktop/index.html?nolock=1';
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const A = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};

const browser = await chromium.launch({ headless: true, executablePath: EXE,
  args: ['--autoplay-policy=no-user-gesture-required'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' });

// 外域资源一律 abort——沙箱外网波动隔离（本地纯静态零网络依赖）
await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());

const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('dialog', (d) => d.accept());

await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
await sleep(2500);

const frameOf = () => page.frames().find((f) => f.url().includes('apps/driving/index.html'));
let frame = null;
await page.evaluate(() => { window.__shareSheet.openAppById('driving'); });
await sleep(600);
frame = frameOf();
if (frame) await frame.waitForFunction(() => document.readyState === 'complete' && document.getElementById('dvBadge'), null, { timeout: 9000 }).catch(() => {});
await sleep(600);
frame = frameOf();
A('驾考题库 iframe 挂载', !!frame);
const reopen = async () => {
  await page.evaluate(() => { window.__shareSheet.openAppById('driving'); });
  await sleep(600);
  frame = frameOf();
  if (frame) await frame.waitForFunction(() => document.readyState === 'complete' && document.getElementById('dvBadge'), null, { timeout: 9000 }).catch(() => {});
  await sleep(600);
  frame = frameOf();
};
const click = (sel) => frame.evaluate((s) => document.getElementById(s)?.click(), sel);
const $t = (sel) => frame.evaluate((s) => document.querySelector(`[data-test="${s}"]`)?.textContent ?? null, sel);
const optAt = (i) => frame.evaluate((idx) => {
  const rows = document.querySelectorAll('[data-test="dv-opt"]');
  const row = rows[idx];
  if (!row) return null;
  row.click();
  return row.className;
}, i);

// ---------- A. UI 骨架 ----------
console.log('A. UI 骨架');
const boot = await frame.evaluate(() => ({
  title: document.querySelector('.dv-title')?.textContent,
  sub: document.querySelector('.dv-sub')?.textContent,
  badge: document.getElementById('dvBadge').textContent,
  learn: document.getElementById('dvStatLearn').textContent,
  rate: document.getElementById('dvStatRate').textContent,
  wrong: document.getElementById('dvStatWrong').textContent,
  best: document.getElementById('dvStatBest').textContent,
  progress: document.getElementById('dvProgress').textContent,
  stem: document.getElementById('dvStem').textContent,
  type: document.getElementById('dvType').textContent,
  optCount: document.querySelectorAll('[data-test="dv-opt"]').length,
  qwrap: document.getElementById('dvQWrap').classList.contains('show'),
  startShown: document.getElementById('dvStartWrap').classList.contains('show'),
}));
A('标题/副标/徽章（顺序练习·科目一）', boot.title === '驾考题库' && boot.sub.includes('200 题') &&
  boot.badge === '科目一 · 顺序练习', JSON.stringify(boot.badge));
A('统计四格初值（0/200 · — · 0 · —）', boot.learn === '0/200' && boot.rate === '—' &&
  boot.wrong === '0' && boot.best === '—');
A('第一题渲染（判断题·2 选项·进度 1/118）', boot.qwrap && !boot.startShown &&
  boot.type === '判断题' && boot.optCount === 2 && boot.progress === '1/118' &&
  boot.stem.includes('饮酒后驾驶'), JSON.stringify(boot.progress));
await page.screenshot({ path: join(OUT, 'driving-boot.png') });

// ---------- B. 顺序练习作答正确 ----------
console.log('B. 顺序练习作答正确（D001 判断·答案「正确」）');
const clsB = await optAt(0);
await sleep(120);
const afterB = await frame.evaluate(() => ({
  exp: document.getElementById('dvExp').className,
  expText: document.getElementById('dvExp').textContent.slice(0, 6),
  learn: document.getElementById('dvStatLearn').textContent,
  rate: document.getElementById('dvStatRate').textContent,
  nextDisabled: document.getElementById('dvNext').disabled,
}));
A('正确项着色 + 解析展示', clsB?.includes('right') === true && clsB?.includes('locked') === true &&
  afterB.exp.includes('show') && afterB.exp.includes('good') && afterB.expText.includes('回答正确'), clsB);
A('统计更新（已练 1/200 · 正确率 100%）+ 下一题解锁',
  afterB.learn === '1/200' && afterB.rate === '100%' && afterB.nextDisabled === false, JSON.stringify(afterB));

// ---------- C. 答错入错题本 ----------
console.log('C. 答错入错题本（D002 判断·答「错误」）');
A('跳转 D002', await frame.evaluate(() => window.__drivingJump('D002')) === true);
const clsC = await optAt(1);
await sleep(120);
const afterC = await frame.evaluate(() => ({
  expClass: document.getElementById('dvExp').className,
  rightIdx: [...document.querySelectorAll('[data-test="dv-opt"]')].findIndex((r) => r.className.includes('right')),
  wrongIdx: [...document.querySelectorAll('[data-test="dv-opt"]')].findIndex((r) => r.className.includes('wrongpick')),
  wrong: document.getElementById('dvStatWrong').textContent,
  toast: document.getElementById('dvToast').textContent,
}));
A('错误着色 + 正确项高亮（opt1 错/opt0 对）', clsC?.includes('wrongpick') === true &&
  afterC.expClass.includes('bad') && afterC.rightIdx === 0 && afterC.wrongIdx === 1, JSON.stringify(afterC));
A('错题本 +1 + toast 提示', afterC.wrong === '1' && afterC.toast.includes('错题本'), afterC.toast);

// ---------- D. 错题本模式（艾宾浩斯阶梯） ----------
console.log('D. 错题本模式（due 队列 + 答对升阶）');
await click('dvModeWrong');
await sleep(300);
const wrongD = await frame.evaluate(() => ({
  badge: document.getElementById('dvBadge').textContent,
  progress: document.getElementById('dvProgress').textContent,
  stem: document.getElementById('dvStem').textContent,
  chip: document.querySelector('[data-test="dv-wrongchip"]').textContent,
  chipShown: document.querySelector('[data-test="dv-wrongchip"]').style.display !== 'none',
}));
A('错题队列渲染（1/1 · D002 · 第 1/5 阶徽标）', wrongD.badge.includes('错题本') &&
  wrongD.progress === '1/1' && wrongD.stem.includes('倒车') && wrongD.chipShown &&
  wrongD.chip.includes('第 1/5 阶'), JSON.stringify(wrongD));
await page.screenshot({ path: join(OUT, 'driving-wrong.png') });
const clsD = await optAt(0);   // D002 答案「正确」
await sleep(150);
const afterD = await frame.evaluate(() => ({
  toast: document.getElementById('dvToast').textContent,
  wrong: document.getElementById('dvStatWrong').textContent,
}));
A('答对升阶（下阶段复习明日）', clsD?.includes('right') === true &&
  afterD.toast.includes('下阶段复习') && afterD.toast.includes('2026-'), afterD.toast);
await click('dvModeSeq');
await sleep(250);

// ---------- E. 多选题（确认门控） ----------
console.log('E. 多选题（科四 D191·确认键门控）');
await click('dvSubj4');
await sleep(250);
A('切科目四（进度 1/82 · 随机徽标不变）', (await $t('dv-progress')) === '1/82');
await frame.evaluate(() => window.__drivingJump('D191'));
await sleep(200);
const multiE = await frame.evaluate(() => ({
  type: document.getElementById('dvType').textContent,
  confirmShown: document.getElementById('dvConfirm').classList.contains('show'),
  confirmDisabled: document.getElementById('dvConfirm').disabled,
}));
A('多选徽标 + 确认键初始禁用（<2 项）', multiE.type === '多选题' && multiE.confirmShown &&
  multiE.confirmDisabled === true, JSON.stringify(multiE));
await optAt(0); await optAt(1);
const midE = await frame.evaluate(() => ({ disabled: document.getElementById('dvConfirm').disabled,
  picked: document.querySelectorAll('.dv-opt.picked').length }));
A('两项勾选后确认键可用', midE.disabled === false && midE.picked === 2);
await optAt(2);
await click('dvConfirm');
await sleep(150);
const doneE = await frame.evaluate(() => ({
  expClass: document.getElementById('dvExp').className,
  right: document.querySelectorAll('.dv-opt.right').length,
}));
A('三项确认即时判分正确', doneE.expClass.includes('good') && doneE.right === 3, JSON.stringify(doneE));

// ---------- F. 程序化标志渲染 ----------
console.log('F. 标志题渲染（科一 D065·禁止驶入）');
await click('dvSubj1');
await sleep(250);
await frame.evaluate(() => window.__drivingJump('D065'));
await sleep(200);
const signF = await frame.evaluate(() => {
  const sign = document.getElementById('dvSign');
  return {
    shown: sign.classList.contains('show'),
    circles: sign.querySelectorAll('circle').length,
    rects: sign.querySelectorAll('rect').length,
    stem: document.getElementById('dvStem').textContent.slice(0, 8),
    tag: document.getElementById('dvCat').textContent,
  };
});
A('SVG 标志显形（circle×1 + rect×1 · 科目一·标志）', signF.shown && signF.circles === 1 &&
  signF.rects === 1 && signF.stem.includes('图中交通标志') && signF.tag.includes('标志'), JSON.stringify(signF));
await page.screenshot({ path: join(OUT, 'driving-sign.png') });

// ---------- G. 模拟考（真考格式 + 交卷确认 + 成绩卡） ----------
console.log('G. 模拟考全链（不自动开考 → 作答 → 交卷 → 成绩）');
await click('dvModeExam');
await sleep(250);
const startG = await frame.evaluate(() => ({
  startShown: document.getElementById('dvStartWrap').classList.contains('show'),
  info: document.getElementById('dvStartInfo').textContent,
}));
A('开考覆盖（不自动开考 · 100 题 45 分钟 90 及格）', startG.startShown &&
  startG.info.includes('100') && startG.info.includes('45') && startG.info.includes('90'), startG.info);
await click('dvStart');
await sleep(400);
const examG = await frame.evaluate(() => ({
  clock: document.getElementById('dvClock').textContent,
  eprog: document.getElementById('dvEprog').textContent,
  examBar: document.getElementById('dvExamBar').classList.contains('show'),
  expHidden: !document.getElementById('dvExp').classList.contains('show'),
  badge: document.getElementById('dvBadge').textContent,
}));
A('倒计时 45:00 + 进度 + 徽章（模拟考试）+ 不即时判分', examG.examBar &&
  (examG.clock === '45:00' || examG.clock === '44:59') &&
  examG.eprog.includes('已答 0') && examG.expHidden && examG.badge.includes('模拟考试'), JSON.stringify(examG));
await page.screenshot({ path: join(OUT, 'driving-exam.png') });
await optAt(0);   // 第一题作答（不判分）
await sleep(150);
const answeredG = await frame.evaluate(() => ({
  eprog: document.getElementById('dvEprog').textContent,
  expHidden: !document.getElementById('dvExp').classList.contains('show'),
  picked: document.querySelectorAll('.dv-opt.picked').length,
}));
A('作答记录（已答 1）+ 解析不展示', answeredG.eprog.includes('已答 1') && answeredG.expHidden &&
  answeredG.picked === 1, JSON.stringify(answeredG.eprog));
await click('dvSubmit');   // 未答 99 题 → dialog accept → 交卷
await sleep(500);
const doneG = await frame.evaluate(() => ({
  shown: document.getElementById('dvDone').classList.contains('show'),
  score: document.getElementById('dvScore').textContent,
  verdict: document.getElementById('dvVerdict').textContent,
  summary: document.getElementById('dvSummary').textContent,
  badge: document.getElementById('dvBadge').textContent,
  best: document.getElementById('dvStatBest').textContent,
  examKey: localStorage.getItem('ios-desktop:driving-exam-v1'),
}));
A('成绩卡（1 分 · 不合格 90 及格 · 历史最佳 1）+ EXAM_KEY 清除', doneG.shown &&
  doneG.score === '1' && doneG.verdict.includes('不合格') && doneG.verdict.includes('90') &&
  doneG.summary.includes('答对 1/100') && doneG.badge.includes('考试不合格') &&
  doneG.best === '1' && doneG.examKey === null, JSON.stringify(doneG));
await page.screenshot({ path: join(OUT, 'driving-done.png') });

// ---------- H. 缺席到点自动交卷 ----------
console.log('H. 缺席到点自动交卷（EXAM_KEY 注入过期 startTs → reload）');
// 哨兵注入：旧 iframe 的 beforeunload→abortAll 会清掉运行时写入的 EXAM_KEY，
// 故用 addInitScript 在新文档创建时（应用脚本运行前）一次性写入
await page.addInitScript(() => {
  try {
    if (localStorage.getItem('ios-desktop:driving-e2e-inject') === '1') {
      localStorage.setItem('ios-desktop:driving-exam-v1', JSON.stringify({
        subject: 1, startTs: Date.now() - 46 * 60 * 1000, idx: 0,
        answers: [0, null, null], picked: [],
        qids: ['D001', 'D002', 'D003'],
      }));
      localStorage.removeItem('ios-desktop:driving-e2e-inject');
    }
  } catch (e) { /* 无害 */ }
});
await frame.evaluate(() => { localStorage.setItem('ios-desktop:driving-e2e-inject', '1'); });
await page.reload({ waitUntil: 'domcontentloaded' });
await sleep(2500);
await reopen();
const afterH = await frame.evaluate(() => ({
  badge: document.getElementById('dvBadge').textContent,
  toast: document.getElementById('dvToast').textContent,
  examKey: localStorage.getItem('ios-desktop:driving-exam-v1'),
  best: document.getElementById('dvStatBest').textContent,
}));
A('自动交卷入档（toast + EXAM_KEY 清除 + badge 回落顺序练习）', afterH.examKey === null &&
  afterH.toast.includes('自动交卷') && afterH.badge.includes('顺序练习') && afterH.best === '1',
  JSON.stringify(afterH));
await click('dvModeExam');
await sleep(300);
const doneH = await frame.evaluate(() => ({
  shown: document.getElementById('dvDone').classList.contains('show'),
  score: document.getElementById('dvScore').textContent,
}));
A('成绩可查（模拟考页呈现 1 分成绩卡）', doneH.shown && doneH.score === '1', JSON.stringify(doneH));
await click('dvModeSeq');
await sleep(200);

// ---------- I. APP_FREEZE + 续考（墙钟延续） ----------
console.log('I. 生命周期（APP_FREEZE 落盘 → reload 续考）');
await click('dvModeExam');
await sleep(250);
await click('dvStart');
await sleep(400);
await optAt(1);   // 作答第 1 题（任意选项）
await sleep(150);
const beforeFreeze = await frame.evaluate(() => ({
  key: JSON.parse(localStorage.getItem('ios-desktop:driving-exam-v1') || 'null'),
  clock: document.getElementById('dvClock').textContent,
}));
A('作答后 EXAM_KEY 落盘（answers[0] 非空 · 倒计时运行）', beforeFreeze.key &&
  beforeFreeze.key.answers[0] !== null && beforeFreeze.key.qids.length === 100 &&
  (beforeFreeze.clock === '45:00' || beforeFreeze.clock === '44:59'));
await frame.evaluate(() => window.postMessage({ type: 'APP_FREEZE' }, '*'));
await sleep(300);
await page.reload({ waitUntil: 'domcontentloaded' });
await sleep(2500);
await reopen();
const resumedI = await frame.evaluate(() => ({
  badge: document.getElementById('dvBadge').textContent,
  toast: document.getElementById('dvToast').textContent,
  examKey: JSON.parse(localStorage.getItem('ios-desktop:driving-exam-v1') || 'null'),
}));
A('重载回落顺序练习 + 续考 toast + 考试状态保留', resumedI.badge.includes('顺序练习') &&
  resumedI.toast.includes('模拟考进行中') && resumedI.examKey && resumedI.examKey.answers[0] !== null,
  resumedI.toast);
await click('dvModeExam');
await sleep(300);
const resumedView = await frame.evaluate(() => ({
  examBar: document.getElementById('dvExamBar').classList.contains('show'),
  eprog: document.getElementById('dvEprog').textContent,
  clock: document.getElementById('dvClock').textContent,
}));
A('续考现场（倒计时延续 + 已答 1 保留）', resumedView.examBar &&
  resumedView.eprog.includes('已答 1') &&
  /^\d{2}:\d{2}$/.test(resumedView.clock) && resumedView.clock <= '45:00', JSON.stringify(resumedView));
// 清理在途考（不污染 K 段）
await frame.evaluate(() => localStorage.removeItem('ios-desktop:driving-exam-v1'));
await click('dvModeSeq');
await sleep(200);

// ---------- J. 深链（运行时直投 + inline 缓冲） ----------
console.log('J. 深链双通道');
await frame.evaluate(() => {
  window.postMessage({ type: 'BUS_DELIVER', event: 'driving/open', payload: { subject: 4, mode: 'random' } }, '*');
});
await sleep(400);
const dlJ = await frame.evaluate(() => ({
  badge: document.getElementById('dvBadge').textContent,
  progress: document.getElementById('dvProgress').textContent,
}));
A('运行时直投（科目四 · 随机练习）', dlJ.badge === '科目四 · 随机练习' &&
  dlJ.progress === '1/82', JSON.stringify(dlJ));
await page.addInitScript(() => { window.__drivingDeepLink = [{ subject: 1, mode: 'seq' }]; });
await page.reload({ waitUntil: 'domcontentloaded' });
await sleep(2500);
await reopen();
const dlJ2 = await frame.evaluate(() => document.getElementById('dvBadge').textContent);
A('inline 缓冲重放（重载后科目一 · 顺序练习）', dlJ2 === '科目一 · 顺序练习', dlJ2);

// ---------- K. 持久化恢复 ----------
console.log('K. 持久化恢复');
const persistK = await frame.evaluate(() => ({
  learn: document.getElementById('dvStatLearn').textContent,
  wrong: document.getElementById('dvStatWrong').textContent,
  best: document.getElementById('dvStatBest').textContent,
  progress: document.getElementById('dvProgress').textContent,
}));
A('统计/错题/最佳成绩跨重载保持', persistK.learn !== '0/200' && persistK.wrong !== '0' &&
  persistK.best === '1', JSON.stringify(persistK));

// ---------- L. 稳定性 ----------
console.log('L. 稳定性');
A('全程零 pageerror', errors.length === 0, errors.slice(0, 3).join(' | '));

console.log(`\n===== e2e-v855 结果: ${pass} PASS / ${fail} FAIL =====`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);
