// ==================== v853-stt.test.js — #59 语音转文字（v8.53） ====================
// 验收锚（#59 原文）：SpeechRecognition 原生 zh-CN/en-US 切换 + continuous/interimResults
// 实时上屏 + 不引入第三方 AI 修正（nightsky pollinations 外发反例根除——标点本地停顿规则）+
// 分段卡 + 一键复制 + 不支持 Web Speech 的浏览器降级提示 + 麦克风权限走 #55 统一对话框 +
// vitest 锚（纯逻辑部分）。headless 无语音引擎：e2e 以 stub 驱动状态机（scripts/e2e-v853-stt.mjs）。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/js/stt-core.js'), 'utf8');
const PAGE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/stt/index.html'), 'utf8');
const SHELL_SRC = readFileSync(join(ROOT, 'ios-desktop/js/apps/stt.js'), 'utf8');
const APPSDATA_SRC = readFileSync(join(ROOT, 'ios-desktop/js/apps-data.js'), 'utf8');
const ICONS_SRC = readFileSync(join(ROOT, 'ios-desktop/js/app-icons.js'), 'utf8');
const TCORE_SRC = readFileSync(join(ROOT, 'ios-desktop/js/terminal-core.js'), 'utf8');
const TPAGE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/terminal/index.html'), 'utf8');
const FIXTURE = JSON.parse(readFileSync(join(ROOT, 'tests/icon-dynamic-colors.generated.json'), 'utf-8'));

// ---------- 沙箱提取（经典脚本 IIFE → window.__sttCore） ----------
const ctx = { window: {} };
new Function('window', CORE_SRC)(ctx.window);
const core = ctx.window.__sttCore;

describe('v8.53 #59 core：语言档白名单', () => {
  it('恰 2 档，id/label/comma/period 字段齐整', () => {
    expect(core.LANGS).toHaveLength(2);
    core.LANGS.forEach((m) => {
      expect(typeof m.id).toBe('string');
      expect(typeof m.label).toBe('string');
      expect(typeof m.comma).toBe('string');
      expect(typeof m.period).toBe('string');
    });
  });
  it('语义精确：zh-CN 中文标点 / en-US 英文标点', () => {
    const zh = core.LANGS.find((m) => m.id === 'zh-CN');
    const en = core.LANGS.find((m) => m.id === 'en-US');
    expect(zh.label).toBe('中文（普通话）');
    expect(zh.comma).toBe('，'); expect(zh.period).toBe('。');
    expect(en.label).toBe('English (US)');
    expect(en.comma).toBe(','); expect(en.period).toBe('.');
  });
  it('isLang：白名单内 true，非法/未知/非字符串 false', () => {
    expect(core.isLang('zh-CN')).toBe(true);
    expect(core.isLang('en-US')).toBe(true);
    expect(core.isLang('zh-TW')).toBe(false);
    expect(core.isLang('')).toBe(false);
    expect(core.isLang(null)).toBe(false);
    expect(core.isLang(42)).toBe(false);
  });
  it('resolveLang：非法回落 DEFAULT_LANG（zh-CN）', () => {
    expect(core.DEFAULT_LANG).toBe('zh-CN');
    expect(core.resolveLang('en-US')).toBe('en-US');
    expect(core.resolveLang('xx-XX')).toBe('zh-CN');
    expect(core.resolveLang(undefined)).toBe('zh-CN');
  });
  it('langMeta：合法取元数据，非法回落 zh-CN 元数据', () => {
    expect(core.langMeta('en-US').period).toBe('.');
    expect(core.langMeta('bogus').comma).toBe('，');
  });
});

