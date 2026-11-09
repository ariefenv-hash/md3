// ==================== v158-crescendo.test.js — #158 加分项：Klaxon 渐强 + 通话降音量（v10.97 · R58 窗） ====================
//
// 分层断言（v160 同款沙箱范式）：
//   A. 权威快照在库（docs/reference/deskclock/ 新增三件：AsyncRingtonePlayer.java / AlarmKlaxon.java /
//      SettingsDAO.java —— lineage-24.0 实拉；aosp-mirror 无 DeskClock 镜像诚实标注）+ 关键行逐字
//   B. 纯逻辑真跑：computeVolume dB 曲线（-40dB→0dB 对数）决定性观测 + isInTelephoneCall 五枚举 +
//      IN_CALL_VOLUME 常量
//   C. 应用接线静态锚（alarm.mjs 标量链 + app.mjs 设置项 + index.html crescendoSelect + clock-core 出口）
//   D. 版本真源
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

function loadClockCore() {
  const sandboxWindow = {};
  const fn = new Function('window', `${read('ios-desktop/js/clock-core.js')}\n;return window.__clockCore;`);
  return fn(sandboxWindow, undefined);
}
const CC = loadClockCore();

// clock-app 七文件拼接读取（#160 二期拆分后的锚通道）
const CLOCK_APP_ALL = ['index.html','app.mjs','alarm.mjs','world.mjs','timer.mjs','stopwatch.mjs','bedtime.mjs'];
const clockApp = () => CLOCK_APP_ALL.map((f) => read('ios-desktop/apps/clock-app/' + f)).join('\n');

// ==================== A. 权威快照在库 ====================
describe('v10.97 · A. AsyncRingtonePlayer/AlarmKlaxon/SettingsDAO 快照（lineage-24.0 实拉入库）', () => {
  it('A1 三件新快照在库且非空（行数锚）', () => {
    const arp = read('docs/reference/deskclock/AsyncRingtonePlayer.java');
    const klaxon = read('docs/reference/deskclock/AlarmKlaxon.java');
    const dao = read('docs/reference/deskclock/SettingsDAO.java');
    expect(arp.trimEnd().split('\n').length).toBe(413);
    expect(klaxon.trimEnd().split('\n').length).toBe(83);
    expect(dao.length).toBeGreaterThan(10000);
  });

  it('A2 IN_CALL_VOLUME = 0.125f 逐字（AsyncRingtonePlayer L46）', () => {
    const arp = read('docs/reference/deskclock/AsyncRingtonePlayer.java');
    expect(arp).toContain('private static final float IN_CALL_VOLUME = 0.125f;');
  });

  it('A3 isInTelephoneCall 五 audioMode 枚举逐字（L154-163）', () => {
    const arp = read('docs/reference/deskclock/AsyncRingtonePlayer.java');
    for (const m of ['MODE_IN_COMMUNICATION', 'MODE_COMMUNICATION_REDIRECT', 'MODE_CALL_REDIRECT', 'MODE_CALL_SCREENING', 'MODE_IN_CALL']) {
      expect(arp).toContain(`audioMode == AudioManager.${m}`);
    }
  });

  it('A4 computeVolume dB 曲线逐字（L194-208：gain=(fraction*40)-40 + pow(10,gain/20)）', () => {
    const arp = read('docs/reference/deskclock/AsyncRingtonePlayer.java');
    expect(arp).toContain('final float gain = (fractionComplete * 40) - 40;');
    expect(arp).toContain('Math.pow(10f, gain/20f)');
    expect(arp).toContain('linear increase in volume (in decibels)');
  });

  it('A5 startPlayback 分支逐字（in-call 降音量 / crescendo 起零落 stopTime）', () => {
    const arp = read('docs/reference/deskclock/AsyncRingtonePlayer.java');
    expect(arp).toContain('setRingtoneVolume(IN_CALL_VOLUME);');
    expect(arp).toContain('mCrescendoStopTime = Utils.now() + mCrescendoDuration;');
    expect(arp).toContain('setRingtoneVolume(0);');
  });

  it('A6 AlarmKlaxon.start 传入链逐字（crescendoDuration 由 DataModel 读出传 play）', () => {
    const klaxon = read('docs/reference/deskclock/AlarmKlaxon.java');
    expect(klaxon).toContain('DataModel.getDataModel().getAlarmCrescendoDuration()');
    expect(klaxon).toContain('play(instance.mRingtone, crescendoDuration)');
    expect(klaxon).toContain('VIBRATE_PATTERN = {500, 500}');
  });

  it('A7 SettingsDAO 默认 "0"=关闭逐字（KEY_ALARM_CRESCENDO）', () => {
    const dao = read('docs/reference/deskclock/SettingsDAO.java');
    expect(dao).toContain('prefs.getString(SettingsActivity.KEY_ALARM_CRESCENDO, "0")');
  });
});

