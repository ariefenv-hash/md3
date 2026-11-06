// ==================== v92-media-output.test.js — #92 媒体输出切换器 v10.27 ====================
//
// 覆盖（R90 窗加餐，MediaOutputDialog 网页等价）：
//   · aosp/media-output.js 纯逻辑：buildMediaItems（naturalOrder 输入 + connected 头插
//     L686-695/L769-811 同构 + 组分隔产出 + pair-new 尾插 L812-822）、deviceIconKey 映射、
//     currentOutputRow 缺省链、resolveRoute 三分支（幂等/sink/降级）、SPATIAL_AUDIO 常量
//   · volume-dialog 接线锚（剥注释扫描）：顶部输出行 + 输出对话框 + #114 公约接入 +
//     v108 触摸面并集重锚（六控件）+ CSS opt-in 同步
//   · AOSP 行号锚（防回退）
//   · happy-dom 真跑：index.html 输出行节点在场 + initVolumeDialog 后渲染输出行 +
//     对话框 DOM 装配 + 设备选择降级链（偏好落库 + 事件广播 + 关闭）
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MEDIA_ITEM_TYPE,
  GROUP_TITLES,
  SPATIAL_AUDIO,
  buildMediaItems,
  currentOutputRow,
  deviceIconKey,
  resolveRoute,
} from '../ios-desktop/js/aosp/media-output.js';
import { TOUCHABLE_SELECTORS } from '../ios-desktop/js/aosp/volume-touch-insets.js';
import { mediaService } from '../ios-desktop/js/media-service.js';

const R = (p) => join(dirname(fileURLToPath(import.meta.url)), '..', p);
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const VD = stripComments(readFileSync(R('ios-desktop/js/volume-dialog.js'), 'utf8'));
const MO_SRC = readFileSync(R('ios-desktop/js/aosp/media-output.js'), 'utf8');
const CSS = readFileSync(R('ios-desktop/css/pull-panels.css'), 'utf8');
const HTML = readFileSync(R('ios-desktop/index.html'), 'utf8');

const DEVICES = [
  { id: 'builtin-speaker', name: '内置扬声器', kind: 'speaker' },
  { id: 'sim-bt-1', name: '蓝牙耳机（模拟）', kind: 'bluetooth', simulated: true },
];

describe('v92-A · buildMediaItems 设备列表模型（MediaSwitchingController 同构）', () => {
  it('A1 connected 头插 index 0（L769-781 selectedDevicesIds 头插同构）', () => {
    const items = buildMediaItems({ devices: DEVICES, connectedId: 'sim-bt-1' });
    expect(items[0].type).toBe(MEDIA_ITEM_TYPE.DEVICE);
    expect(items[0].device.id).toBe('sim-bt-1');
  });

  it('A2 组分隔仅在实际分组存在时产出（md3 无 suggested 真源——诚实标注）', () => {
    const withRest = buildMediaItems({ devices: DEVICES, connectedId: 'builtin-speaker' });
    expect(withRest.some((i) => i.type === MEDIA_ITEM_TYPE.GROUP_DIVIDER)).toBe(true);
    expect(withRest.find((i) => i.type === MEDIA_ITEM_TYPE.GROUP_DIVIDER).title).toBe(GROUP_TITLES.speakersAndDisplays);
    // 单设备（无「其余设备」组）→ 无分隔
    const solo = buildMediaItems({ devices: [DEVICES[0]], connectedId: 'builtin-speaker' });
    expect(solo.some((i) => i.type === MEDIA_ITEM_TYPE.GROUP_DIVIDER)).toBe(false);
  });

  it('A3 pair-new 尾插（L812-822 attachConnectNewDeviceItemIfNeeded：非 remote 单选恒附加）', () => {
    const items = buildMediaItems({ devices: DEVICES, connectedId: 'builtin-speaker' });
    expect(items[items.length - 1].type).toBe(MEDIA_ITEM_TYPE.PAIR_NEW_DEVICE);
    // 可关（attachPairNew=false 对应 AOSP remote/组形态——md3 预留面）
    const off = buildMediaItems({ devices: DEVICES, connectedId: 'builtin-speaker', attachPairNew: false });
    expect(off.some((i) => i.type === MEDIA_ITEM_TYPE.PAIR_NEW_DEVICE)).toBe(false);
  });

  it('A4 三类字面量与组标题稳定（MediaItemType L722-733 契约）', () => {
    expect(MEDIA_ITEM_TYPE).toEqual({ DEVICE: 'device', GROUP_DIVIDER: 'group_divider', PAIR_NEW_DEVICE: 'pair_new_device' });
    expect(GROUP_TITLES).toEqual({ suggested: '建议设备', speakersAndDisplays: '扬声器和显示屏', pairNew: '连接新设备' });
  });
});

