// ==================== v854-radio.test.js — #61 收音机（v8.54） ====================
// 验收锚（#61 原文）：radio-browser.info 台库（language:chinese + https 流过滤 +
// codec mp3/aac）+ 避开 nightsky 双坑（http mixed content 拦截 / m3u8 不入 audio）+
// 播放器台名+码率+缓冲态 + 自定义流 URL 校验 + 断流自动重连 3 次退避可关 +
// 台库缓存 24h + vitest 锚（纯逻辑部分）。headless 无声卡：e2e 以状态机/
// canplay stub 为锚（scripts/e2e-v854-radio.mjs），真机听感留观察。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/js/radio-core.js'), 'utf8');
const PAGE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/radio/index.html'), 'utf8');
const SHELL_SRC = readFileSync(join(ROOT, 'ios-desktop/js/apps/radio.js'), 'utf8');
const APPSDATA_SRC = readFileSync(join(ROOT, 'ios-desktop/js/apps-data.js'), 'utf8');
const ICONS_SRC = readFileSync(join(ROOT, 'ios-desktop/js/app-icons.js'), 'utf8');
const TCORE_SRC = readFileSync(join(ROOT, 'ios-desktop/js/terminal-core.js'), 'utf8');
const TPAGE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/terminal/index.html'), 'utf8');
const FIXTURE = JSON.parse(readFileSync(join(ROOT, 'tests/icon-dynamic-colors.generated.json'), 'utf-8'));

// ---------- 沙箱提取（经典脚本 IIFE → window.__radioCore） ----------
const ctx = { window: {} };
new Function('window', CORE_SRC)(ctx.window);
const core = ctx.window.__radioCore;

describe('v8.54 #61 core：双坑闸门（URL 校验）', () => {
  it('isValidStreamUrl：https 直流全过（mp3/aac/无扩展名流）', () => {
    expect(core.isValidStreamUrl('https://lhttp.qtfm.cn/live/15318317/64k.mp3')).toBe(true);
    expect(core.isValidStreamUrl('https://stream.zeno.fm/689zc32y4x8uv')).toBe(true);
    expect(core.isValidStreamUrl('https://streams.radiomast.io/ce298b32-8776-4192-9900-092f44b63e7f')).toBe(true);
    expect(core.isValidStreamUrl('  https://host.example/a.mp3?token=1  ')).toBe(true);  // trim 容忍
  });
  it('坑一闸门：http 明文流一律拒绝（mixed content）', () => {
    expect(core.isValidStreamUrl('http://ls.qingting.fm/live/3412131.m3u8')).toBe(false);
    expect(core.isValidStreamUrl('http://host.example/stream.mp3')).toBe(false);
    expect(core.isPlainHttpUrl('http://host.example/stream.mp3')).toBe(true);
    expect(core.isPlainHttpUrl('https://host.example/stream.mp3')).toBe(false);
    expect(core.isPlainHttpUrl('ftp://x')).toBe(false);
  });
  it('坑二闸门：m3u/m3u8 播放列表一律拒绝（Chrome audio 不支持）', () => {
    expect(core.isM3uUrl('https://host/live/3412131.m3u8')).toBe(true);
    expect(core.isM3uUrl('https://host/live/3412131.m3u8?bitrate=64')).toBe(true);
    expect(core.isM3uUrl('https://host/live/3412131.m3u')).toBe(true);
    expect(core.isM3uUrl('https://host/live/3412131.M3U8')).toBe(true);
    expect(core.isM3uUrl('https://host/live/64k.mp3')).toBe(false);
    expect(core.isM3uUrl('https://host/live/m3u8less')).toBe(false);   // 非扩展名不误伤
    expect(core.isValidStreamUrl('https://host/live/3412131.m3u8?bitrate=64')).toBe(false);
  });
  it('协议/形态防线：非 https 前缀、空白/控制字符、超长、无 host 一律拒绝', () => {
    expect(core.isValidStreamUrl('HTTPS://host/a.mp3')).toBe(false);    // 大写协议不通过（保守小写闸）
    expect(core.isValidStreamUrl('ftp://host/a.mp3')).toBe(false);
    expect(core.isValidStreamUrl('javascript:alert(1)')).toBe(false);
    expect(core.isValidStreamUrl('https://hos t/a.mp3')).toBe(false);   // 空白
    expect(core.isValidStreamUrl('https://host/a.mp3\nEvil')).toBe(false);
    expect(core.isValidStreamUrl('https://nodash')).toBe(false);        // host 无点
    expect(core.isValidStreamUrl('https:///a.mp3')).toBe(false);        // 空 host
    expect(core.isValidStreamUrl('https://' + 'a'.repeat(2100) + '/x')).toBe(false);  // 超长
    expect(core.isValidStreamUrl('')).toBe(false);
    expect(core.isValidStreamUrl(null)).toBe(false);
    expect(core.isValidStreamUrl(42)).toBe(false);
  });
});

