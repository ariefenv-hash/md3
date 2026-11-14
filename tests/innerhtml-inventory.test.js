// ==================== innerhtml-inventory.test.js — #274 一期：innerHTML 分级分类器纯函数锚 ====================
// 守护对象：scripts/audit-innerhtml.mjs 的 extractStatement / classifyStatement 纯逻辑。
// 生成件 docs/innerhtml-inventory.md 的随树再生由脚本 --check 模式自证，本文件只锚分类器行为。

import { describe, it, expect } from 'vitest';
import { extractStatement, classifyStatement, ESCAPE_HELPERS, SOURCE_WORDS } from '../scripts/audit-innerhtml.mjs';

describe('#274 extractStatement 语句级提取', () => {
  it('单行赋值语句：至顶层分号截断', () => {
    const { text } = extractStatement(`x.innerHTML = '<b>ok</b>'; y++;`, 0);
    expect(text).toBe(`x.innerHTML = '<b>ok</b>';`);
  });

  it('多行模板串含 ${} 插值与嵌套引号：完整提取不截断', () => {
    const src = [
      'el.innerHTML = `',
      '  <div class="row">${escapeHtml(title)}</div>',
      '  <span data-x="${id}">\\`</span>',
      '`;',
      'after();',
    ].join('\n');
    const { text } = extractStatement(src, 3);
    expect(text).toContain('${escapeHtml(title)}');
    expect(text).toContain('data-x="${id}"');
    expect(text.endsWith('`;')).toBe(true);
    expect(text).not.toContain('after()');
  });

  it('语句内行注释与块注释不干扰提取', () => {
    const src = `a.innerHTML = 'x' /* ; */ + 'y'; // tail ; b++;`;
    const { text } = extractStatement(src, 0);
    expect(text).toBe(`a.innerHTML = 'x' /* ; */ + 'y';`);
  });
});

describe('#274 classifyStatement 三档判定', () => {
  it('A：零插值静态模板串与纯字面量拼接 → 内部常量', () => {
    expect(classifyStatement(`el.innerHTML = \`<div class="a">固定</div>\`;`)).toMatchObject({ tier: 'A', source: '内部常量', dynamic: false });
    expect(classifyStatement(`el.innerHTML = '<b>' + 'bold' + '</b>';`)).toMatchObject({ tier: 'A', dynamic: false });
  });

  it('B：插值且语句内含 escape 助手', () => {
    const r = classifyStatement(`el.innerHTML = \`<p>\${escapeHtml(userText)}</p>\`;`);
    expect(r.tier).toBe('B');
    expect(r.dynamic).toBe(true);
    expect(ESCAPE_HELPERS).toContain('escapeHtml(');
  });

  it('C：插值未见 escape，标识符命中用户输入词表', () => {
    const r = classifyStatement(`el.innerHTML = \`<p>\${msg.text}</p>\`;`);
    expect(r.tier).toBe('C');
    expect(r.source).toBe('用户输入');
    expect(r.hits).toContain('text');
  });

  it('C：动态 RHS（标识符直赋）词表零命中 → 内部', () => {
    const r = classifyStatement(`el.innerHTML = rowMarkup;`);
    expect(r.tier).toBe('C');
    expect(r.source).toBe('内部');
  });

  it('词表归类：网络与文件系统 token', () => {
    expect(classifyStatement(`el.innerHTML = \`<a href="\${pageUrl}">\` + '</a>';`)).toMatchObject({ source: '网络' });
    expect(classifyStatement(`el.innerHTML = renderEntry(fileSize);`)).toMatchObject({ source: '文件系统' });
    expect(Object.isFrozen(SOURCE_WORDS) || typeof SOURCE_WORDS).toBe('object');
  });

  it('守恒：混合样本逐条分类，档位只落 A/B/C 且计数和 = 总数', () => {
    const samples = [
      `el.innerHTML = '<i>static</i>';`,
      `el.innerHTML = \`<b>\${n}</b>\`;`,
      `el.innerHTML = \`<b>\${escapeHtml(n)}</b>\`;`,
      `el.innerHTML = '<s>' + strike + '</s>';`,
      `el.innerHTML = \`<u>\${filePath}</u>\`;`,
    ];
    const tiers = samples.map(s => classifyStatement(s).tier);
    for (const t of tiers) expect(['A', 'B', 'C']).toContain(t);
    const sum = ['A', 'B', 'C'].map(k => tiers.filter(t => t === k).length).reduce((a, b) => a + b, 0);
    expect(sum).toBe(samples.length);
  });
});
