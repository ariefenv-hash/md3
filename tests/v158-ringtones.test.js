// ==================== v158-ringtones.test.js — #158 主线：闹钟铃声 AOSP 真实资源（v10.37） ====================
//
// 覆盖（AsyncRingtonePlayer / RingtoneManager.TYPE_ALARM「铃声=音频文件资源」语义对齐）：
//  A. 素材在库：AOSP 元素系列 6 枚 + DeskClock timer_expire.ogg（OggS 魔数 + bytes/sha256 实拉快照逐枚钉死）
//  B. 统一回退开关：readAudioResourceMode 三态校验（非法/缺省/存储异常→auto）+ writeAudioResourceMode
//     （非法拒绝 / 异常静默）——#158/#161 共用一键（用户裁决：一个开关管全部音频资源）
//  C. 选路纯逻辑：findAlarmRingtone / alarmRingtoneUrl / shouldUseAssetRingtone 三态矩阵 /
//     pickTimerRingtone（AOSP 双播放器 TimerStream 语义）
//  D. 资产轨播放器：verdict 协议（playing/failed）+ 同源续播仅同步音量（离散渐强）+ 失败记账防循环重试
//     + error/play() rejection 双回落 + stop 释放 + 音量钳制
//  E. 接线源码锚：alarm.mjs（import/资产轨优先分支/dR 同停/sR ringtone 透传/观测面/试听单发）+
//     timer.mjs（timer_expire 单源）+ index.html（6 选项）+ app.mjs（默认 platinum + 启动回填）+
//     settings.js（统一回退开关 UI + localStorage 落盘）+ sound-haptics.js（synth 免资源 / asset 缺失静默）
//  F. 回归锚：v849 playRing 头部形态 + v158 C1 标量链保持 + vite assets 整目录复制链路（alarms/ 新目录自动纳管）
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const R = (p) => readFileSync(resolve(ROOT, p), 'utf-8');

import {
  ALARM_RINGTONES, TIMER_EXPIRE_ASSET, ALARM_ASSET_POOL, ALARM_RINGTONE_BASE,
  AUDIO_RESOURCE_MODE_KEY, findAlarmRingtone, alarmRingtoneUrl,
  readAudioResourceMode, writeAudioResourceMode, shouldUseAssetRingtone, pickTimerRingtone,
  createAlarmAssetPlayer,
} from '../ios-desktop/js/aosp/alarm-ringtone.js';

const ALARM_DIR = resolve(ROOT, 'ios-desktop/assets/audio/alarms');

// ---------- B/C/D 用假 store / 假 Audio ----------
const memStore = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};
const throwingStore = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('SecurityError'); } };

class FakeAudio {
  constructor(url, { failLoad = false, rejectPlay = false } = {}) {
    this.src = url;
    this.loop = false;
    this.volume = 1;
    this.paused = true;
    this._listeners = {};
    this.failLoad = failLoad;
    this.rejectPlay = rejectPlay;
    FakeAudio.created.push(this);
  }
  addEventListener(type, fn) { (this._listeners[type] = this._listeners[type] || []).push(fn); }
  play() {
    this.paused = false;
    if (this.rejectPlay) return Promise.reject(new Error('NotAllowedError'));
    return (this.failLoad) ? Promise.resolve().then(() => { this._fire('error'); }) : Promise.resolve();
  }
  pause() { this.paused = true; }
  _fire(type) { (this._listeners[type] || []).forEach((fn) => fn()); }
}
FakeAudio.created = [];

// ==================== A. 素材在库 ====================
describe('A. #158 AOSP 铃声素材在库（OggS 魔数 + 快照逐枚钉死）', () => {
  it('A1 文件清单恰 7 枚（6 闹钟 + timer_expire），无多无少', () => {
    const files = readdirSync(ALARM_DIR).sort();
    expect(files).toEqual([...ALARM_ASSET_POOL.map((r) => r.file)].sort());
    expect(files.length).toBe(7);
  });
  it.each(ALARM_ASSET_POOL.map((r) => [r.id, r]))('A2 %s：OggS 魔数 + bytes/sha256 与 AOSP 实拉快照一致', (_, r) => {
    const buf = readFileSync(join(ALARM_DIR, r.file));
    expect(buf.length).toBe(r.bytes);
    expect(buf.subarray(0, 4).toString('latin1')).toBe('OggS');
    expect(createHash('sha256').update(buf).digest('hex')).toBe(r.sha256);
  });
  it('A3 体量预算：全池 ≤ 720KB（issue 裁决首批 509KB 量级 + timer_expire 175KB）', () => {
    const total = ALARM_ASSET_POOL.reduce((s, r) => s + r.bytes, 0);
    expect(total).toBeLessThanOrEqual(720 * 1024);
    expect(total).toBeGreaterThan(600 * 1024);
  });
  it('A4 元素系列真源口径：Alarm_Beep_02/Buzzer 自 android-11 起不在库（替代裁决在录）', () => {
    expect(ALARM_RINGTONES.length).toBe(6);
    expect(ALARM_RINGTONES.every((r) => !/Alarm_Beep|Alarm_Buzzer/i.test(r.file))).toBe(true);
  });
});