describe('v8.54 #61 core：台库过滤管线（radio-browser 形态）', () => {
  // 实抓样例形态（2026-10-28 de1 快照）：坑样本 m3u8+http+HLS:1 与合法 https mp3/aac
  const API_SHAPE = [
    { stationuuid: 'a1', name: '华语金曲500首', url: 'http://ls.qingting.fm/live/3412131.m3u8?bitrate=64', url_resolved: 'http://ls.qingting.fm/live/3412131.m3u8?bitrate=64', codec: 'UNKNOWN', bitrate: 0, votes: 17379, hls: 1, homepage: 'https://m.qingting.fm/' },
    { stationuuid: 'a2', name: 'CNR-1 中国之声', url: 'https://lhttp.qtfm.cn/live/15318317/64k.mp3', url_resolved: 'https://lhttp.qtfm.cn/live/15318317/64k.mp3', codec: 'MP3', bitrate: 0, votes: 10169 },
    { stationuuid: 'a3', name: 'BBN 中文', url: 'https://streams.radiomast.io/ce298b32', url_resolved: 'https://streams.radiomast.io/ce298b32', codec: 'AAC', bitrate: 64, votes: 1382 },
    { stationuuid: 'a4', name: 'hls台', url: 'https://host/live.m3u8', url_resolved: 'https://host/live.m3u8', codec: 'MP3', bitrate: 128, votes: 900 },
    { stationuuid: 'a5', name: 'ogg台', url: 'https://host/live.ogg', url_resolved: 'https://host/live.ogg', codec: 'OGG', bitrate: 128, votes: 800 },
    { stationuuid: 'a6', name: 'CNR-1 中国之声', url: 'https://lhttp.qtfm.cn/live/15318317/64k.mp3', url_resolved: 'https://lhttp.qtfm.cn/live/15318317/64k.mp3', codec: 'MP3', bitrate: 0, votes: 999 },
    { stationuuid: 'a7', name: '无URL台', url: '', url_resolved: '', codec: 'MP3', bitrate: 0, votes: 500 },
    null,
    { name: '缺uuid台', url: 'https://host/ok.mp3', url_resolved: 'https://host/ok.mp3', codec: 'AACP', bitrate: 32, votes: 10 },
    { stationuuid: 'a8', name: '  带空白台  ', url: '  https://host/trim.mp3  ', codec: 'MP3', bitrate: 99999, votes: 7 },
  ];
  it('filterStations：https 直流白名单 + 双坑剔除 + 归一', () => {
    const out = core.filterStations(API_SHAPE);
    const names = out.map((s) => s.name);
    expect(names).toContain('CNR-1 中国之声');
    expect(names).toContain('BBN 中文');
    expect(names).toContain('带空白台');
    expect(names).not.toContain('华语金曲500首');   // http + m3u8 + UNKNOWN 三重坑样本
    expect(names).not.toContain('hls台');            // https 但 m3u8（坑二）
    expect(names).not.toContain('ogg台');            // OGG 容器不在白名单
    expect(names).not.toContain('无URL台');
    const trim = out.find((s) => s.name === '带空白台');
    expect(trim.name).toBe('带空白台');
    expect(trim.url).toBe('https://host/trim.mp3');
    expect(trim.bitrate).toBe(999);                  // 钳制 999
  });
  it('filterStations：同名同址去重保留票高者 + 票数降序', () => {
    const out = core.filterStations(API_SHAPE);
    const cnr = out.filter((s) => s.name === 'CNR-1 中国之声');
    expect(cnr).toHaveLength(1);
    expect(cnr[0].votes).toBe(10169);                // 票高者胜（10169 > 999）
    for (let i = 1; i < out.length; i++) {
      expect(out[i - 1].votes).toBeGreaterThanOrEqual(out[i].votes);
    }
  });
  it('filterStations：畸形输入不抛错（null/字符串/数组混入）', () => {
    expect(core.filterStations(null)).toEqual([]);
    expect(core.filterStations('bad')).toEqual([]);
    expect(core.filterStations([null, 42, {}, { name: 'x' }])).toEqual([]);
  });
  it('normalizeStation：url_resolved 优先 + 票数/码率钳制 + 超长名截断', () => {
    const s = core.normalizeStation({ stationuuid: 'u', name: 'x'.repeat(200), url: 'http://fallback', url_resolved: 'https://resolved/live.mp3', codec: 'mp3', bitrate: 5000, votes: -5, homepage: 'h'.repeat(300) });
    expect(s.url).toBe('https://resolved/live.mp3');  // url_resolved 优先
    expect(s.name.length).toBe(120);
    expect(s.codec).toBe('MP3');                      // 大写归一
    expect(s.bitrate).toBe(999);
    expect(s.votes).toBe(0);                          // 负票归零
    expect(s.homepage.length).toBe(200);
  });
  it('mergeWithSeed：在线不足 20 台时种子补足（同名让位）+ 充足时原样', () => {
    const two = core.filterStations(API_SHAPE);
    expect(two.length).toBeLessThan(20);
    const merged = core.mergeWithSeed(API_SHAPE);
    expect(merged.length).toBeGreaterThanOrEqual(20);
    expect(merged.length).toBeLessThanOrEqual(core.STATIONS_MAX);
    // 在线条目在前（票高），种子条目不含与在线同名者
    const onlineNames = new Set(two.map((s) => s.name.toLowerCase()));
    merged.slice(two.length).forEach((s) => expect(onlineNames.has(s.name.toLowerCase())).toBe(false));
    // 充足在线台库（30 台）→ 不掺种子
    const plenty = [];
    for (let i = 0; i < 30; i++) plenty.push({ stationuuid: 'p' + i, name: '台' + i, url: 'https://h' + i + '.example/live.mp3', codec: 'MP3', bitrate: 128, votes: 100 - i });
    expect(core.mergeWithSeed(plenty)).toHaveLength(30);
  });
  it('SEED_STATIONS：内置台库 20+ 中文台且逐台过双坑闸门（离线兜底验收锚）', () => {
    expect(core.SEED_STATIONS.length).toBeGreaterThanOrEqual(20);
    core.SEED_STATIONS.forEach((s) => {
      expect(core.isValidStreamUrl(s.url), s.url).toBe(true);
      expect(['MP3', 'AAC', 'AACP']).toContain(s.codec);
      expect(typeof s.name).toBe('string');
      expect(s.name.length).toBeGreaterThan(0);
    });
    const urls = new Set(core.SEED_STATIONS.map((s) => s.url));
    expect(urls.size).toBe(core.SEED_STATIONS.length);  // 无重复流
  });
  it('buildApiUrl：镜像拼装 + language=chinese 参数集中', () => {
    expect(core.buildApiUrl('https://de1.api.radio-browser.info')).toBe('https://de1.api.radio-browser.info/json/stations/search?language=chinese&order=votes&reverse=true&hidebroken=true&limit=200');
    expect(core.buildApiUrl('https://de2.api.radio-browser.info/')).not.toContain('//json');   // 尾斜杠容错
  });
});

