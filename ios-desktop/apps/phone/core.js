// ==================== phone/core.js — 电话纯函数核（#286 续 · ref-only 补提取第五批 · v11.13） ====================
//
// 职责：phone/index.html 内联脚本的纯逻辑真身——拨号串正规化 / 通讯录两段匹配
// （全号精确 → 尾号回落）/ 显示分组格式化 / 拨号状态追加·退格纯数据段。
// 内联主脚本（经典 <script>）经 window.__phoneCore 桥消费同一份；
// vitest 侧用 new Function 沙箱提取（notes/camera core.js / fx-core.js 同范式）。
//
// ⚠ 模块形态：经典脚本 IIFE（无 export），由 index.html <script src="./core.js"> 同步加载
// （先于主内联脚本），零依赖，保证测试侧 new Function('window', SRC) 可直接执行提取。
// readContacts（localStorage IO）/ updateDisplay·showToast·createRipple（DOM 宿主）/
// handleCall（tel: 链接触发）依赖宿主，不属纯函数核，保留内联（notes 先例同律）。
//
// 车道：#286 ref-only 候补池第五批（phone 域，idRefs=29 高频优先）。零行为变化——
// 内联原实现整体搬移，调用点等值换算（lookupContact + 显示格式化 + 拨号增删段）。
//
// 关联 #286 #229 #243 #18 §5/§9

(function () {
  'use strict';

  // ==================== 拨号串正规化 ====================
  // 保留数字与 + 号（lookupContact 输入侧与通讯录号码侧共用同一份；原两处内联字面量上移）。
  function normalizeDial(numStr) {
    return String(numStr || '').replace(/[^0-9+]/g, '');
  }

  // ==================== 通讯录两段匹配（v7.19 应用互联真身） ====================
  // 与 contacts 应用共享同源 localStorage md3_contacts 的匹配判定：
  // ① 全号精确等值 ② 尾号 endsWith 回落；<3 位不查（原位数闸等值）；命中返回联系人名。
  // list 由调用方传入（readContacts 的 JSON.parse 结果），本核零 IO 保持纯函数。
  function lookupName(list, numStr) {
    const digits = normalizeDial(numStr);
    if (digits.length < 3) return null;
    const hit = list.find(c => normalizeDial(c.phone) === digits)
      || list.find(c => normalizeDial(c.phone).endsWith(digits));
    return hit ? hit.name : null;
  }

  // ==================== 显示分组格式化 ====================
  // 3-4-4…分组（3 位、7 位后及此后每 4 位插空格）；含非数字（*/#/+）原样返回；
  // 空串返回空（原内联实现整体搬移，逐语句等值）。
  function formatNumberDisplay(numStr) {
    if (!numStr) return "";
    if (/[^0-9]/.test(numStr)) return numStr;
    let formatted = "";
    for (let i = 0; i < numStr.length; i++) {
      if (i > 0 && (i === 3 || i === 7 || (i > 7 && (i - 7) % 4 === 0))) {
        formatted += " ";
      }
      formatted += numStr[i];
    }
    return formatted;
  }

  // ==================== 拨号状态纯数据段 ====================
  // 追加（15 位上限闸，原 addNumber 长度闸等值——满位时原样返回）/ 退格（slice(-1) 摘除，
  // 空串原样返回）。updateDisplay 触发时机由调用方内联保持（零行为变化）。
  function dialAppend(cur, num) {
    return cur.length < 15 ? cur + num : cur;
  }

  function dialBackspace(cur) {
    return cur.length > 0 ? cur.slice(0, -1) : cur;
  }

  var core = { normalizeDial: normalizeDial, lookupName: lookupName, formatNumberDisplay: formatNumberDisplay, dialAppend: dialAppend, dialBackspace: dialBackspace };
  if (typeof window !== 'undefined') window.__phoneCore = core;
})();
