// ==================== {{APP_ID}}-scaffold.test.js — {{APP_TITLE}} 脚手架契约（new-app 生成 · 常青命名） ====================
//
// #291 §6 模板注记（R149 模板注入批落地）：新测试默认**常青命名** `<特性名>-<行为>.test.js`，
// 随特性演进原地改，永不"过期"；版本前缀 vNNN- **仅限**交付时点快照（基线锁/计数锁/横切存档），
// 且文件头第二行起必须含 @snapshot 注记（docs/test-naming-evergreen.md §1/§4/§6）。
// 断言面 = 脚手架结构契约（入口存在/占位符渲染/样式脚本接线）——应用演进时随特性原地维护。
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const appDir = join(here, '..', 'ios-desktop', 'apps', '{{APP_ID}}');
const html = existsSync(join(appDir, 'index.html')) ? readFileSync(join(appDir, 'index.html'), 'utf8') : '';

describe('{{APP_TITLE}} 脚手架契约', () => {
  it('A1 index.html 存在且模板占位符已渲染（无 {{ 残留）', () => {
    expect(existsSync(join(appDir, 'index.html'))).toBe(true);
    expect(html).not.toContain('{{');
  });

  it('A2 标题落位（{{APP_TITLE}}）', () => {
    expect(html).toContain('{{APP_TITLE}}');
  });

  it('A3 样式与脚本接线齐备（单文件内联 / 多文件外链双形态兼容）', () => {
    expect(html).toMatch(/style\.css|<style/);
    expect(html).toMatch(/app\.mjs|<script/);
  });
});