describe('v8.54 #61 core：台库缓存 24h', () => {
  it('cacheWrite/cacheRead：新鲜期内命中且台站归一清洗', () => {
    const now = 1_700_000_000_000;
    const payload = core.cacheWrite(core.SEED_STATIONS.slice(0, 3), now);
    expect(payload.at).toBe(now);
    const read = core.cacheRead(payload, now + core.CACHE_TTL_MS - 1000);
    expect(read.fresh).toBe(true);
    expect(read.stations).toHaveLength(3);
    expect(read.stations[0].name).toBe(core.SEED_STATIONS[0].name);
  });
  it('cacheRead：过期（≥24h）/倒挂时间/损坏形态 → fresh:false', () => {
    const now = 1_700_000_000_000;
    const payload = core.cacheWrite([{ stationuuid: 'u', name: 'x', url_resolved: 'https://h/a.mp3', codec: 'MP3' }], now);
    expect(core.cacheRead(payload, now + core.CACHE_TTL_MS).fresh).toBe(false);       // 恰 24h 即过期
    expect(core.cacheRead(payload, now - 5).fresh).toBe(false);                        // 时间倒挂
    expect(core.cacheRead(null, now).fresh).toBe(false);
    expect(core.cacheRead('bad', now).fresh).toBe(false);
    expect(core.cacheRead({ at: now }, now).fresh).toBe(false);                        // 缺 stations
    expect(core.cacheRead({ at: 'x', stations: [] }, now).fresh).toBe(false);
    // 过期台站仍透传（保底展示），但逐台归一
    const stale = core.cacheRead(payload, now + core.CACHE_TTL_MS + 1);
    expect(stale.stations).toHaveLength(1);
    expect(stale.stations[0].url).toBe('https://h/a.mp3');
  });
});

