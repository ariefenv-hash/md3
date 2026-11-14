// #274 二期：4 处外部可达 innerHTML 插值补转义的回归锚（常青命名，#291 §1）
// 防「query 回显 / 文件夹名 / 溢出菜单属性 / 钉选城市」再次退化为裸插值。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd(), 'ios-desktop/js');
const read = (f) => readFileSync(join(ROOT, f), 'utf8');

describe('#274 innerHTML 插值转义回归', () => {
  it('search-service：Web 搜索后备 query 回显走 __mdEscape', () => {
    const s = read('search-service.js');
    expect(s).toContain('${window.__mdEscape(r.title)}');
    expect(s).toContain('${window.__mdEscape(r.sub)}');
    expect(s).not.toContain('<div class="search-item-title">${r.title}</div>');
  });

  it('folder：用户重命名后的文件夹名走 __mdEscape', () => {
    const s = read('folder.js');
    expect(s).toContain('${window.__mdEscape(folder.name)}');
    expect(s).not.toContain('<span>${folder.name}</span>');
  });

  it('taskbar：溢出菜单 data-id 与显示名走 safeId/safeName', () => {
    const s = read('taskbar.js');
    expect(s).toContain('const safeId = window.__mdEscape(id), safeName = window.__mdEscape(name);');
    expect(s).toContain('data-id="${safeId}"');
    expect(s).toContain('taskbar-overflow-name">${safeName}');
    expect(s).not.toContain('data-id="${id}" role="menuitem"');
  });

  it('at-a-glance：钉选城市 id/name 三处均走 __mdEscape', () => {
    const s = read('at-a-glance.js');
    expect(s).toContain('data-city-id="${window.__mdEscape(c.id)}"');
    expect(s).toContain('${window.__mdEscape(c.name)} · --:--');
    expect(s).toContain('data-unpin-id="${window.__mdEscape(c.id)}"');
    // 只针对 innerHTML 模板片段；:81 的 querySelector 选择器字符串 `data-city-id="${c.id}"`
    // 不是 HTML 插值（且 :82 用 textContent 更新时间文本），不在此负向锚管辖面。
    expect(s).not.toContain('class="glance-chip glance-city-chip" data-city-id="${c.id}"');
  });

  it('生成器分档守恒：B 档含本批 4 处（生成件头注可机读）', () => {
    const inv = readFileSync(join(process.cwd(), 'docs/innerhtml-inventory.md'), 'utf8');
    expect(inv).toMatch(/总数 271 = A 136 \+ B 11 \+ C 124/);
  });
});
