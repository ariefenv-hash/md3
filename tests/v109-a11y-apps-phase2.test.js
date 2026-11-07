// ==================== v109-a11y-apps-phase2.test.js — #105 二期 v10.57 ====================
//
// 覆盖（R99 普查帖 6671557585 五批执行序 · 14 零 aria 应用整改回归锁）：
//   · 批1 脚手架模板：aria 语义纪律注释 + tablist/tab 语义 + 日志区 aria-live（生成即合规）
//   · 批2 title→aria-label 双写平移批：safari / camera / messages（存量 title 不摘除——
//     WCAG 2.5.3 Label in Name：带可见文本钮以文本为名，aria-label 不得覆盖）
//   · 批3 纯图形钮批：shortcuts 十卡 role=button / threes 棋盘 role=application +
//     四输入具名（普查建议 role=grid 无 row/gridcell 结构支撑，按语义正确性裁决
//     role=application，裁决注在录）
//   · 批5 状态语义批：reminders 勾选态命名（renderTasks 生成面 aria-label）+ dice
//     总点数 role=status aria-live 播报 + settings 开关/滑条具名
//   · 批4 动态建面（部分）：clock-app timer.mjs 三 icon 钮 aria-label + index.html
//     静态面 24 处具名 + noise 音量 role=slider 三值属性
//   · 口径：静态 grep 七键普查可复跑（aria-label/aria-live/role= 三键计数锚）
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

describe('#105 二期 · 批1 脚手架模板 aria 基建', () => {
  const tpl = read('scripts/app-template.html');
  const multi = read('scripts/app-template-multi/index.html');

  it('单文件模板：日志区 role=status + aria-live（动态状态区纪律示范）', () => {
    expect(tpl).toContain('id="log" role="status" aria-live="polite"');
  });

  it('单文件模板：aria 语义纪律注释在录（图标钮/双写/role=button 三则）', () => {
    expect(tpl).toContain('aria 语义纪律');
    expect(tpl).toContain('aria-label + title 双写');
  });

  it('多文件模板：tablist/tab 语义 + aria-selected 双态', () => {
    expect(multi).toContain('role="tablist"');
    expect(multi).toContain('role="tab" aria-selected="true"');
    expect(multi).toContain('role="tab" aria-selected="false"');
  });

  it('多文件模板：日志区 aria-live + 纪律注释 + 既有怠速柄滑条 aria-label 不回退', () => {
    expect(multi).toContain('role="status" aria-live="polite"');
    expect(multi).toContain('aria 语义纪律');
    expect(multi).toContain('aria-label="示例参数"');
  });
});

