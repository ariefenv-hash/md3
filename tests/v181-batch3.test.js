// ==================== v181-batch3.test.js — #181 第三批整改（#179 六条准入 · 历史遗留渐进 4/13） v10.18 ====================
//
// 覆盖（#179 六条 × contacts / dice 两应用 + 构建期 lint 清单扩至 8 应用）：
//   · contacts：六条静态锚（令牌既有达标/@media/760px body grid 左列表右详情面板/VFS 备份+notify+openApp 保留/
//     列表密度怠速柄滑条/卡片纵向按压联动）+ 既有逻辑零破坏
//   · dice：六条静态锚（令牌/@media/760px 面板分栏 canvas 物理舞台零风险/VFS 历史/
//     物理参数滑条 mdslider 升级 + --p 同步/骰型 chip 整排联动）+ 既有逻辑零破坏
//   · 回归：contacts 卡片点击呼叫链/表单提交链零变化；dice init 序列/物理参数应用零变化

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf-8');

const CONTACTS = read('ios-desktop/apps/contacts/index.html');
const DICE = read('ios-desktop/apps/dice/index.html');
const VITE_CFG = read('vite.config.js');

const count = (src, re) => (src.match(re) || []).length;

describe('v10.18 #181 第三批 contacts：#179 六条准入整改', () => {
  it('准入①②：令牌既有达标 + @media 两断点', () => {
    expect(count(CONTACTS, /var\(--md-/g)).toBeGreaterThanOrEqual(10);
    expect(count(CONTACTS, /@media/g)).toBeGreaterThanOrEqual(2);
    expect(count(CONTACTS, /min-width:\s*760px/g)).toBeGreaterThanOrEqual(1);
    expect(count(CONTACTS, /max-width:\s*400px/g)).toBeGreaterThanOrEqual(1);
  });
  it('准入③：平板分栏 —— body grid 左列表右详情面板（手机态 display:none 零变化）', () => {
    expect(CONTACTS).toMatch(/body\s*{\s*display:\s*grid;\s*grid-template-columns:\s*1fr 340px/);
    expect(CONTACTS).toMatch(/#detailPane\s*{\s*display:\s*none/);
    expect(CONTACTS).toMatch(/id="detailPane"/);
    expect(CONTACTS).toMatch(/grid-row:\s*1\s*\/\s*-1/);
    expect(CONTACTS).toMatch(/function renderDetail\(/);
    expect(CONTACTS).toMatch(/isWide\(\)/);
  });
  it('准入④：SDK —— VFS 备份镜像 + notify 新增联系人 + openApp 深链保留', () => {
    expect(CONTACTS).toMatch(/contacts-backup\.json/);
    expect(CONTACTS).toMatch(/__system\.fs\.write/);
    expect(CONTACTS).toMatch(/__system\.notify/);
    expect(CONTACTS).toMatch(/S\.openApp\('phone'/);   // v7.19 既有接入保留（const S = window.__system 别名）
  });
  it('准入⑤：列表密度怠速柄滑条（mdslider --p 同步 + localStorage 持久化 + 密度乘算）', () => {
    expect(count(CONTACTS, /mdslider/g)).toBeGreaterThanOrEqual(2);
    expect(CONTACTS).toMatch(/id="densitySlider"/);
    expect(CONTACTS).toMatch(/contacts-density-v1/);
    expect(CONTACTS).toMatch(/--density-scale/);
    expect(CONTACTS).toMatch(/setProperty\('--p'/);
  });
  it('准入⑤：联系人卡片纵向按压联动（pressRipple Y 轴让位版 + 事件委托）', () => {
    expect(CONTACTS).toMatch(/function pressRippleCards\(/);
    expect(CONTACTS).toMatch(/function releaseRippleCards\(/);
    expect(CONTACTS).toMatch(/closest\('#list \.card'\)/);
    expect(CONTACTS).toMatch(/translateY/);          // 纵向列表 → Y 轴让位
  });
  it('回归：呼叫链/表单链/存储键零变化', () => {
    expect(CONTACTS).toMatch(/card\.addEventListener\('click', \(\) => \{/);
    expect(CONTACTS).toMatch(/linkAction\('call'\)/);
    expect(CONTACTS).toMatch(/\$form\.addEventListener\('submit'/);
    expect(CONTACTS).toMatch(/toast\(editId \? '已更新' : '已保存'\)/);
  });
});

describe('v10.18 #181 第三批 dice：#179 六条准入整改', () => {
  it('准入①②：令牌既有达标 + @media 两断点', () => {
    expect(count(DICE, /var\(--md-/g)).toBeGreaterThanOrEqual(10);
    expect(count(DICE, /@media/g)).toBeGreaterThanOrEqual(2);
    expect(count(DICE, /min-width:\s*760px/g)).toBeGreaterThanOrEqual(1);
    expect(count(DICE, /max-width:\s*400px/g)).toBeGreaterThanOrEqual(1);
  });
  it('准入③：面板分栏 —— 760px 设置/统计屏右侧常驻（canvas 3D 物理舞台全屏零风险）', () => {
    expect(DICE).toMatch(/\.modal-screen\s*{\s*place-items:\s*end center;\s*grid-template-columns:\s*380px 1fr/);
    expect(DICE).toMatch(/\.modal-screen \.vintage-panel\s*{\s*grid-column:\s*1/);
  });
  it('准入④：SDK —— 掷骰历史镜像 VFS + fsAvailable 守卫', () => {
    expect(DICE).toMatch(/dice-history\.json/);
    expect(DICE).toMatch(/__system\.fs\.write/);
    expect(DICE).toMatch(/window\.__system && window\.__system\.fs/);
  });
  it('准入⑤：物理参数滑条 mdslider 升级 + --p 同步（重力 20–100/弹性 0–0.8）', () => {
    expect(count(DICE, /mdslider/g)).toBeGreaterThanOrEqual(2);
    expect(DICE).toMatch(/custom-slider mdslider" id="param-gravity"/);
    expect(DICE).toMatch(/custom-slider mdslider" id="param-bounciness"/);
    expect(DICE).toMatch(/gEl\.style\.setProperty\('--p'/);
    expect(DICE).toMatch(/bEl\.style\.setProperty\('--p'/);
  });
  it('准入⑤：骰型 chip 整排按压联动（type-chip-row 事件委托，不碰设置屏同 class 按钮）', () => {
    expect(DICE).toMatch(/type-segmented type-chip-row/);
    expect(DICE).toMatch(/function pressRippleChips\(/);
    expect(DICE).toMatch(/closest\('\.type-chip-row \.type-btn'\)/);
  });
  it('回归：init 序列/物理应用/统计键零变化', () => {
    expect(DICE).toMatch(/setupArena\(\); updateFixedCamera\(\); initParticles\(\); initMotionDetection\(\); loadStats\(\); updateSettings\(\); updateHudBadge\(\); spawnDice\(\);/);
    expect(DICE).toMatch(/state\.world\.gravity\.set\(0, -config\.gravity, 0\); state\.contactMaterial\.restitution = config\.bounciness;/);
    expect(DICE).toMatch(/localStorage\.setItem\('dice_lab_stats'/);
  });
});

describe('v10.18 #181 准入 lint 清单（vite.config.js，v10.18 起包含语义扩容不破）', () => {
  it('ADMITTED_APPS 含首批 4 + 二批 2 + 三批 2', () => {
    expect(VITE_CFG).toMatch(/const ADMITTED_APPS = \['markdown', 'typing', 'drawcircle', 'gravity'(, '[a-z0-9-]+')*\];/);
    expect(VITE_CFG).toMatch(/'calculator', 'weather', 'contacts', 'dice'(, '[a-z0-9-]+')*\]/);   // v10.18 扩容包含语义
  });
});