describe('v8.54 #61 core：断流自动重连（3 次退避，可关）', () => {
  it('RECONNECT_MAX=3 + 退避序列 1s/2s/4s', () => {
    expect(core.RECONNECT_MAX).toBe(3);
    expect(core.RECONNECT_STEPS_MS).toEqual([1000, 2000, 4000]);
    expect(core.nextReconnect(0, true)).toEqual({ action: 'retry', attempt: 1, delayMs: 1000 });
    expect(core.nextReconnect(1, true)).toEqual({ action: 'retry', attempt: 2, delayMs: 2000 });
    expect(core.nextReconnect(2, true)).toEqual({ action: 'retry', attempt: 3, delayMs: 4000 });
  });
  it('耗尽 3 次后 give-up（不无限自旋）', () => {
    expect(core.nextReconnect(3, true)).toEqual({ action: 'give-up' });
    expect(core.nextReconnect(10, true)).toEqual({ action: 'give-up' });
  });
  it('重连可关（autoReconnect=false 一律 give-up）+ 畸形参数防线', () => {
    expect(core.nextReconnect(0, false)).toEqual({ action: 'give-up' });
    expect(core.nextReconnect(0, undefined)).toEqual({ action: 'give-up' });
    expect(core.nextReconnect(null, true)).toEqual({ action: 'retry', attempt: 1, delayMs: 1000 });  // 畸形 attempt 归零
    expect(core.nextReconnect(-3, true).attempt).toBe(1);
  });
});

