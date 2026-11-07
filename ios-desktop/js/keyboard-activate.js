// ==================== keyboard-activate.js — 键盘可达语义接线层（#241 一批） ====================
//
// 职责：把「div + click」的裸交互面升级为键盘/读屏可达（tabindex + role + aria 标注
// + Enter/Space 触发），供 quick-settings / notifications / lock-screen 壳层组件消费。
// 本模块只落属性与键盘桥、零业务语义 —— role/checked/label 的判定单源在
// aosp/qs-tile-state.js（qsTileA11ySpec 纯函数）与各组件调用点。
// 既有先例：all-apps.js item（tabindex + keydown Enter/Space → item.click()）同款口径。
// 事件沿：合成 click 复用既有处理链（误触守卫/三态处置/动画源记录全保留）——
// 键盘触发无 pointerdown 前置，isFalseTap 仅在 __pt 采样存在时生效，天然豁免。

/** 可点语义 + 可聚焦（disabled 元素移出 Tab 序，aria-disabled 如实标注）。
 *  checked 传 null/undefined = 非 switch 语义不写 aria-checked；传布尔 = 写。 */
export function applyClickableSemantics(el, { role, label, checked = null, disabled = false } = {}) {
  if (!el) return el;
  if (role) el.setAttribute('role', role);
  if (label) el.setAttribute('aria-label', label);
  if (checked !== null && checked !== undefined) el.setAttribute('aria-checked', checked ? 'true' : 'false');
  if (disabled) el.setAttribute('aria-disabled', 'true');
  el.setAttribute('tabindex', disabled ? '-1' : '0');
  return el;
}

/** Enter/Space → el.click()（preventDefault 防 Space 滚屏与默认激活双触发）。
 *  交互后代（原生 button/a/表单/已带 role 的可聚焦子孙）自身持有原生键盘激活 ——
 *  桥不代触发，避免「按钮动作 + 卡片动作」双路径同帧触发（#241 媒体卡实况）。
 *  返回解绑函数；重渲染整棵重建元素的路径无需显式调用（随元素回收）。 */
export function bindKeyboardClick(el) {
  if (!el) return () => {};
  const onKey = (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (e.target !== el) {
      const inner = e.target.closest
        ? e.target.closest('button, a[href], input, select, textarea, [role="button"], [role="switch"], [role="slider"]')
        : null;
      if (inner && inner !== el && el.contains(inner)) return;
    }
    e.preventDefault();
    el.click();
  };
  el.addEventListener('keydown', onKey);
  return () => el.removeEventListener('keydown', onKey);
}
