// ==================== v809-storage-subpage.test.js — #23 差距矩阵⑤ 存储子页回审计 ====================
//
// 考证链（aosp-mirror/platform_packages_apps_settings main 实源实拉）：
//   · storage_dashboard_fragment.xml：17 keys / order 1→204（spinner/summary/asm/free_up_space/
//     文件+图片+视频+音频+应用+游戏+文档+其他+回收站/系统分类(system+temporary_files)/其他用户）
//   · StorageDashboardFragment.java：getPreferenceScreenResId=R.xml.storage_dashboard_fragment，
//     createPreferenceControllers 注册 StorageItemPreferenceController+NonCurrentUserController
//   · 门控：StorageSelectionPreferenceController displayPreference setVisible(getCount()>1)；
//     AutomaticStorageManagementSwitchPreferenceController = !config_show_smart_storage_toggle
//     (config.xml=true)→UNSUPPORTED + !isLowRamDevice→AVAILABLE；ManageStoragePreferenceController
//     = mManageStorageDrawable 解析失败→CONDITIONALLY_UNAVAILABLE
//   · zh-rCN：存储空间/释放空间/前往谷歌文件极客应用管理和释放空间/文件/图片/视频/音频/应用/
//     游戏/文档/其他/回收站/系统/Android %s/临时系统文件/其他用户/存储空间管理器/已使用 %1$s - 还剩 %2$s
// Web 真实数据：summary=storage.collect()（estimate 实测）；分类=vfs.usage()/usageByType()
// （v8.09 新增 mime 前缀聚合）；游戏/回收站=忠实 0 值；扩展卡保留（铁律#2）。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const settings = readFileSync(join(root, 'ios-desktop/js/apps/settings.js'), 'utf8');
const icons = readFileSync(join(root, 'ios-desktop/js/icons-aosp.js'), 'utf8');
const vfs = readFileSync(join(root, 'ios-desktop/js/vfs.js'), 'utf8');

