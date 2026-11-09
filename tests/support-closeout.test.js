// ==================== v8.34 #22⑪：support「提示和支持」收官裁决 ====================
//
// #22 清单最后一项处置（⑪ support——AOSP 无独立 XML，注记「手机形态是否显示需
// controller 实证；虚构支持页或映射帮助中心，考证后决定」→ 裁决为门控隐藏）：
//   SupportPreferenceController.getAvailabilityStatus() 实拉（support 包 1938B 全文）：
//     return mSupportFeatureProvider == null ? UNSUPPORTED_ON_DEVICE : AVAILABLE;
//   provider 接线实拉：
//     FeatureFactory.kt 接口默认 `open val supportFeatureProvider: SupportFeatureProvider? = null`
//     FeatureFactoryImpl.kt（AOSP 纯净默认实现）全文零 support 覆盖
//     → AOSP 纯净出厂 supportFeatureProvider = null → UNSUPPORTED_ON_DEVICE → 行隐藏
//   handlePreferenceTreeClick = mSupportFeatureProvider.startSupport(mActivity)（Tips &
//     Support 独立应用外部 intent——GMS 形态才有的 provider，Web 无对应）
//   一级行 XML 实拉（top_level_settings.xml）：HomepagePreference key=top_level_support
//     order=100 title=page_tab_title_support summary=support_summary icon=ic_help
//   处置 = v8.31 security 形态门控隐藏同律：hidden:true 保留行语义不渲染；
//   #22 十一项全处置完毕（STUB 0 项收官）
//
// 测试纪律（worklog 惯例）：负断言用 not.toMatch 正则防注释误报。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const src = (p) => readFileSync(resolve(ROOT, p), 'utf8');

describe('v8.34 #22⑪ two-pane support 收官裁决', () => {
  const tp = src('ios-desktop/js/apps/settings-two-pane.js');

  it('support 行 hidden:true（UNSUPPorted_ON_DEVICE 门控隐藏，v8.31 security 同律）', () => {
    expect(tp).toContain("key: 'support', icon: 'topSupport', plate: 'purple', label: '提示和支持', sub: '', hidden: true");
    expect(tp).not.toMatch(/key: 'support'.*idx: STUB_IDX/);
  });

  it('取证链注记在位：getAvailabilityStatus + supportFeatureProvider=null + FeatureFactoryImpl 零覆盖', () => {
    expect(tp).toContain('v8.34 #22⑪ 收官裁决：SupportPreferenceController.getAvailabilityStatus() 实拉');
    expect(tp).toContain('mSupportFeatureProvider == null ? UNSUPPORTED_ON_DEVICE : AVAILABLE');
    expect(tp).toContain('open val supportFeatureProvider:');
    expect(tp).toContain('SupportFeatureProvider? = null');
    expect(tp).toContain('FeatureFactoryImpl.kt 全文零 support 覆盖');
    expect(tp).toContain('Tips & Support 独立应用外部 intent');
    expect(tp).toContain('不转正独立页');
  });

  it('STUB 收官注记：剩余 0 项 + #22 十一项全处置完毕 + 常量保留历史锚', () => {
    expect(tp).toContain('剩余 0 项——v8.34 #22⑪ support 实证 UNSUPPORTED_ON_DEVICE 门控隐藏，#22 十一项全处置完毕');
    expect(tp).toContain('常量保留供历史测试锚定，无引用点');
    expect(tp).not.toMatch(/剩余 1 项仍占位/);
  });

  it('一级行 XML 权威注记：HomepagePreference + top_level_support + page_tab_title_support + ic_help', () => {
    expect(tp).toContain('top_level_support');
    expect(tp).toContain('page_tab_title_support');
    expect(tp).toContain('ic_help');
  });
});

describe('v8.34 #22⑪ 字符纪律', () => {
  it('新增注记段零 emoji（切片范围仅本轮新增，全文负断言防历史字符误报）', () => {
    const tp = src('ios-desktop/js/apps/settings-two-pane.js');
    const i = tp.indexOf('v8.34 #22⑪ 收官裁决');
    const seg = tp.slice(i, tp.indexOf("{ key: 'support'", i));
    const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    expect(seg).not.toMatch(emojiRe);
  });
});