describe('v8.53 #59 core：能力检测（注入式，可测）', () => {
  it('hasSpeechSupport：标准 SpeechRecognition / webkit 前缀 / 双无', () => {
    expect(core.hasSpeechSupport({ SpeechRecognition: function S() {} })).toBe(true);
    expect(core.hasSpeechSupport({ webkitSpeechRecognition: function W() {} })).toBe(true);
    expect(core.hasSpeechSupport({})).toBe(false);
    expect(core.hasSpeechSupport(null)).toBe(false);
    expect(core.hasSpeechSupport(undefined)).toBe(false);
  });
  it('hasSpeechSupport：非函数值不算支持（防属性污染）', () => {
    expect(core.hasSpeechSupport({ SpeechRecognition: 'not-a-fn' })).toBe(false);
    expect(core.hasSpeechSupport({ webkitSpeechRecognition: {} })).toBe(false);
  });
  it('getSpeechCtor：优先标准 API，webkit 兜底，无支持 null', () => {
    const Std = function S() {}; const Wk = function W() {};
    expect(core.getSpeechCtor({ SpeechRecognition: Std, webkitSpeechRecognition: Wk })).toBe(Std);
    expect(core.getSpeechCtor({ webkitSpeechRecognition: Wk })).toBe(Wk);
    expect(core.getSpeechCtor({})).toBeNull();
  });
});

describe('v8.53 #59 core：本地停顿标点规则（零外发锚）', () => {
  it('阈值语义：<600ms 不打点 / 600-1399ms 逗号 / ≥1400ms 句号', () => {
    expect(core.SHORT_PAUSE_MS).toBe(600);
    expect(core.LONG_PAUSE_MS).toBe(1400);
    expect(core.pauseToPunct(0, 'zh-CN', false)).toBe('');
    expect(core.pauseToPunct(599, 'zh-CN', false)).toBe('');
    expect(core.pauseToPunct(600, 'zh-CN', false)).toBe('，');
    expect(core.pauseToPunct(1399, 'zh-CN', false)).toBe('，');
    expect(core.pauseToPunct(1400, 'zh-CN', false)).toBe('。');
    expect(core.pauseToPunct(60000, 'zh-CN', false)).toBe('。');
  });
  it('英文档打英文标点', () => {
    expect(core.pauseToPunct(700, 'en-US', false)).toBe(',');
    expect(core.pauseToPunct(2000, 'en-US', false)).toBe('.');
  });
  it('首段无前导标点；非法输入一律空串不抛错', () => {
    expect(core.pauseToPunct(5000, 'zh-CN', true)).toBe('');
    expect(core.pauseToPunct(null, 'zh-CN', false)).toBe('');
    expect(core.pauseToPunct(undefined, 'zh-CN', false)).toBe('');
    expect(core.pauseToPunct(NaN, 'zh-CN', false)).toBe('');
    expect(core.pauseToPunct(-100, 'zh-CN', false)).toBe('');
    expect(core.pauseToPunct(Infinity, 'zh-CN', false)).toBe('');
  });
  it('isSentenceEnd：句末/分读标点命中，普通文本不命中', () => {
    expect(core.isSentenceEnd('好的。')).toBe(true);
    expect(core.isSentenceEnd('ok!')).toBe(true);
    expect(core.isSentenceEnd('什么？')).toBe(true);
    expect(core.isSentenceEnd('等等…')).toBe(true);
    expect(core.isSentenceEnd('先说这里，')).toBe(true);
    expect(core.isSentenceEnd('plain text')).toBe(false);
    expect(core.isSentenceEnd('')).toBe(false);
    expect(core.isSentenceEnd(null)).toBe(false);
  });
});

