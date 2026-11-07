// ==================== v175-camera-vfs.test.js — #175 P0 数据孤岛修复 v9.14 ====================
//
// #175 判据：相机拍的照片永远进不了相册——camera 只落 localStorage（pixel_camera_gallery，
// 仅留 10 张）↔ photos 读 VFS /photos；bus 补投仅覆盖桌面会话内排队（不落盘，刷新即丢）。
// 修复：camera.saveToGallery 照片直写 VFS /photos/（相册单一真源），命名与 bus payload
// 同源（IMG_<item.id>.jpg，photoVfsName 单一真源 + 非法字符防御），双写同名覆盖幂等不冗余。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CAM = readFileSync(join(ROOT, 'ios-desktop/apps/camera/index.html'), 'utf-8');
const PHOTOS = readFileSync(join(ROOT, 'ios-desktop/apps/photos/index.html'), 'utf-8');

describe('v9.14 #175 camera → VFS /photos 数据闭环', () => {
  it('拍照直写 VFS：saveToGallery 内 fs.write("/photos/"+name) 在册且失败静默', () => {
    expect(CAM).toContain("window.__system.fs.write('/photos/' + photoVfsName(item), item.dataUrl)");
    expect(CAM).toContain('.catch(() => null)'); // 不阻塞快门链路（与 photos fsWrite 同语义）
    expect(CAM.indexOf('photoVfsName')).toBeGreaterThanOrEqual(0); // 单一真源命名函数在册（函数声明提升，saveToGallery 内直用）
  });
  it('命名单一真源：bus payload 与 VFS 写入同用 photoVfsName（双写同名覆盖幂等）', () => {
    expect(CAM).toContain('name: photoVfsName(item)');
    expect(CAM).not.toContain("name: 'IMG_' + item.id + '.jpg'"); // 旧双源命名绝迹
    expect(CAM).toContain("return (item.name || ('IMG_' + item.id + '.jpg')).replace(/[\\\\/:*?\"<>|]/g, '_')");
  });
  it('孤岛根因不回潮：localStorage 快照保留（相机内缩略图用）但不再是唯一持久层', () => {
    expect(CAM).toContain("pixel_camera_gallery"); // 快照语义保留（仅 10 张，UI 缩略/会话内回看）
    expect(CAM).toContain('/photos/'); // VFS 真源在册
    // photos 侧消费端不变：bus 接收 + VFS 恢复 + 同名去重
    expect(PHOTOS).toContain("d.event !== 'photo/captured'");
    expect(PHOTOS).toContain("fsWrite('/photos/'");
    expect(PHOTOS).toContain("m.name === meta.name"); // 恢复去重
  });
  it('版本真源 9.17.0（v150 同口径）', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
    expect(pkg.version).toBe('10.49.0');
    const readme = readFileSync(join(ROOT, 'README.md'), 'utf-8');
    expect(readme).toContain('v10.49');
  });
});
