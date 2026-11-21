// =============================================================================
// gastown-nav.mjs — Google Clock 9.3 <animated-selector> Web 接线
//
// 9.3 真机结构（证据卷 docs/reference/deskclock/gastown93/）：
//   <animated-selector>
//     <item state_selected="true" drawable="gs_*_fill1_vd_theme_24"/>   ← 静态选中态
//     <item                   drawable="gs_*_vd_theme_24"/>           ← 静态未选态
//     <transition drawable="avd_tab_*_transition" fromId=.. toId=../>    ← AVD 形变过渡
//   </animated-selector>
//
// 本模块把上面三层逐一落到 DOM：
//   · 静态 item = 原有 .nav-svg 的 p-sel / p-un（960 viewport，pathData 逐字来自 9.3）
//   · transition = .gastown-avd-overlay 里的 24 viewport AVD SVG（53 objectAnimator）
//   · 状态切换时先隐藏静态态、播放 AVD，播完才把静态态交还给 CSS
//
// 旧 v9.43 的 CSS keyframes / .animate-click 钩子在运行时不再激活（源码文本保留为
// 史实锚），图标动画的唯一驱动是 9.3 原始 AVD 时间轴。
// =============================================================================

import { playAVD, AVD_TAB_KEYS } from './avd-runtime.mjs';

const TAB_BY_DATA = {
  Alarm: 'Alarm', World: 'World', Timer: 'Timer',
  Stopwatch: 'Stopwatch', Bedtime: 'Bedtime',
};

export function mountGastownNav() {
  const nav = document.querySelector('.gastown-nav');
  if (!nav || nav.dataset.avdMounted === '1') return;
  nav.dataset.avdMounted = '1';

  const items = Array.from(nav.querySelectorAll('.nav-item[data-tab]'))
    .filter((it) => AVD_TAB_KEYS.includes(TAB_BY_DATA[it.dataset.tab]));

  for (const it of items) {
    const wrap = it.querySelector('.nav-icon-wrapper');
    if (!wrap) continue;
    let ov = wrap.querySelector('.gastown-avd-overlay');
    if (!ov) {
      ov = document.createElement('span');
      ov.className = 'gastown-avd-overlay';
      ov.hidden = true;
      ov.setAttribute('aria-hidden', 'true');
      wrap.appendChild(ov);
    }
    it.__gastownAvd = {
      ov,
      selected: it.classList.contains('active'),
      cancel: null,
      seq: 0,
    };
  }

  const start = (it, toSelected) => {
    const st = it.__gastownAvd;
    if (!st) return;
    st.seq += 1;
    const seq = st.seq;
    if (st.cancel) { st.cancel(); st.cancel = null; }
    // 播放期间静态 item 不可见：visibility 而非 display，避免布局抖动
    it.classList.add('avd-playing');
    st.ov.hidden = false;
    st.cancel = playAVD(st.ov, TAB_BY_DATA[it.dataset.tab], {
      reverse: !toSelected,
      onDone: () => {
        if (seq !== st.seq) return; // 已被新一次切换取消
        st.ov.hidden = true;
        st.ov.replaceChildren();
        it.classList.remove('avd-playing');
        st.cancel = null;
      },
    });
  };

  // 状态变化由 app.mjs 的 .active class 驱动 —— 与业务层解耦，不改任何游戏逻辑
  const activeObs = new MutationObserver((muts) => {
    for (const m of muts) {
      const it = m.target;
      if (!it.classList || !it.classList.contains('nav-item')) continue;
      const st = it.__gastownAvd;
      if (!st) continue;
      const sel = it.classList.contains('active');
      if (sel === st.selected) continue;
      st.selected = sel;
      start(it, sel);
    }
  });
  for (const it of items) activeObs.observe(it, { attributes: true, attributeFilter: ['class'] });

  // 旧 CSS keyframes 钩子：运行时立即摘除，避免 AVD 播完后又叠一层老动画。
  // 源码里的 @keyframes / .animate-click 规则保留为史实锚（测试读文件仍可回读），
  // 但运行时不再产生任何 CSS keyframe 动画。
  const legacyObs = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.target.classList && m.target.classList.contains('animate-click')) {
        m.target.classList.remove('animate-click');
      }
    }
  });
  for (const it of items) legacyObs.observe(it, { attributes: true, attributeFilter: ['class'] });
  for (const it of items) it.classList.remove('animate-click');

  return { items: items.length, keys: items.map((i) => i.dataset.tab) };
}

// 自动挂载（模块由 index.html 末尾的 <script type="module"> 引入）
const boot = () => mountGastownNav();
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