describe('v8.53 #59 core：分段卡数据', () => {
  it('assembleSegment：正常段（trim + lang + conf + at；标点一律先空，由下一段到达回写）', () => {
    const s = core.assembleSegment('  今天天气不错  ', { pauseMs: 1500, isFirst: false, lang: 'zh-CN', at: 1234, confidence: 0.92 });
    expect(s.text).toBe('今天天气不错');
    expect(s.punct).toBe('');
    expect(s.lang).toBe('zh-CN');
    expect(s.at).toBe(1234);
    expect(s.conf).toBe(0.92);
  });
  it('withPausePunct：停顿回写前段标点（700ms→逗号 / 1500ms→句号；标点属前段句尾）', () => {
    const prev = { text: '今天天气很好', punct: '', lang: 'zh-CN', at: 1, conf: null };
    const c = core.withPausePunct(prev, 700);
    expect(c.punct).toBe('，');
    expect(c).not.toBe(prev);                    // 不可变：新对象
    const p = core.withPausePunct({ text: '我们出门吧', punct: '', lang: 'zh-CN' }, 1500);
    expect(p.punct).toBe('。');
    expect(core.withPausePunct({ text: 'hi', punct: '', lang: 'en-US' }, 800).punct).toBe(',');
    expect(core.withPausePunct({ text: 'hi', punct: '', lang: 'en-US' }, 2000).punct).toBe('.');
  });
  it('withPausePunct：句末标点已存在/非法 pause/空段 → 原对象引用不变（防双标点）', () => {
    const end = { text: '真的吗？', punct: '', lang: 'zh-CN' };
    expect(core.withPausePunct(end, 3000)).toBe(end);      // 句末已标点：原引用
    const seg = { text: 'ok', punct: '', lang: 'zh-CN' };
    expect(core.withPausePunct(seg, 0)).toBe(seg);
    expect(core.withPausePunct(seg, -5)).toBe(seg);
    expect(core.withPausePunct(seg, NaN)).toBe(seg);
    expect(core.withPausePunct(null, 5000)).toBeNull();
    expect(core.withPausePunct({ text: '', punct: '', lang: 'zh-CN' }, 5000).punct).toBe('');
  });
  it('replaceLast：末段替换不可变 + 空数组安全', () => {
    const a = { text: 'a', punct: '', lang: 'zh-CN' };
    const b = { text: 'b', punct: '，', lang: 'zh-CN' };
    const list = core.replaceLast([a], b);
    expect(list[0]).toBe(b);
    expect(core.replaceLast([], b)).toHaveLength(0);
    expect(core.replaceLast(null, b)).toHaveLength(0);
    expect(core.replaceLast([a], null)[0]).toBe(a);
  });
  it('assembleSegment：空白/非字符串拒绝返回 null', () => {
    expect(core.assembleSegment('   ', {})).toBeNull();
    expect(core.assembleSegment('', {})).toBeNull();
    expect(core.assembleSegment(null, {})).toBeNull();
    expect(core.assembleSegment(42, {})).toBeNull();
  });
  it('assembleSegment：超长文本钳制 SEGMENT_TEXT_MAX；conf 越界回落 null', () => {
    const long = core.assembleSegment('a'.repeat(3000), { isFirst: true });
    expect(long.text.length).toBe(core.SEGMENT_TEXT_MAX);
    const bad = core.assembleSegment('x', { confidence: 1.5 });
    expect(bad.conf).toBeNull();
  });
  it('appendSegment：不可变纪律（不改原数组）+ 封顶 SEGMENTS_MAX 保尾', () => {
    const base = [{ text: 'a', punct: '', lang: 'zh-CN', at: 0, conf: null }];
    const next = core.appendSegment(base, { text: 'b', punct: '', lang: 'zh-CN', at: 0, conf: null });
    expect(base).toHaveLength(1);          // 原数组未被改写
    expect(next).toHaveLength(2);
    expect(core.appendSegment(null, { text: 'x' })).toHaveLength(1);
    expect(core.appendSegment([], null)).toHaveLength(0);   // 非法段丢弃
    // 封顶
    let list = [];
    for (let i = 0; i < core.SEGMENTS_MAX + 30; i++) {
      list = core.appendSegment(list, { text: 't' + i, punct: '', lang: 'zh-CN', at: 0, conf: null });
    }
    expect(list).toHaveLength(core.SEGMENTS_MAX);
    expect(list[list.length - 1].text).toBe('t' + (core.SEGMENTS_MAX + 29)); // 保最新
    expect(list[0].text).toBe('t30');
  });
  it('buildTranscript：中文直连 + 英文段补空格 + 非法段跳过', () => {
    expect(core.buildTranscript([
      { text: '你好', punct: '，', lang: 'zh-CN', at: 0, conf: null },
      { text: '世界', punct: '。', lang: 'zh-CN', at: 0, conf: null },
    ])).toBe('你好，世界。');
    expect(core.buildTranscript([
      { text: 'hello', punct: ',', lang: 'en-US', at: 0, conf: null },
      { text: 'world', punct: '.', lang: 'en-US', at: 0, conf: null },
    ])).toBe('hello, world.');
    expect(core.buildTranscript([])).toBe('');
    expect(core.buildTranscript('bad')).toBe('');
    expect(core.buildTranscript([{ text: 'ok', punct: '', lang: 'zh-CN' }, null])).toBe('ok');
  });
});