// ==================== B. 纯逻辑真跑 ====================
describe('v10.97 · B. computeVolume dB 曲线 + isInTelephoneCall 真跑', () => {
  it('B1 IN_CALL_VOLUME 常量逐字 0.125', () => {
    expect(CC.IN_CALL_VOLUME).toBe(0.125);
  });

  it('B2 computeVolume 权威 dB 曲线决定性观测（起点 0.01 / 半程 0.1 / 完成 1.0——对数而非线性）', () => {
    const now = 1000, stop = 11000, dur = 10000;
    // 起点（fraction 0）：gain=-40dB → 10^(-2) = 0.01
    expect(CC.computeVolume(now, stop, dur)).toBeCloseTo(0.01, 8);
    // 半程（fraction 0.5）：gain=-20dB → 10^(-1) = 0.1（线性曲线会得 0.5——权威为对数）
    expect(CC.computeVolume(now + 5000, stop, dur)).toBeCloseTo(0.1, 8);
    // 完成（fraction 1）：gain=0dB → 1.0
    expect(CC.computeVolume(stop, stop, dur)).toBeCloseTo(1.0, 8);
    // 75% 处：gain=-10dB → 10^(-0.5) ≈ 0.3162
    expect(CC.computeVolume(now + 7500, stop, dur)).toBeCloseTo(Math.pow(10, -0.5), 6);
  });

  it('B3 isInTelephoneCall 五枚举真判定 + 未知/空回落 false', () => {
    for (const m of ['MODE_IN_COMMUNICATION', 'MODE_COMMUNICATION_REDIRECT', 'MODE_CALL_REDIRECT', 'MODE_CALL_SCREENING', 'MODE_IN_CALL']) {
      expect(CC.isInTelephoneCall(m)).toBe(true);
    }
    expect(CC.isInTelephoneCall('MODE_NORMAL')).toBe(false);
    expect(CC.isInTelephoneCall('')).toBe(false);
    expect(CC.isInTelephoneCall(undefined)).toBe(false);
  });

  it('B4 五枚举清单在册（IN_CALL_MODES 出口）', () => {
    expect(CC.IN_CALL_MODES).toEqual(['MODE_IN_COMMUNICATION', 'MODE_COMMUNICATION_REDIRECT', 'MODE_CALL_REDIRECT', 'MODE_CALL_SCREENING', 'MODE_IN_CALL']);
  });
});

// ==================== C. 应用接线静态锚 ====================
describe('v10.97 · C. alarm.mjs 标量链 + 设置面板接线', () => {
  it('C1 playRing 标量链三分支（in-call IN_CALL_VOLUME / crescendo computeVolume / 常态 k）', () => {
    const alarm = read('ios-desktop/apps/clock-app/alarm.mjs');
    expect(alarm).toContain('window.__clockCore.isInTelephoneCall(window.__clockPhoneMode||\'\')');
    expect(alarm).toContain('vol=k*window.__clockCore.IN_CALL_VOLUME;');
    expect(alarm).toContain('vol=k*window.__clockCore.computeVolume(Date.now(),ringCrescendoStopTime,ringCrescendoDuration);');
  });

  it('C2 sR 渐强会话启动（A.crescendoSeconds>0 落 stopTime）+ dR 双清零（stop() 语义）', () => {
    const alarm = read('ios-desktop/apps/clock-app/alarm.mjs');
    expect(alarm).toContain('ringCrescendoDuration=cs*1000;ringCrescendoStopTime=Date.now()+ringCrescendoDuration;');
    expect(alarm).toContain('ringLoop=0;ringCrescendoStopTime=0;ringCrescendoDuration=0;');
  });

  it('C3 调试面无头观测钩子（__clockCrescendoProbe + capture + __clockPhoneMode 注入口）', () => {
    const alarm = read('ios-desktop/apps/clock-app/alarm.mjs');
    expect(alarm).toContain('window.__clockCrescendoProbe');
    expect(alarm).toContain('window.__clockCrescendoProbeCapture');
    expect(alarm).toContain('window.__clockPhoneMode');
  });

  it('C4 clock-core 出口四件（IN_CALL_VOLUME/IN_CALL_MODES/isInTelephoneCall/computeVolume）', () => {
    const core = read('ios-desktop/js/clock-core.js');
    for (const k of ['IN_CALL_VOLUME: IN_CALL_VOLUME', 'IN_CALL_MODES: IN_CALL_MODES', 'isInTelephoneCall: isInTelephoneCall', 'computeVolume: computeVolume']) {
      expect(core).toContain(k);
    }
  });

  it('C5 设置面板 crescendoSelect 四选项 + change 落 A.crescendoSeconds + 启动回填', () => {
    const page = read('ios-desktop/apps/clock-app/index.html');
    expect(page).toContain('id="crescendoSelect"');
    expect(page).toContain('<option value="0">关闭（AOSP 默认）</option>');
    for (const v of ['"10"', '"30"', '"60"']) expect(page).toContain(`<option value=${v}`);
    const app = read('ios-desktop/apps/clock-app/app.mjs');
    expect(app).toContain("else if(t.id==='crescendoSelect'){A.crescendoSeconds=Number(t.value)||0;save();}");
    expect(app).toContain("cs.value=String(Number(A.crescendoSeconds)||0)");
    expect(app).toContain('crescendoSeconds:0');
  });
});

// ==================== D. 版本真源 ====================
describe('v10.97 · D. 版本真源', () => {
  it('D1 package.json 10.97.0', () => {
    expect(JSON.parse(read('package.json')).version).toBe('10.97.0');
  });
  it('D2 README 当前版本 v10.97', () => {
    expect(read('README.md')).toContain('**当前版本 v10.97**');
  });
});