// ==================== B. 统一回退开关 ====================
describe('B. 统一回退开关（#158/#161 共用一键）', () => {
  it('B1 键名与三态校验：非法/缺省→auto，存储异常→auto', () => {
    expect(AUDIO_RESOURCE_MODE_KEY).toBe('ios-desktop:audio-resource-mode');
    expect(readAudioResourceMode(memStore({ 'ios-desktop:audio-resource-mode': 'asset' }))).toBe('asset');
    expect(readAudioResourceMode(memStore({ 'ios-desktop:audio-resource-mode': 'synth' }))).toBe('synth');
    expect(readAudioResourceMode(memStore({ 'ios-desktop:audio-resource-mode': 'auto' }))).toBe('auto');
    expect(readAudioResourceMode(memStore({ 'ios-desktop:audio-resource-mode': 'foo' }))).toBe('auto');
    expect(readAudioResourceMode(memStore())).toBe('auto');
    expect(readAudioResourceMode(throwingStore)).toBe('auto');
    expect(readAudioResourceMode(null)).toBe('auto');
  });
  it('B2 写入：合法三态落盘 true / 非法拒绝不落盘 / 异常静默 false', () => {
    const s = memStore();
    expect(writeAudioResourceMode(s, 'synth')).toBe(true);
    expect(s.getItem(AUDIO_RESOURCE_MODE_KEY)).toBe('synth');
    expect(writeAudioResourceMode(s, 'FORCE')).toBe(false);
    expect(s.getItem(AUDIO_RESOURCE_MODE_KEY)).toBe('synth');
    expect(writeAudioResourceMode(throwingStore, 'asset')).toBe(false);
  });
});

// ==================== C. 选路纯逻辑 ====================
describe('C. 选路纯逻辑（RingtoneManager.TYPE_ALARM 语义）', () => {
  it('C1 池命中与 URL 派生（默认基路径 + 注入基路径）', () => {
    expect(findAlarmRingtone('platinum').file).toBe('Platinum.ogg');
    expect(findAlarmRingtone('gentle')).toBeNull();
    expect(findAlarmRingtone('urgent')).toBeNull();
    expect(findAlarmRingtone('custom')).toBeNull();
    expect(alarmRingtoneUrl('helium')).toBe(ALARM_RINGTONE_BASE + 'Helium.ogg');
    expect(alarmRingtoneUrl('timer_expire', '/x/')).toBe('/x/timer_expire.ogg');
    expect(alarmRingtoneUrl('nope')).toBeNull();
  });
  it('C2 shouldUseAssetRingtone 三态矩阵：synth 恒 false；auto/asset 池内 true', () => {
    for (const id of ['oxygen', 'osmium', 'carbon', 'krypton', 'platinum', 'helium', 'timer_expire']) {
      expect(shouldUseAssetRingtone(id, 'auto')).toBe(true);
      expect(shouldUseAssetRingtone(id, 'asset')).toBe(true);
      expect(shouldUseAssetRingtone(id, 'synth')).toBe(false);
    }
    expect(shouldUseAssetRingtone('gentle', 'auto')).toBe(false);
    expect(shouldUseAssetRingtone('gentle', 'asset')).toBe(false);
    expect(shouldUseAssetRingtone('custom', 'auto')).toBe(false);
  });
  it('C3 计时器音源：AOSP 双播放器语义（auto/asset→timer_expire；synth→null 沿旧轨）', () => {
    expect(pickTimerRingtone('auto')).toBe('timer_expire');
    expect(pickTimerRingtone('asset')).toBe('timer_expire');
    expect(pickTimerRingtone('synth')).toBeNull();
  });
});