describe('v8.53 #59 core：格式化与文案', () => {
  it('fmtDur：mm:ss 补零 + 负值回落 + 100 分钟钳制', () => {
    expect(core.fmtDur(0)).toBe('00:00');
    expect(core.fmtDur(65000)).toBe('01:05');
    expect(core.fmtDur(60000)).toBe('01:00');
    expect(core.fmtDur(-5)).toBe('00:00');
    expect(core.fmtDur(NaN)).toBe('00:00');
    expect(core.fmtDur(100 * 60 * 1000 + 60000)).toBe('99:59');
  });
  it('fmtConfidence：0-1 → 百分数；越界/非数回落空串', () => {
    expect(core.fmtConfidence(0.92)).toBe('92%');
    expect(core.fmtConfidence(0)).toBe('0%');
    expect(core.fmtConfidence(1)).toBe('100%');
    expect(core.fmtConfidence(1.2)).toBe('');
    expect(core.fmtConfidence(-0.1)).toBe('');
    expect(core.fmtConfidence('x')).toBe('');
  });
  it('errorLabel：MDN 全枚举中文映射 + 未知码前向兼容', () => {
    expect(core.errorLabel('no-speech')).toContain('未检测到语音');
    expect(core.errorLabel('network')).toContain('网络');
    expect(core.errorLabel('not-allowed')).toContain('权限');
    expect(core.errorLabel('service-not-allowed')).toBeTruthy();
    expect(core.errorLabel('audio-capture')).toBeTruthy();
    expect(core.errorLabel('aborted')).toBeTruthy();
    expect(core.errorLabel('language-not-supported')).toBeTruthy();
    expect(core.errorLabel('weird-code')).toContain('weird-code');
    expect(core.errorLabel(null)).toContain('unknown');
  });
  it('statusLabel：状态机中文文案全覆盖', () => {
    expect(core.statusLabel(core.STATES.LISTENING)).toBe('聆听中…');
    expect(core.statusLabel(core.STATES.IDLE)).toBe('待开始');
    expect(core.statusLabel(core.STATES.DENIED)).toBe('无麦克风权限');
    expect(core.statusLabel(core.STATES.UNSUPPORTED)).toBe('浏览器不支持');
    expect(core.statusLabel(core.STATES.ERROR)).toBe('识别出错');
  });
});

describe('v8.53 #59 core：持久化归一（损坏降级）', () => {
  it('normalizeState：正常透传（lang 白名单 + 段清洗）', () => {
    const r = core.normalizeState({ lang: 'en-US', segments: [{ text: 'hi', punct: '.', lang: 'en-US', at: 9, conf: 0.5 }] });
    expect(r.lang).toBe('en-US');
    expect(r.segments).toHaveLength(1);
    expect(r.segments[0]).toEqual({ text: 'hi', punct: '.', lang: 'en-US', at: 9, conf: 0.5 });
  });
  it('normalizeState：损坏 JSON 形态静默降级（null/非对象/漂移字段）', () => {
    expect(core.normalizeState(null)).toEqual({ lang: 'zh-CN', segments: [] });
    expect(core.normalizeState('oops')).toEqual({ lang: 'zh-CN', segments: [] });
    expect(core.normalizeState({ lang: 'bad', segments: 'nope' })).toEqual({ lang: 'zh-CN', segments: [] });
    const r = core.normalizeState({ segments: [null, 42, { text: '' }, { text: 'ok', punct: '!!!', lang: 'zz', at: -5, conf: 9 }] });
    expect(r.segments).toHaveLength(1);
    expect(r.segments[0]).toEqual({ text: 'ok', punct: '', lang: 'zh-CN', at: 0, conf: null });
  });
  it('normalizeState：分段封顶 SEGMENTS_MAX + 超长文本钳制', () => {
    const segs = [];
    for (let i = 0; i < core.SEGMENTS_MAX + 50; i++) segs.push({ text: 's' + i, punct: '', lang: 'zh-CN' });
    const r = core.normalizeState({ segments: segs });
    expect(r.segments).toHaveLength(core.SEGMENTS_MAX);
    expect(r.segments[r.segments.length - 1].text).toBe('s' + (core.SEGMENTS_MAX + 49));
    const long = core.normalizeState({ segments: [{ text: 'x'.repeat(5000) }] });
    expect(long.segments[0].text.length).toBe(core.SEGMENT_TEXT_MAX);
  });
});