describe('#105 二期 · 批2 title→aria-label 双写平移批', () => {
  it('safari：存量 title 全部保留（双写纪律「不摘除」回归锁）', () => {
    const h = read('ios-desktop/apps/safari/index.html');
    ['新建标签页 (Ctrl+T)', '自定义及控制 Mirror', '后退 (Alt+Left)', '前进 (Alt+Right)',
      '刷新 (Ctrl+R)', '主页', '收藏此页', '扩展程序', '阅读模式', '账户'].forEach((t) => {
      expect(h).toContain(`title="${t}"`);
    });
  });

  it('safari：十枚图标钮 + 地址栏输入 + 动态标签页/关闭/快捷方式 aria 具名', () => {
    const h = read('ios-desktop/apps/safari/index.html');
    expect(h).toContain('aria-label="新建标签页"');
    expect(h).toContain('aria-label="自定义及控制"');
    expect(h).toContain('aria-label="后退"');
    expect(h).toContain('aria-label="前进"');
    expect(h).toContain('aria-label="刷新"');
    expect(h).toContain('aria-label="主页"');
    expect(h).toContain('aria-label="收藏此页"');
    expect(h).toContain('aria-label="扩展程序"');
    expect(h).toContain('aria-label="阅读模式"');
    expect(h).toContain('aria-label="账户"');
    expect(h).toContain('aria-label="搜索或输入网址"');
    expect(h).toContain(`aria-label="\${t.url === 'about:blank' ? '新标签页' : t.url}"`);
    expect(h).toContain('aria-label="关闭标签页"');
    expect(h).toContain('aria-label="打开 ${s.name}"');
  });

  it('camera：五工具钮 title 保留 + 具名；gallery/shutter div 面 role=button+tabindex', () => {
    const h = read('ios-desktop/apps/camera/index.html');
    ['闪光灯', '画幅比例', '构图参考线', '滤镜', '定时拍摄'].forEach((t) => {
      expect(h).toContain(`title="${t}" aria-label="${t}"`);
    });
    expect(h).toContain('id="galleryBtn" title="查看相册" role="button" tabindex="0" aria-label="查看相册"');
    expect(h).toContain('id="shutterBtn" title="快门" role="button" tabindex="0" aria-label="快门"');
    expect(h).toContain('title="翻转镜头" aria-label="翻转镜头"');
    expect(h).toContain('id="cameraToast" aria-live="polite"');
  });

  it('messages：头部/房间弹窗/输入区/动态会话卡 aria 具名', () => {
    const h = read('ios-desktop/apps/messages/index.html');
    expect(h).toContain('aria-label="创建 / 加入房间"');
    expect(h).toContain('aria-label="切换侧栏"');
    expect(h).toContain('id="roomCodePill" title="点击复制房间码" role="button" tabindex="0" aria-label="复制房间码"');
    expect(h).toContain('aria-label="清空本对话消息"');
    expect(h).toContain('aria-label="消息输入框"');
    expect(h).toContain('aria-label="昵称"');
    expect(h).toContain('aria-label="房间名"');
    expect(h).toContain('aria-label="房间口令"');
    expect(h).toContain('aria-label="房间码"');
    expect(h).toContain('aria-label="房间码，点击复制"');
    expect(h).toContain(`data-copy-room="\${r.hash}" role="button" tabindex="0"`);
    expect(h).toContain(`title="\${read ? '已读' : '送达'}" aria-label="\${read ? '已读' : '送达'}"`);
  });
});

describe('#105 二期 · 批3 纯图形钮批', () => {
  it('shortcuts：十卡 role=button + tabindex + 全名 aria-label', () => {
    const h = read('ios-desktop/apps/shortcuts/index.html');
    ['打开天气——查看当前天气', '5分钟计时器——打开时钟并立即开始计时', '翻译剪贴板——读取剪贴板文本并自动翻译',
      '发送消息——快速发消息给联系人', '新建备忘——打开备忘录并新建便签', '回家路线——导航回家',
      '播放音乐——继续播放上次歌曲', '添加提醒——新建一条待办任务', '记今日笔记——打开日历定位到今天编辑',
      '扫描文档——使用相机扫描文件'].forEach((n) => {
      expect(h).toContain(`role="button" tabindex="0" aria-label="快捷指令：${n}"`);
    });
    expect(h).toContain('id="toast" aria-live="polite"');
  });

  it('threes：五 icon 钮具名 + 棋盘 role=application（裁决注）+ 四输入具名', () => {
    const h = read('ios-desktop/apps/threes/index.html');
    expect(h).toContain('id="histBtn" title="战绩" aria-label="战绩"');
    expect(h).toContain('id="aiBtn" title="AI推演" aria-label="AI推演"');
    expect(h).toContain('id="sndBtn" title="音效" aria-label="音效开关"');
    expect(h).toContain('id="setBtn" title="设置" aria-label="设置"');
    expect(h).toContain('id="rstBtn" title="重开" aria-label="重新开局"');
    expect(h).toContain('id="board" role="application" aria-label="Threes 棋盘：方向键（WASD）或滑动手势移动方块，快滑下棋"');
    expect(h).toContain('id="aiSpeed" class="mdslider" min="10" max="300" value="40" step="5" aria-label="AI 推演速度"'); // v10.57 #227 组件类接入
    expect(h).toContain('aria-label="背景模糊强度"');
    expect(h).toContain('aria-label="优先字体"');
    expect(h).toContain('aria-label="签名文字"');
  });
});