// ==================== D. 资产轨播放器 ====================
describe('D. createAlarmAssetPlayer（MediaPlayer 等价：verdict 协议 + 失败记账）', () => {
  it('D1 构造校验：createAudio 缺失 RangeError', () => {
    expect(() => createAlarmAssetPlayer({})).toThrow(RangeError);
    expect(() => createAlarmAssetPlayer()).toThrow(RangeError);
  });
  it('D2 首播：playing verdict + src/volume/loop 落位 + 钳制', () => {
    FakeAudio.created.length = 0;
    const p = createAlarmAssetPlayer({ createAudio: (u) => new FakeAudio(u) });
    expect(p.play('/a.ogg', { volume: 1.7, loop: true })).toBe('playing');
    const el = FakeAudio.created[0];
    expect(el.src).toBe('/a.ogg');
    expect(el.volume).toBe(1);           // 钳制 ≤1
    expect(el.loop).toBe(true);
    expect(el.paused).toBe(false);
  });
  it('D3 同源续播：不重建 el，仅同步音量（离散渐强采样语义）', () => {
    FakeAudio.created.length = 0;
    const p = createAlarmAssetPlayer({ createAudio: (u) => new FakeAudio(u) });
    p.play('/a.ogg', { volume: 0.1 });
    expect(p.play('/a.ogg', { volume: 0.5 })).toBe('playing');
    expect(FakeAudio.created.length).toBe(1);
    expect(FakeAudio.created[0].volume).toBe(0.5);
  });
  it('D4 error 事件：fallback 恰一次 + 记账 + 后续同 url verdict=failed 不重试', () => {
    FakeAudio.created.length = 0;
    const fallbacks = [];
    const p = createAlarmAssetPlayer({ createAudio: (u) => new FakeAudio(u, { failLoad: true }), onFallback: (u) => fallbacks.push(u) });
    expect(p.play('/bad.ogg', {})).toBe('playing'); // 同步异步分界：play 返回时错误尚未派发
    return Promise.resolve().then(() => {
      FakeAudio.created[0]._fire('error');
      expect(fallbacks).toEqual(['/bad.ogg']);
      expect(p.failedUrlsList()).toEqual(['/bad.ogg']);
      expect(p.play('/bad.ogg', {})).toBe('failed');
      expect(fallbacks.length).toBe(1);
    });
  });
  it('D5 play() rejection：fallback 一次 + 记账', () => {
    FakeAudio.created.length = 0;
    const fallbacks = [];
    const p = createAlarmAssetPlayer({ createAudio: (u) => new FakeAudio(u, { rejectPlay: true }), onFallback: (u) => fallbacks.push(u) });
    p.play('/x.ogg', {});
    return Promise.resolve().then(() => {
      expect(fallbacks).toEqual(['/x.ogg']);
      expect(p.play('/x.ogg', {})).toBe('failed');
    });
  });
  it('D6 createAudio 抛错：failed + 记账（防御）', () => {
    const fallbacks = [];
    const p = createAlarmAssetPlayer({ createAudio: () => { throw new Error('boom'); }, onFallback: (u) => fallbacks.push(u) });
    expect(p.play('/y.ogg', {})).toBe('failed');
    expect(fallbacks).toEqual(['/y.ogg']);
  });
  it('D7 stop：pause + src 清空 + el 释放；换 url 重建新 el', () => {
    FakeAudio.created.length = 0;
    const p = createAlarmAssetPlayer({ createAudio: (u) => new FakeAudio(u) });
    p.play('/a.ogg', {});
    const first = FakeAudio.created[0];
    p.stop();
    expect(first.paused).toBe(true);
    expect(first.src).toBe('');
    expect(p.isPlaying()).toBe(false);
    p.play('/b.ogg', {});
    expect(FakeAudio.created.length).toBe(2);
  });
  it('D8 setVolume 钳制与 NaN 防御', () => {
    FakeAudio.created.length = 0;
    const p = createAlarmAssetPlayer({ createAudio: (u) => new FakeAudio(u) });
    p.play('/a.ogg', { volume: 0.2 });
    p.setVolume(5); expect(FakeAudio.created[0].volume).toBe(1);
    p.setVolume(-1); expect(FakeAudio.created[0].volume).toBe(0);
    p.setVolume(NaN); expect(FakeAudio.created[0].volume).toBe(0);
  });
});