describe('v8.54 #61 core：格式化与文案', () => {
  it('fmtBitrate：0/非法 → —（radio-browser 大量 0 码率不误导）', () => {
    expect(core.fmtBitrate(128)).toBe('128 kbps');
    expect(core.fmtBitrate(64.4)).toBe('64 kbps');
    expect(core.fmtBitrate(0)).toBe('—');
    expect(core.fmtBitrate(-5)).toBe('—');
    expect(core.fmtBitrate(NaN)).toBe('—');
    expect(core.fmtBitrate('x')).toBe('—');
  });
  it('fmtMeta：容器+码率组合 / 无码率省哑元', () => {
    expect(core.fmtMeta('MP3', 128)).toBe('MP3 · 128 kbps');
    expect(core.fmtMeta('AAC', 0)).toBe('AAC');
    expect(core.fmtMeta('', 64)).toBe('64 kbps');
    expect(core.fmtMeta('', 0)).toBe('—');
  });
  it('statusLabel：状态机中文文案全覆盖', () => {
    expect(core.statusLabel(core.STATES.IDLE)).toBe('待机');
    expect(core.statusLabel(core.STATES.LOADING)).toBe('台库加载中…');
    expect(core.statusLabel(core.STATES.CONNECTING)).toBe('缓冲中…');
    expect(core.statusLabel(core.STATES.PLAYING)).toBe('播放中');
    expect(core.statusLabel(core.STATES.ERROR)).toBe('播放出错');
  });
  it('errorLabel：MediaError 枚举 + 双坑专项文案 + 未知前向兼容', () => {
    expect(core.errorLabel('network')).toContain('网络');
    expect(core.errorLabel('decode')).toContain('编码');
    expect(core.errorLabel('src-not-supported')).toContain('格式');
    expect(core.errorLabel('mixed-content')).toContain('mixed content');
    expect(core.errorLabel('hls')).toContain('m3u8');
    expect(core.errorLabel('autoplay')).toContain('自动播放');
    expect(core.errorLabel('weird')).toContain('weird');
    expect(core.errorLabel(null)).toContain('unknown');
  });
});

describe('v8.54 #61 core：持久化归一（损坏降级）', () => {
  it('normalizeState：正常透传（音量钳 0-1 / 开关布尔 / last 电台）', () => {
    const r = core.normalizeState({ volume: 0.55, autoReconnect: false, last: { id: 'i', name: '台', url: 'https://h.example/a.mp3', bitrate: 128, codec: 'mp3', custom: true } });
    expect(r.volume).toBe(0.55);
    expect(r.autoReconnect).toBe(false);
    expect(r.last).toEqual({ id: 'i', name: '台', url: 'https://h.example/a.mp3', bitrate: 128, codec: 'MP3', custom: true });
  });
  it('normalizeState：音量越界钳制 + 缺省 0.9/true', () => {
    expect(core.normalizeState({}).volume).toBe(0.9);
    expect(core.normalizeState({}).autoReconnect).toBe(true);
    expect(core.normalizeState({ volume: 1.7 }).volume).toBe(1);
    expect(core.normalizeState({ volume: -0.2 }).volume).toBe(0);
    expect(core.normalizeState({ volume: 'loud' }).volume).toBe(0.9);
  });
  it('normalizeState：last 双坑闸门——http/m3u8/缺名电台持久化被拒（防改写复播危险流）', () => {
    expect(core.normalizeState({ last: { name: 'x', url: 'http://h/a.mp3' } }).last).toBeNull();
    expect(core.normalizeState({ last: { name: 'x', url: 'https://h/a.m3u8' } }).last).toBeNull();
    expect(core.normalizeState({ last: { name: '', url: 'https://h/a.mp3' } }).last).toBeNull();
    expect(core.normalizeState({ last: 'x' }).last).toBeNull();
    expect(core.normalizeState({ last: [] }).last).toBeNull();
  });
  it('normalizeState：损坏形态静默降级（null/数组/字符串）', () => {
    expect(core.normalizeState(null)).toEqual({ volume: 0.9, autoReconnect: true, last: null });
    expect(core.normalizeState('oops').autoReconnect).toBe(true);
    expect(core.normalizeState([]).last).toBeNull();
  });
});