describe('#105 二期 · 批5 状态语义批', () => {
  it('reminders：生成面勾选态命名（renderTasks aria-label 动态前缀）+ 删除钮具名 + 静态五件', () => {
    const h = read('ios-desktop/apps/reminders/index.html');
    expect(h).toContain(`inp.setAttribute('aria-label', (task.completed ? '取消完成：' : '标记完成：') + task.title)`);
    expect(h).toContain(`del.setAttribute('aria-label', '删除任务：' + task.title)`);
    expect(h).toContain('id="menu-toggle" aria-label="切换侧栏菜单"');
    expect(h).toContain('aria-label="任务名称"');
    expect(h).toContain('aria-label="截止日期"');
    expect(h).toContain('id="task-group-select" class="input-field" style="padding:12px;" aria-label="分组"');
    expect(h).toContain('aria-label="分组名称"');
  });

  it('dice：总点数 role=status + aria-live 播报 + 步进/开关/滑条具名', () => {
    const h = read('ios-desktop/apps/dice/index.html');
    expect(h).toContain('id="total-score-display" class="total-score-badge" role="status" aria-live="polite"');
    expect(h).toContain('title="抛掷统计" aria-label="抛掷统计"');
    expect(h).toContain('title="参数设置" aria-label="参数设置"');
    expect(h).toContain('aria-label="减少骰子数量"');
    expect(h).toContain('aria-label="增加骰子数量"');
    expect(h).toContain('id="toggle-total" aria-label="显示总点数"');
    expect(h).toContain('id="toggle-sound" aria-label="音效"');
    expect(h).toContain('id="toggle-shake" aria-label="震动反馈"');
    expect(h).toContain('id="param-gravity" min="20" max="100" value="60" aria-label="重力"');
    expect(h).toContain('id="param-bounciness" min="0" max="0.8" step="0.05" value="0.3" aria-label="弹性"');
    expect(h).toContain('id="wallpaper-input" accept="image/*" aria-label="自定义壁纸"');
  });
});

describe('#105 二期 · 批4 动态建面（部分落地）+ 静态余量', () => {
  it('clock-app index.html：icon 钮/开关/时间/下拉/文件域具名 + noise 音量 role=slider', () => {
    const h = read('ios-desktop/apps/clock-app/index.html');
    ['更多选项', '新建闹钟', '添加城市', '关闭数字键盘', '开始计时器', '新建计时器',
      '播放或暂停白噪音', '返回', '试听响铃', '就寝时间', '起床时间', '就寝提醒',
      '渐弱定时关闭', '全局响铃风格', '渐强音量', '日出渐亮屏', '搜索城市', '闹钟标签',
      '响铃振动', '睡眠时间表开关'].forEach((n) => {
      expect(h).toContain(`aria-label="${n}"`);
    });
    expect(h).toContain('id="noiseVolTrack" role="slider" tabindex="0" aria-label="白噪音音量" aria-valuemin="0" aria-valuemax="100" aria-valuenow="60"');
    expect(h).toContain('aria-label="字体文件"');
    expect(h).toContain('aria-label="壁纸文件"');
    expect(h).toContain('aria-label="自定义响铃音频"');
    expect(h).toContain('aria-label="白噪音音频文件"');
  });

  it('clock-app timer.mjs：动态建面三 icon 钮 aria-label（删除/重置/暂停继续）', () => {
    const h = read('ios-desktop/apps/clock-app/timer.mjs');
    expect(h).toContain('data-act="del-timer" data-id="\'+o.id+\'" aria-label="删除该定时器"');
    expect(h).toContain('data-act="reset-timer" data-id="\'+o.id+\'" aria-label="重置该定时器"');
    expect(h).toContain('data-act="toggle-timer" data-id="\'+o.id+\'" aria-label="暂停或继续该定时器"');
  });

  it('stocks：工具钮/搜索/关闭面板具名', () => {
    const h = read('ios-desktop/apps/stocks/index.html');
    expect(h).toContain('title="切换红涨绿跌/绿涨红跌" aria-label="切换红涨绿跌"');
    expect(h).toContain('title="刷新行情" aria-label="刷新行情"');
    expect(h).toContain('aria-label="搜索股票"');
    expect(h).toContain('id="btnCloseSheet" aria-label="关闭详情面板"');
  });

  it('code-editor / midi-player / ping：文件树刷新钮 + 文件域 + 目标输入具名（带文本钮不覆盖可见名——Label in Name 纪律锚）', () => {
    expect(read('ios-desktop/apps/code-editor/index.html')).toContain('id="ceRefreshBtn" data-test="ce-refresh" title="刷新" aria-label="刷新文件列表"');
    expect(read('ios-desktop/apps/code-editor/index.html')).toContain('aria-label="文件名"');
    const mp = read('ios-desktop/apps/midi-player/index.html');
    expect(mp).toContain('aria-label="MIDI 文件"');
    expect(mp).toContain('title="切换音色引擎" aria-label="音色引擎：切换"');
    expect(read('ios-desktop/apps/ping/index.html')).toContain('aria-label="Ping 目标地址"');
  });
});