describe('v8.53 #59 core：深链解析', () => {
  it('parseDeepLink：{lang} / {action:start,lang} 合法，lang 白名单归一', () => {
    expect(core.parseDeepLink({ lang: 'en-US' })).toEqual({ action: 'start', lang: 'en-US' });
    expect(core.parseDeepLink({ action: 'start', lang: 'zh-CN' })).toEqual({ action: 'start', lang: 'zh-CN' });
    expect(core.parseDeepLink({ lang: 'xx' })).toEqual({ action: 'start', lang: 'zh-CN' });
    expect(core.parseDeepLink({})).toEqual({ action: 'start', lang: 'zh-CN' });
  });
  it('parseDeepLink：非对象/未知 action/数组一律 null（不半解析）', () => {
    expect(core.parseDeepLink(null)).toBeNull();
    expect(core.parseDeepLink('start')).toBeNull();
    expect(core.parseDeepLink(42)).toBeNull();
    expect(core.parseDeepLink([])).toBeNull();
    expect(core.parseDeepLink({ action: 'stop' })).toBeNull();
  });
});

describe('v8.53 #59 页面接线（源码锚）', () => {
  it('core 脚本标签 + freeze-shim + md3-tokens 前置', () => {
    expect(PAGE_SRC.includes('src="../../js/stt-core.js"')).toBe(true);
    expect(PAGE_SRC.includes('src="../freeze-shim.js"')).toBe(true);
    expect(PAGE_SRC.includes('md3-tokens.css')).toBe(true);
  });
  it('SpeechRecognition 配置：continuous + interimResults + lang 注入（60s 不断流配置锚）', () => {
    expect(PAGE_SRC.includes('r.continuous = true')).toBe(true);
    expect(PAGE_SRC.includes('r.interimResults = true')).toBe(true);
    expect(PAGE_SRC.includes('r.lang = lang')).toBe(true);
  });
  it('中间结果即时上屏零节流（<300ms 锚：onresult 直写 textContent，无 debounce/setTimeout）', () => {
    expect(PAGE_SRC.includes('setInterim(alt.transcript)')).toBe(true);
    // interim 路径不得有节流包装：setInterim 定义内无 setTimeout
    const def = PAGE_SRC.split('function setInterim')[1]?.split('}')[0] || '';
    expect(def).not.toContain('setTimeout');
  });
  it('麦克风权限前置走 #55 统一对话框（__system.requestPermission microphone + 轮询注入）', () => {
    expect(PAGE_SRC.includes("requestSystemPermission('microphone')")).toBe(true);
    expect(PAGE_SRC.includes('__system.requestPermission')).toBe(true);
  });
  it('断流自动重启守卫：RESTARTABLE_ERRORS 门控 + userStop 双闸（防权限死循环）', () => {
    expect(PAGE_SRC.includes('core.RESTARTABLE_ERRORS[lastError]')).toBe(true);
    expect(PAGE_SRC.includes('if (!userStop && state === core.STATES.LISTENING &&')).toBe(true);
  });
  it('生命周期三路中止：APP_FREEZE 消息 + beforeunload + pagehide（无残留监听锚）', () => {
    expect(PAGE_SRC.includes("e.data.type === 'APP_FREEZE'")).toBe(true);
    expect(PAGE_SRC.includes("addEventListener('beforeunload', stopAll)")).toBe(true);
    expect(PAGE_SRC.includes("addEventListener('pagehide', stopAll)")).toBe(true);
    expect(PAGE_SRC.includes('rec.abort()')).toBe(true);
  });
  it('深链双保险：HTML 解析期 inline 缓冲 __sttDeepLink + stt/start 事件（ocr 同款时序）', () => {
    expect(PAGE_SRC.includes("d.event !== 'stt/start'")).toBe(true);
    expect(PAGE_SRC.includes('window.__sttDeepLink = window.__sttDeepLink || []')).toBe(true);
    expect(PAGE_SRC.indexOf('__sttDeepLink')).toBeLessThan(PAGE_SRC.indexOf('(function () {\n    \'use strict\';'));
  });
  it('降级提示：不支持 Web Speech 时 banner 文案 + UNSUPPORTED 状态', () => {
    expect((PAGE_SRC.match(/此浏览器不支持 Web Speech 语音识别/g) || []).length).toBe(2); // init + start 双路径
    expect(PAGE_SRC.includes('core.STATES.UNSUPPORTED')).toBe(true);
  });
  it('一键复制：clipboard API + execCommand 回退（分段卡 + 复制全部双通道）', () => {
    expect(PAGE_SRC.includes('navigator.clipboard.writeText')).toBe(true);
    expect(PAGE_SRC.includes('execCommand')).toBe(true);
    expect(PAGE_SRC.includes('core.buildTranscript(segments)')).toBe(true);
  });
  it('零 innerHTML 纪律（动态输出全 textContent）', () => {
    expect(PAGE_SRC.includes('.innerHTML')).toBe(false);
  });
  it('e2e 测试锚 data-test 齐备', () => {
    ['st-badge', 'st-langrow', 'st-mic', 'st-interim', 'st-segs', 'st-segcount',
     'st-clear', 'st-copyall', 'st-banner', 'st-dur', 'st-toast'].forEach((t) => {
      expect(PAGE_SRC.includes(`data-test="${t}"`), t).toBe(true);
    });
  });
  it('初始化绝不自动开麦（restore 只恢复状态不动 recognition）', () => {
    const initBlock = PAGE_SRC.split('function init()')[1]?.split('micEl.addEventListener')[0] || '';
    expect(initBlock.includes('rec.start()')).toBe(false);
    expect(initBlock.includes('start()')).toBe(false);
  });
});