describe('v92-B · deviceIconKey / currentOutputRow / resolveRoute', () => {
  it('B1 设备类别图标映射（在库键；未知 kind 兜底 speaker 形态）', () => {
    expect(deviceIconKey('speaker')).toBe('volume_media');
    expect(deviceIconKey('bluetooth')).toBe('bluetooth_connected');
    expect(deviceIconKey('wired')).toBe('headphones');
    expect(deviceIconKey('cast')).toBe('cast');
    expect(deviceIconKey('phone')).toBe('smartphone');
    expect(deviceIconKey('unknown-kind')).toBe('volume_media');
  });

  it('B2 currentOutputRow 缺省链：connected → speaker 形态 → null', () => {
    expect(currentOutputRow({ devices: DEVICES, connectedId: 'sim-bt-1' }).name).toBe('蓝牙耳机（模拟）');
    expect(currentOutputRow({ devices: DEVICES, connectedId: null }).id).toBe('builtin-speaker');
    expect(currentOutputRow({ devices: [], connectedId: null })).toBe(null);
  });

  it('B3 resolveRoute 三分支：幂等零操作 / 能力缺失降级 / 未知设备拒绝', () => {
    expect(resolveRoute({ deviceId: 'builtin-speaker', sinkCapable: false, activeId: 'builtin-speaker' }))
      .toEqual({ changed: false, routed: false, degraded: false, reason: 'already_active' });
    expect(resolveRoute({ deviceId: 'sim-bt-1', sinkCapable: false, activeId: 'builtin-speaker' }).degraded).toBe(true);
    expect(resolveRoute({ deviceId: 'sim-bt-1', sinkCapable: false, activeId: 'builtin-speaker' }).reason).toBe('sink_unavailable');
    expect(resolveRoute({ deviceId: 'sim-bt-1', sinkCapable: true, activeId: 'builtin-speaker' }).routed).toBe(true);
    expect(resolveRoute({ deviceId: null, sinkCapable: true, activeId: 'x' }).reason).toBe('no_device');
  });

  it('B4 SPATIAL_AUDIO 等价壳常量（铁律 #2 边界标注在录）', () => {
    expect(SPATIAL_AUDIO.id).toBe('spatial-audio');
    expect(SPATIAL_AUDIO.defaultEnabled).toBe(false);
    expect(SPATIAL_AUDIO.note).toContain('网页等价');
  });
});