// ==================== E. 接线源码锚 ====================
describe('E. 接线源码锚（六文件全景）', () => {
  const alarm = R('ios-desktop/apps/clock-app/alarm.mjs');
  const timer = R('ios-desktop/apps/clock-app/timer.mjs');
  const app = R('ios-desktop/apps/clock-app/app.mjs');
  const html = R('ios-desktop/apps/clock-app/index.html');
  const settings = R('ios-desktop/js/apps/settings.js');
  const sh = R('ios-desktop/js/sound-haptics.js');

  it('E1 alarm.mjs：模块导入 + 资产轨优先分支（vol 计算后 / custom 分支前）+ 模式分叉', () => {
    expect(alarm).toContain("from '../../js/aosp/alarm-ringtone.js'");
    expect(alarm).toMatch(/findAlarmRingtone\(t\)&&resMode!=='synth'\)\{\s*if\(alarmAssetPlayer\.play\(alarmRingtoneUrl\(t\),\{volume:vol,loop\}\)==='playing'\)return;\s*if\(resMode==='asset'\)return;/);
    expect(alarm.indexOf("resMode!=='synth'")).toBeGreaterThan(alarm.indexOf('__clockCrescendoProbeCapture'));
    expect(alarm.indexOf("resMode!=='synth'")).toBeLessThan(alarm.indexOf("t==='custom'&&customAudio"));
  });
  it('E2 alarm.mjs：会话循环透传 ringtone + dR 资产轨同停 + 试听单发 loop=false + 观测面', () => {
    expect(alarm).toMatch(/playRing\(rt\|\|A\.globalRingtone\);ringInt=setInterval\(\(\)=>\{if\(ringLoop\)playRing\(rt\|\|A\.globalRingtone\)\},2200\)/);
    expect(alarm).toMatch(/const dR=\(\)=>\{.*alarmAssetPlayer\.stop\(\);.*customAudio\)customAudio\.pause\(\);/);
    expect(alarm).toContain('playRing(A.globalRingtone,false);');
    expect(alarm).toContain('window.__alarmRingtoneProbe');
    expect(alarm).toContain('window.__clockTimerRingtonePick');
  });
  it('E3 timer.mjs：timer_expire 单源接线（AOSP TimerStream 独立音源）', () => {
    expect(timer).toContain("from '../../js/aosp/alarm-ringtone.js'");
    expect(timer).toMatch(/sR\('计时器到期', fTD\(t\.totalSeconds\)\+' 定时完成', \{ ringtone: pickTimerRingtone\(readAudioResourceMode\(armStore\)\) \}\)/);
  });
  it('E4 index.html：6 枚 AOSP 选项 + 合成兜底标注 + custom 保留', () => {
    for (const v of ['oxygen', 'osmium', 'carbon', 'krypton', 'platinum', 'helium']) {
      expect(html).toContain(`<option value="${v}">`);
    }
    expect(html).toMatch(/<option value="gentle">[^<]*合成兜底\)<\/option>/);
    expect(html).toContain('id="customRingtoneOption"');
  });
  it('E5 app.mjs：默认铃声 platinum（用户「确保连接真实铃声」）+ globalRingtoneSelect 启动回填', () => {
    expect(app).toMatch(/globalRingtone:'platinum'/);
    expect(app).toMatch(/\{ const gr=\$\('globalRingtoneSelect'\); if\(gr\) gr\.value=A\.globalRingtone; \}/);
  });
  it('E6 settings.js：统一回退开关 UI 三态 + localStorage 落盘（共用键字面）', () => {
    expect(settings).toContain('id="audioResourceModeSelect"');
    expect(settings).toContain('<option value="asset">强制真实采样</option>');
    expect(settings).toContain('<option value="synth">强制合成音</option>');
    expect(settings).toMatch(/localStorage\.setItem\(armKey, armSel\.value\)/);
    expect(settings).toContain("'ios-desktop:audio-resource-mode'");
  });
  it('E7 sound-haptics.js：统一开关接入（synth 免资源直落合成 / asset 缺失静默不虚假回落）', () => {
    expect(sh).toContain("import { readAudioResourceMode } from './aosp/alarm-ringtone.js'");
    expect(sh).toMatch(/const buffer = \(asset && resMode !== 'synth'\) \? peekBuffer\(name\) : null;/);
    expect(sh).toMatch(/if \(resMode === 'asset'\) return; \/\/ v9\.94 强制真实资源：缺失\/未就绪→静默/);
  });
});

// ==================== F. 回归锚 ====================
describe('F. 回归锚', () => {
  it('F1 v849 playRing 头部形态保持（k 标量链 + custom 通道）', () => {
    const s = R('ios-desktop/apps/clock-app/alarm.mjs');
    expect(s).toMatch(/const playRing=\(t=A\.globalRingtone,loop=true\)=>\{\s*\/\*[\s\S]*?const k=ringGainFromVolumes\(A\.masterVolume,getAlarmVolumePct\(\)\);/);
    expect(s).toContain('customAudio.volume=vol;');
  });
  it('F2 v158 C1 标量链三分支保持（in-call / crescendo / 常态）', () => {
    const s = R('ios-desktop/apps/clock-app/alarm.mjs');
    expect(s).toMatch(/if\(inCall\)\{vol=k\*window\.__clockCore\.IN_CALL_VOLUME;\}/);
    expect(s).toMatch(/else if\(ringCrescendoStopTime>0\)\{vol=k\*window\.__clockCore\.computeVolume\(Date\.now\(\),ringCrescendoStopTime,ringCrescendoDuration\);\}/);
  });
  it('F3 vite assets 整目录复制链路覆盖新目录 alarms/（copy-static-and-precache 扫描 ios-desktop/assets）', () => {
    const vite = R('vite.config.js');
    expect(vite).toMatch(/ios-desktop\/assets/);
  });
});