describe('v8.54 #61 core：深链解析（radio/play）', () => {
  it('合法 https 流 → {action:play, url, valid:true}；带台名透传', () => {
    expect(core.parseDeepLink({ url: 'https://h.example/a.mp3' })).toEqual({ action: 'play', url: 'https://h.example/a.mp3', valid: true, name: '' });
    expect(core.parseDeepLink({ action: 'play', url: 'https://h.example/a.mp3', name: '我的台' }).name).toBe('我的台');
  });
  it('http/m3u8/无效流 → valid:false + reason 双坑定位（不半解析播放）', () => {
    expect(core.parseDeepLink({ url: 'http://h/a.mp3' })).toEqual({ action: 'play', url: 'http://h/a.mp3', valid: false, reason: 'mixed-content' });
    expect(core.parseDeepLink({ url: 'https://h/a.m3u8' }).reason).toBe('hls');
    expect(core.parseDeepLink({ url: 'notaurl' }).reason).toBe('invalid');
  });
  it('stop 动作 + 非法载荷 null（不半解析）', () => {
    expect(core.parseDeepLink({ action: 'stop' })).toEqual({ action: 'stop' });
    expect(core.parseDeepLink(null)).toBeNull();
    expect(core.parseDeepLink('play')).toBeNull();
    expect(core.parseDeepLink(42)).toBeNull();
    expect(core.parseDeepLink({})).toBeNull();          // 无 url 无 stop
    expect(core.parseDeepLink({ url: '   ' })).toBeNull();
  });
});

describe('v8.54 #61 页面接线（源码锚）', () => {
  it('core 脚本标签 + freeze-shim + md3-tokens 前置 + audio 元素', () => {
    expect(PAGE_SRC.includes('src="../../js/radio-core.js"')).toBe(true);
    expect(PAGE_SRC.includes('src="../freeze-shim.js"')).toBe(true);
    expect(PAGE_SRC.includes('md3-tokens.css')).toBe(true);
    expect(PAGE_SRC.includes('<audio id="rdAudio" preload="none">')).toBe(true);
  });
  it('台库管线：缓存命中 → 在线镜像轮换 → 种子兜底（三态来源文案）', () => {
    expect(PAGE_SRC.includes('core.cacheRead(readJSON(core.CACHE_KEY, null), Date.now())')).toBe(true);
    expect(PAGE_SRC.includes('core.API_MIRRORS.length')).toBe(true);
    expect(PAGE_SRC.includes('core.mergeWithSeed([])')).toBe(true);
    expect(PAGE_SRC.includes('在线台库（')).toBe(true);
    expect(PAGE_SRC.includes('缓存台库（')).toBe(true);
    expect(PAGE_SRC.includes('内置台库（离线兜底 · ')).toBe(true);
  });
  it('重连守卫接线：nextReconnect 裁决 + wantPlay 闸 + 可关（checkbox）', () => {
    expect(PAGE_SRC.includes('core.nextReconnect(reconnectAttempts, autoEl.checked)')).toBe(true);
    expect(PAGE_SRC.includes("if (!wantPlay) return;")).toBe(true);
    expect(PAGE_SRC.includes('id="rdAuto"')).toBe(true);
  });
  it('生命周期三路中止：APP_FREEZE 消息 + beforeunload + pagehide（无残留播放/退避定时器）', () => {
    expect(PAGE_SRC.includes("e.data.type === 'APP_FREEZE'")).toBe(true);
    expect(PAGE_SRC.includes("addEventListener('beforeunload', stopAll)")).toBe(true);
    expect(PAGE_SRC.includes("addEventListener('pagehide', stopAll)")).toBe(true);
    expect(PAGE_SRC.includes('audio.pause()')).toBe(true);
    expect(PAGE_SRC.includes('clearReconnect()')).toBe(true);
  });
  it('深链双保险：HTML 解析期 inline 缓冲 __radioDeepLink + radio/play 事件（stt 同款时序）', () => {
    expect(PAGE_SRC.includes("d.event !== 'radio/play'")).toBe(true);
    expect(PAGE_SRC.includes('window.__radioDeepLink = window.__radioDeepLink || []')).toBe(true);
    expect(PAGE_SRC.indexOf('__radioDeepLink')).toBeLessThan(PAGE_SRC.indexOf("(function () {\n    'use strict';"));
  });
  it('autoplay 纪律：初始化绝不自动出声（restore 只恢复 UI 与选台）', () => {
    const initBlock = PAGE_SRC.split('function init()')[1]?.split('init();')[0] || '';
    expect(initBlock.includes('audio.play()')).toBe(false);
    expect(initBlock.includes('playStation(')).toBe(false);
  });
  it('音量接线：input 事件即时 audio.volume + 持久化', () => {
    expect(PAGE_SRC.includes("volEl.addEventListener('input'")).toBe(true);
    expect(PAGE_SRC.includes('audio.volume =')).toBe(true);
  });
  it('自定义流输入：Enter 触发 + 校验拒绝文案三态（http/m3u8/无效）', () => {
    expect(PAGE_SRC.includes("if (e.key === 'Enter') urlPlayEl.click()")).toBe(true);
    expect(PAGE_SRC.includes('core.isPlainHttpUrl(url)')).toBe(true);
    expect(PAGE_SRC.includes('core.isM3uUrl(url)')).toBe(true);
  });
  it('零 innerHTML 纪律（动态输出全 textContent/createElement）', () => {
    expect(PAGE_SRC.includes('.innerHTML')).toBe(false);
  });
  it('e2e 测试锚 data-test 齐备', () => {
    ['rd-badge', 'rd-banner', 'rd-dial', 'rd-name', 'rd-meta', 'rd-play', 'rd-vol', 'rd-auto',
     'rd-url', 'rd-urlplay', 'rd-list', 'rd-count', 'rd-refresh', 'rd-src', 'rd-toast',
     'rd-ico-play', 'rd-ico-pause'].forEach((t) => {
      expect(PAGE_SRC.includes(`data-test="${t}"`), t).toBe(true);
    });
  });
});