describe('v92-C · 接线锚 E 组（volume-dialog + CSS + 触摸面并集重锚）', () => {
  it('C1 顶部输出行：index.html 节点 + 渲染/点击/展开接线', () => {
    expect(HTML).toContain('id="vdOutputRow"');
    expect(VD).toContain("document.getElementById('vdOutputRow')");
    expect(VD).toContain('currentOutputRow({ devices: moDevices, connectedId: moActiveId })');
    expect(VD).toContain('openMediaOutput()');
  });

  it('C2 输出对话框：buildMediaItems 消费 + 三类渲染 + 路由选择降级链 + 偏好落库', () => {
    expect(VD).toContain('buildMediaItems({ devices: moDevices, connectedId: moActiveId })');
    expect(VD).toContain('media-output-changed');
    expect(VD).toContain("localStorage.setItem(MO_ACTIVE_KEY, moActiveId)");
    expect(VD).toContain("showSystemToast('网页环境不支持输出路由，已记忆偏好（等价标注）')");
  });

  it('C3 新浮层遵守 #114 公约（DISMISS 状态机 + 可触摸区声明 + Escape 补充通道）', () => {
    expect(VD).toContain("createOutsideDismissMachine({ mode: OutsideMode.DISMISS, onDismiss: () => closeMediaOutput() })");
    expect(VD).toContain('moOutside.feedPointerDown(isInsideTouchable(e.target, MO_TOUCHABLE.selector))');
    expect(VD).toContain("isInsideTouchable(e.target, MO_TOUCHABLE.selector)");
    expect(VD).toContain("e.key === 'Escape' && isMediaOutputOpen()");
  });

  it('C4 v108 触摸面并集重锚：六控件（输出行入集）+ CSS opt-in 同步', () => {
    expect(TOUCHABLE_SELECTORS[0]).toBe('.vd-output-row');
    expect(TOUCHABLE_SELECTORS).toHaveLength(6);
    expect(CSS).toContain('.volume-dialog.visible .vd-output-row,');
    expect(CSS).toContain('.vd-output-row {');
  });

  it('C5 面板收起联动（dismiss → closeMediaOutput 父子面同步）', () => {
    expect(VD).toMatch(/const dismiss = \(\) => \{[\s\S]*?closeMediaOutput\(\);[\s\S]*?dialogEl\.classList\.remove\('visible'\);/);
  });

  it('C6 AOSP 行号锚（防回退）', () => {
    expect(MO_SRC).toContain('L686-695');
    expect(MO_SRC).toContain('L769-811');
    expect(MO_SRC).toContain('L812-822');
    expect(MO_SRC).toContain('L1244-1251');
  });
});

describe('v92-D · happy-dom 真跑（接线初始化 + 选择降级链）', () => {
  let initVolumeDialog;
  let hooks;
  beforeAll(async () => {
    document.body.innerHTML = `
      <div class="volume-dialog" id="volumeDialog" aria-hidden="true">
        <div class="vd-bg"></div>
        <button class="vd-output-row" id="vdOutputRow" aria-label="媒体输出设备"></button>
        <div class="vd-ringer-drawer" id="vdRingerDrawer">
          <button class="vd-ringer-btn" data-mode="silent"></button>
          <button class="vd-ringer-btn" data-mode="vibrate"></button>
          <button class="vd-ringer-btn" data-mode="ring"></button>
        </div>
        <div class="vd-slider" id="vdSlider" role="slider"><div class="vd-fill"></div><div class="vd-icon" id="vdIcon"></div><div class="vd-thumb"></div></div>
        <button class="vd-settings" id="vdSettingsBtn"></button>
        <div class="vd-float-col" id="vdFloatSliders"></div>
        <div class="vd-safety" id="vdSafety" hidden></div>
      </div>`;
    ({ initVolumeDialog } = await import('../ios-desktop/js/volume-dialog.js'));
    initVolumeDialog();
    hooks = (await import('../ios-desktop/js/volume-dialog.js')).__testHooks();
  });

  beforeEach(() => { try { localStorage.clear(); } catch (e) {} });

  it('D1 顶部输出行渲染（内置扬声器缺省链 + chevron 角标 + aria 标注）', () => {
    const row = document.getElementById('vdOutputRow');
    expect(row.hidden).toBe(false);
    expect(row.querySelector('.vd-output-chev')).toBeTruthy();
    expect(row.getAttribute('aria-label')).toContain('内置扬声器');
  });

  it('D2 输出对话框 DOM 装配（#114 公约 machine + 空间音频行 + scrim）', () => {
    hooks.openMediaOutput();
    const dlg = document.querySelector('.media-output-dialog');
    expect(dlg).toBeTruthy();
    expect(dlg.classList.contains('open')).toBe(true);
    expect(dlg.querySelector('.mo-spatial')).toBeTruthy();
    expect(dlg.querySelector('.mo-scrim')).toBeTruthy();
    // 降级设备列表：内置 + 模拟蓝牙（happy-dom 无 enumerateDevices → 模拟设备入列）
    hooks.renderMoList();
    const names = [...dlg.querySelectorAll('.mo-item .mo-name')].map((n) => n.textContent);
    expect(names.join('|')).toContain('内置扬声器');
    hooks.closeMediaOutput();
    expect(dlg.classList.contains('open')).toBe(false);
  });

  it('D3 选择设备 → 降级链（偏好落库 + media-output-changed 广播 + 对话框关闭）', () => {
    let evt = null;
    document.addEventListener('media-output-changed', (e) => { evt = e.detail; }, { once: true });
    hooks.openMediaOutput();
    const dlg = document.querySelector('.media-output-dialog');
    hooks.renderMoList();
    const btBtn = dlg.querySelector('.mo-item[data-device="sim-bt-1"]')
      || dlg.querySelector('.mo-item[data-device]:not([data-device="builtin-speaker"])');
    if (btBtn) {
      btBtn.click();
      expect(hooks.moActiveId).toBe(btBtn.getAttribute('data-device'));
      expect(localStorage.getItem('media-output:active')).toBe(btBtn.getAttribute('data-device'));
      expect(evt && evt.degraded).toBe(true);
      expect(dlg.classList.contains('open')).toBe(false);
    } else {
      // enumerateDevices 在场的环境列表可能只有内置设备——幂等零操作兜底断言
      expect(hooks.moActiveId).toBe('builtin-speaker');
    }
  });

  it('D4 空间音频开关偏好持久化', () => {
    hooks.openMediaOutput();
    const sw = document.querySelector('.media-output-dialog .mo-spatial');
    sw.click();
    expect(hooks.spatialEnabled).toBe(true);
    expect(localStorage.getItem('media-output:spatial')).toBe('1');
    expect(sw.getAttribute('aria-checked')).toBe('true');
    sw.click();
    expect(hooks.spatialEnabled).toBe(false);
  });

  afterEach(() => { try { localStorage.clear(); } catch (e) {} });
});