describe('v8.53 #59 注册链（stt 系第 43 应用 · radio 后全库 44）', () => {
  it('apps/stt.js iframe 壳定义（id=stt / iframeAppContent）', () => {
    expect(SHELL_SRC.includes("id: 'stt'")).toBe(true);
    expect(SHELL_SRC.includes('iframeAppContent')).toBe(true);
    expect(SHELL_SRC.includes('apps/stt/index.html')).toBe(true);
  });
  it('apps-data.js 导入 + 第 2 页数组末位（第 43 位）', () => {
    expect(APPSDATA_SRC.includes("import stt from './apps/stt.js'")).toBe(true);
    expect(APPSDATA_SRC.includes('midiPlayer, ocr, stt,')).toBe(true);
  });
  it('app-icons.js 「stt」图标在册（hsl 公式纪律）+ fixture 3 动态色声明', () => {
    expect(ICONS_SRC.includes("'stt': `<svg")).toBe(true);
    const sttIcon = ICONS_SRC.split("'stt': `<svg")[1]?.split('</svg>`')[0] || '';
    expect(sttIcon).not.toContain('style="stroke:#');   // style 内只许 hsl 公式（v8.50 纪律）
    expect(sttIcon).not.toContain('style="fill:#');
    expect(sttIcon.match(/(?:fill|stroke):hsl\(/g) || []).toHaveLength(3);
    expect(FIXTURE.icons['stt']).toBeDefined();
    expect(FIXTURE.icons['stt'].dynamic).toBe(3);
    expect(FIXTURE.icons['stt'].colors).toHaveLength(3);
  });
  it('terminal-core：APPS 行 + COMMANDS 注册（34 命令）', () => {
    expect(TCORE_SRC.includes("['stt', '语音转文字', 'stt', '听写', '语音']")).toBe(true);
    expect(TCORE_SRC.includes("stt:      { group: '应用'")).toBe(true);
    expect(TCORE_SRC.match(/group: '应用'/g).length).toBe(8);   // open/apps/print/beat/code/ocr/stt/radio — 应用组 8 条
  });
  it('terminal 页 case stt：lang 参数 + openApp 深链（stt/start 载荷）', () => {
    expect(TPAGE_SRC.includes("case 'stt':")).toBe(true);
    expect(TPAGE_SRC.includes("openApp('stt', { event: 'stt/start'")).toBe(true);
    expect(TPAGE_SRC.includes("usage: stt [zh-CN|en-US]")).toBe(true);
  });
});
