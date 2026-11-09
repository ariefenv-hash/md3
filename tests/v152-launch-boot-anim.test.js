// ==================== v11.00 · #152 启动页谷歌开机动画（launch.html） ====================
// 验收：四色圆点形态 / 1.5~3s 时长带 / reduced-motion 退化 / 纯网页零视频零外链 / keyframes 防回退
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(resolve(__dirname, '../launch.html'), 'utf8');

describe('v11.00 · #152 谷歌四色圆点开机动画（launch.html）', () => {
  it('四圆点 DOM：gboot 容器 + gb 四点（aria-hidden 装饰语义）', () => {
    expect(src).toContain('<div class="gboot" aria-hidden="true">');
    expect(src).toMatch(/<span class="gb gb-b"><\/span><span class="gb gb-r"><\/span><span class="gb gb-y"><\/span><span class="gb gb-g"><\/span>/);
  });

  it('谷歌品牌规范色四值（#4285F4/#EA4335/#FBBC05/#34A853，豁免注释在录）', () => {
    expect(src).toContain('.gb-b { background: #4285F4; }');
    expect(src).toContain('.gb-r { background: #EA4335;');
    expect(src).toContain('.gb-y { background: #FBBC05;');
    expect(src).toContain('.gb-g { background: #34A853;');
    expect(src).toContain('Google 品牌规范色');
  });

  it('跳跃循环 + 收敛 keyframes 在场（依次错峰 delay 0.15s 步进）', () => {
    expect(src).toContain('@keyframes gboot-jump');
    expect(src).toContain('@keyframes gboot-settle');
    expect(src).toContain('animation-delay: 0.15s');
    expect(src).toContain('animation-delay: 0.3s');
    expect(src).toContain('animation-delay: 0.45s');
    expect(src).toContain('animation: gboot-jump 1.2s');
    expect(src).toContain('animation: gboot-settle 2.4s'); // 收敛 2.4s ∈ 1.5~3s 验收带
  });

  it('收敛语义：forwards 淡出 + visibility hidden + 固定高度防跳动', () => {
    expect(src).toContain('gboot-settle 2.4s cubic-bezier(0.4, 0, 0.2, 1) forwards');
    expect(src).toContain('100% { opacity: 0; visibility: hidden; }');
    expect(src).toMatch(/\.gboot \{[^}]*height: 34px;/);
  });

  it('reduced-motion 退化：四点静态点阵（动画 none + 静置透明度）', () => {
    expect(src).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[^]*\.gboot \{ animation: none !important; opacity: 0\.55; \}[^]*\.gb \{ animation: none !important; \}/);
  });

  it('零视频零外链（PWA 离线约束：无 <video>，动画依赖全内联）', () => {
    expect(src).not.toContain('<video');
    expect(src).not.toContain('.mp4');
    expect(src).not.toContain('.webm');
    // 四色圆点段零外部资源（gboot 段内无 url(/http 引用）——纯 CSS keyframes
    const gbootBlock = src.slice(src.indexOf('.gboot {'), src.indexOf('</style>'));
    expect(gbootBlock).not.toContain('url(');
    expect(gbootBlock).not.toContain('http');
  });

  it('既有入场节奏零破坏（rise-in/pop-in 主链保留 = LCP 不回退）', () => {
    expect(src).toContain('animation: rise-in 0.7s cubic-bezier(0.22, 1.2, 0.36, 1) both 0.15s');
    expect(src).toContain('animation: pop-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both 0.08s');
  });
});