describe('#105 二期尾账 · calculator 动态/静态图标面（R101 加餐补齐）', () => {
  const h = read('ios-desktop/apps/calculator/index.html');
  it('七 title 钮双写 + 显示区 role=button + 四退格/换向/刷新/关闭/重置具名', () => {
    ['主菜单', '切换全屏', '设置', '历史记录', '清除历史'].forEach((t) => {
      expect(h).toContain(`title="${t}" aria-label="${t}"`);
    });
    expect(h).toContain('id="display-container" title="点击复制当前数值" role="button" tabindex="0" aria-label="计算结果，点击复制当前数值"');
    expect(h.match(/aria-label="退格"/g) || []).toHaveLength(4);
    expect(h).toContain('id="btn-swap-units" aria-label="交换单位"');
    expect(h).toContain('id="fx-refresh" aria-label="刷新汇率"');
    expect(h).toContain('id="btn-close-left" aria-label="关闭侧栏"');
    expect(h).toContain('id="btnfont-reset" title="重置" aria-label="重置字体"');
  });
});

describe('#105 二期 · 普查口径复跑（静态 grep 三键计数锚）', () => {
  // R99 普查帖同口径：aria-label/aria-live/role= 三键出现次数（v10.57 时点）。
  // 锚值为本窗实测，防回退（任一应用 aria 标记被删除即红）。
  const CASES = [
    ['ios-desktop/apps/safari/index.html', 14],
    ['ios-desktop/apps/camera/index.html', 9],
    ['ios-desktop/apps/messages/index.html', 14],
    ['ios-desktop/apps/shortcuts/index.html', 11],
    ['ios-desktop/apps/threes/index.html', 10],
    ['ios-desktop/apps/reminders/index.html', 5],
    ['ios-desktop/apps/dice/index.html', 11],
    ['ios-desktop/apps/stocks/index.html', 4],
    ['ios-desktop/apps/code-editor/index.html', 2],
    ['ios-desktop/apps/midi-player/index.html', 2],
    ['ios-desktop/apps/ping/index.html', 1],
    ['ios-desktop/apps/clock-app/index.html', 14],
    ['ios-desktop/apps/calculator/index.html', 15],
  ];
  CASES.forEach(([p, n]) => {
    it(`${p} ≥ ${n} 处 aria 标记`, () => {
      const m = read(p).match(/aria-label=|aria-live=|role=/g) || [];
      expect(m.length).toBeGreaterThanOrEqual(n);
    });
  });
});