describe('v8.09 #23 矩阵⑤ 存储子页 1:1 转正（17 keys）', () => {
  it('AOSP 结构八锚（aosp/summary/spinner/asm/free-up/categories/system/other-users）', () => {
    for (const t of ['data-test="storage-aosp"', 'data-test="storage-summary"', 'data-test="storage-spinner-note"',
      'data-test="storage-asm"', 'data-test="storage-free-up"', 'data-test="storage-categories"',
      'data-test="storage-system-label"', 'data-test="storage-other-users-note"']) {
      expect(settings).toContain(t);
    }
  });

  it('zh-rCN 权威文案（分类 9 行 + 系统分类 + ASM 标题 + free_up_space）', () => {
    for (const s of ['>释放空间<', '>文件<', '>图片<', '>视频<', '>音频<', '>应用<', '>游戏<',
      '>文档<', '>其他<', '>回收站<', '>系统<', 'Android 17', '临时系统文件', '存储空间管理器']) {
      expect(settings).toContain(s);
    }
    expect(settings).toContain("前往文件应用管理和释放空间");
    expect(settings).toContain("'已使用 ' + fmt(usage) + ' - 还剩 '");
  });

  it('门控注记实证锚（单卷 setVisible / config_show_smart_storage_toggle / NonCurrentUser 空）', () => {
    expect(settings).toContain('mStorageAdapter.getCount()>1');
    expect(settings).toContain('config_show_smart_storage_toggle');
    expect(settings).toContain('NonCurrentUserController 返回空列表');
    expect(settings).toContain('StorageItemPreferenceController');
    expect(settings).toContain('ManageStoragePreferenceController');
  });

  it('11 枚 stg* 图标逐 path 入库（icons-aosp 单源）', () => {
    for (const k of ['stgFolder:', 'stgPhoto:', 'stgMovies:', 'stgAudio:', 'stgApps:', 'stgGames:',
      'stgCategory:', 'stgTrash:', 'stgAndroid:', 'stgDatabase:', 'stgStorage:']) {
      expect(icons).toContain(k);
    }
    for (const u of ['${AOSP_ICONS.stgStorage', '${AOSP_ICONS.stgFolder', '${AOSP_ICONS.stgPhoto',
      '${AOSP_ICONS.stgMovies', '${AOSP_ICONS.stgAudio', '${AOSP_ICONS.stgApps',
      '${AOSP_ICONS.stgGames', '${AOSP_ICONS.stgCategory', '${AOSP_ICONS.stgTrash',
      '${AOSP_ICONS.stgAndroid', '${AOSP_ICONS.stgDatabase']) {
      expect(settings).toContain(u);
    }
  });

  it('960 viewport 图标（stgCategory/stgAndroid/stgDatabase）与 24dp 渲染尺寸', () => {
    expect(icons).toMatch(/stgCategory: `<svg viewBox="0 0 960 960" width="24" height="24"/);
    expect(icons).toMatch(/stgAndroid: `<svg viewBox="0 0 960 960" width="24" height="24"/);
    expect(icons).toMatch(/stgDatabase: `<svg viewBox="0 0 960 960" width="24" height="24"/);
  });

  it('vfs.usageByType() 真实聚合导出（mime 前缀规则 + api 成员）', () => {
    expect(vfs).toContain('function usageByType()');
    expect(vfs).toContain("m.startsWith('image/')");
    expect(vfs).toContain("m.startsWith('video/')");
    expect(vfs).toContain("m.startsWith('audio/')");
    expect(vfs).toContain("m.startsWith('text/') || m.startsWith('application/')");
    expect(vfs).toContain('subscribe, usage, usageByType,');
  });

  it('分类行接真实数据源（vfs.usage/usageByType + byOwner 归属排除 files 不双计）', () => {
    expect(settings).toContain('window.__vfs.usage()');
    expect(settings).toContain('window.__vfs.usageByType()');
    expect(settings).toContain("o.owner !== '__other' && o.owner !== 'files'");
    expect(settings).toContain('usage - (vfsU.bytes || 0) - appBytes - sysBytes');
  });

  it('游戏/回收站忠实 0 值（无对应数据域不造假）', () => {
    expect(settings).toContain("fill('stgSizeGames', fmt(0))");
    expect(settings).toContain("fill('stgSizeTrash', fmt(0))");
  });

  it('free_up_space 点击 → OPEN_APP 深链打开文件应用（AOSP 跳文件极客的 Web 映射）', () => {
    expect(settings).toContain("{ type: 'OPEN_APP', appId: 'files' }");
    expect(settings).toMatch(/stgFreeUpBtn[\s\S]{0,400}OPEN_APP/);
    expect(settings).toMatch(/e\.key === 'Enter' \|\| e\.key === ' '/);
  });

  it('ASM 开关忠实禁用（Web 无 Storage Manager 备份后端）', () => {
    expect(settings).toMatch(/id="stgAsmSwitch" disabled/);
    expect(settings).toContain('Web 形态无备份后端，忠实呈现不可用');
  });

  it('懒激活与刷新按钮保留（pageIdx 7 + storageRefreshBtn）', () => {
    expect(settings).toMatch(/app-page-active[\s\S]{0,200}pageIdx === 7[\s\S]{0,60}render\(\)/);
    expect(settings).toContain("getElementById('storageRefreshBtn').addEventListener('click', render)");
  });

  it('Web 扩展卡保留（铁律#2：介质明细徽标 + byOwner + TopKeys + 双卡）', () => {
    expect(settings).toContain('Web 扩展 · 存储介质明细（合法超越）');
    expect(settings).toContain('按应用归属');
    expect(settings).toContain('占用最大的 localStorage 键（前 8）');
    expect(settings).toContain('IndexedDB（含壁纸/字体文件）');
    expect(settings).toContain('约 5MB 配额');
  });

  it('storage_summary 进度条模型（大百分比 + 已使用/还剩 + bar 回填）', () => {
    expect(settings).toContain("fill('stgSummaryPct', pct + '%')");
    expect(settings).toContain("barBox.innerHTML = bar(quota ? usage / quota * 100 : 0, 215)");
    expect(settings).toContain('Math.max(0, quota - usage)');
  });
});