describe('v8.54 #61 注册链（radio 系第 44 应用 · driving 后全库 45）', () => {
  it('apps/radio.js iframe 壳定义（id=radio / iframeAppContent）', () => {
    expect(SHELL_SRC.includes("id: 'radio'")).toBe(true);
    expect(SHELL_SRC.includes('iframeAppContent')).toBe(true);
    expect(SHELL_SRC.includes('apps/radio/index.html')).toBe(true);
  });
  it('apps-data.js 导入 + 第 2 页数组（radio 系第 44 位 · v8.55 driving 末位）', () => {
    expect(APPSDATA_SRC.includes("import radio from './apps/radio.js'")).toBe(true);
    expect(APPSDATA_SRC.includes('midiPlayer, ocr, stt, radio, driving,')).toBe(true);
  });
  it('app-icons.js 「radio」图标在册（hsl 公式纪律）+ fixture 5 动态色声明', () => {
    expect(ICONS_SRC.includes("'radio': `<svg")).toBe(true);
    const radioIcon = ICONS_SRC.split("'radio': `<svg")[1]?.split('</svg>`')[0] || '';
    expect(radioIcon).not.toContain('style="stroke:#');   // style 内只许 hsl 公式（v8.50 纪律）
    expect(radioIcon).not.toContain('style="fill:#');
    expect(radioIcon.match(/(?:fill|stroke):hsl\(/g) || []).toHaveLength(5);
    expect(FIXTURE.icons['radio']).toBeDefined();
    expect(FIXTURE.icons['radio'].dynamic).toBe(5);
    expect(FIXTURE.icons['radio'].colors).toHaveLength(5);
  });
  it('terminal-core：APPS 行 + COMMANDS 注册（35 命令）', () => {
    expect(TCORE_SRC.includes("['radio', '收音机', 'radio', '电台', '广播']")).toBe(true);
    expect(TCORE_SRC.includes("radio:    { group: '应用'")).toBe(true);
    expect(TCORE_SRC.match(/group: '应用'/g).length).toBe(9);   // open/apps/print/beat/code/ocr/stt/radio/driving — 应用组 9 条
  });
  it('terminal 页 case radio：url 可选参数 + openApp 深链（radio/play 载荷）', () => {
    expect(TPAGE_SRC.includes("case 'radio':")).toBe(true);
    expect(TPAGE_SRC.includes("openApp('radio', { event: 'radio/play'")).toBe(true);
    expect(TPAGE_SRC.includes('usage: radio [https://…/stream.mp3]')).toBe(true);
  });
});
