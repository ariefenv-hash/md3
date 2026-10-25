// ==================== v808-wallpaper-subpage.test.js — #23 差距矩阵⑥ 标注轮 ====================
//
// 考证链（aosp-mirror/platform_packages_apps_settings main 实源实拉）：
//   · res/xml/wallpaper_settings.xml：空壳 PreferenceScreen（key=wallpaper_type，
//     title=@string/wallpaper_settings_fragment_title，settings:controller=
//     WallpaperTypePreferenceController，零子项）
//   · WallpaperTypeSettings.java：DashboardFragment，getPreferenceScreenResId=
//     R.xml.wallpaper_settings，getMetricsCategory=SettingsEnums.WALLPAPER_TYPE
//   · WallpaperTypePreferenceController.java：AVAILABLE；onStart → populateWallpaperTypes()
//     以 Intent.ACTION_SET_WALLPAPER + MATCH_DEFAULT_ONLY 动态填充活动行
//     （key=packageName / title=活动 label / icon=活动图标 / intent=组件跳出）；
//     removeUselessExistingPreference 剔除解析落空行
//   · zh-rCN 权威值：wallpaper_settings_fragment_title=「选择壁纸来源」、
//     wallpaper_settings_title=「壁纸」、wallpaper_dashboard_summary=「主屏幕、锁定屏幕」
// Web 侧：ACTION_SET_WALLPAPER 解析命中唯一内建选择器 → 来源行 + 行内滚动直达
// （AOSP 点击跳出 Picker 应用，Web 内嵌 = 铁律#2 合法超越）；既有选择器功能零丢失。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const settings = readFileSync(join(root, 'ios-desktop/js/apps/settings.js'), 'utf8');
const twoPane = readFileSync(join(root, 'ios-desktop/js/apps/settings-two-pane.js'), 'utf8');
const engine = readFileSync(join(root, 'ios-desktop/js/theme-engine.js'), 'utf8');

describe('v8.08 #23 矩阵⑥ wallpaper 标注轮（AOSP 空壳 + 动态来源行）', () => {
  it('子页标题 = wallpaper_settings_fragment_title 权威值「选择壁纸来源」（旧值退役）', () => {
    expect(settings).toContain("title: '选择壁纸来源'");
    expect(settings).not.toContain("title: '壁纸与动态壁纸'");
  });

  it('权威考证注记锚定在标题改动处（DashboardFragment + wallpaper_settings）', () => {
    expect(settings).toMatch(/v8\.08 #23 差距矩阵⑥ 权威标题：WallpaperTypeSettings \(DashboardFragment\)/);
    expect(settings).toContain('getPreferenceScreenResId=R.xml.wallpaper_settings');
  });

  it('一级菜单行保持 v7.98 权威形态（壁纸 / 主屏幕、锁定屏幕 / idx 13）', () => {
    expect(twoPane).toContain("{ key: 'wallpaper', icon: 'topWallpaper', label: '壁纸', sub: '主屏幕、锁定屏幕', idx: 13 }");
  });

  it('来源区结构三锚（section / row / note data-test）', () => {
    expect(engine).toContain('data-test="wallpaper-source-section"');
    expect(engine).toContain('data-test="wallpaper-source-row"');
    expect(engine).toContain('data-test="wallpaper-note"');
  });

  it('来源行文案 = 解析语义权威值（壁纸和样式 + 主屏幕、锁定屏幕）', () => {
    expect(engine).toContain('壁纸和样式');
    expect(engine).toContain('主屏幕、锁定屏幕');
    expect(engine).toContain('壁纸来源');
  });

  it('注记 = controller 动态填充实证（空壳 XML / ACTION_SET_WALLPAPER / populateWallpaperTypes / MATCH_DEFAULT_ONLY）', () => {
    expect(engine).toContain('wallpaper_settings.xml 零子项');
    expect(engine).toContain('ACTION_SET_WALLPAPER');
    expect(engine).toContain('populateWallpaperTypes');
    expect(engine).toContain('MATCH_DEFAULT_ONLY');
    expect(engine).toContain('合法超越');
  });

  it('来源行 chevron = icons-aosp 单源（AOSP_ICONS.appsChevron 复用，v8.05 先例）', () => {
    expect(engine).toContain("import { AOSP_ICONS } from './icons-aosp.js';");
    expect(engine).toContain('${AOSP_ICONS.appsChevron || \'\'}');
  });

  it('行点击 → 滚动直达选择器 + 键盘 Enter/Space 同义（AOSP 跳出的 Web 内嵌映射）', () => {
    expect(engine).toContain("container.querySelector('#setWallpaperSourceRow')");
    expect(engine).toContain("container.querySelector('#setDynamicGrid')");
    expect(engine).toContain('scrollIntoView({ behavior: \'smooth\', block: \'start\' })');
    expect(engine).toMatch(/e\.key === 'Enter' \|\| e\.key === ' '/);
  });

  it('既有选择器功能零丢失（六锚全在）', () => {
    for (const anchor of ['setNavWallpaperRow', 'setThemeModeRow', 'setWallpaperBlurSwitch',
      'setDynamicGrid', 'setWallpapersGrid', 'setUploadBtn']) {
      expect(engine).toContain(anchor);
    }
  });

  it('选择器行为锚保留（procedural 应用 / localStorage 真源 / wallpaper-changed 页外同步）', () => {
    expect(engine).toContain('applyProceduralWallpaper');
    expect(engine).toContain("'ios-desktop:wallpaper'");
    expect(engine).toContain("window.addEventListener('wallpaper-changed', syncFromEvent)");
  });

  it('懒激活保留（pageIdx 13 首推才初始化，v7.37 性能修复不回退）', () => {
    expect(settings).toMatch(/app-page-active[\s\S]{0,200}pageIdx === 13[\s\S]{0,60}init\(\)/);
  });

  it('AOSP 语义对齐：来源区置于容器顶部（当前壁纸行之前）', () => {
    const srcIdx = engine.indexOf('data-test="wallpaper-source-section"');
    const navIdx = engine.indexOf("id=\"setNavWallpaperRow\"");
    expect(srcIdx).toBeGreaterThan(-1);
    expect(navIdx).toBeGreaterThan(-1);
    expect(srcIdx).toBeLessThan(navIdx);
  });
});
