// ==================== apps-data.js — 应用数据聚合入口 ====================
//
// 每个应用的内容定义已拆分到 js/apps/ 目录下的独立文件中。
// 本文件只负责聚合导入，确保 initialApps 数组顺序不变。

import messages   from './apps/messages.js';
import mail       from './apps/mail.js';
import photos     from './apps/photos.js';
import settings   from './apps/settings.js';
import clockApp   from './apps/clock.js';
import calendar   from './apps/calendar.js';
import weather    from './apps/weather.js';
import music      from './apps/music.js';
import calculator from './apps/calculator.js';
import camera     from './apps/camera.js';
import map        from './apps/map.js';
import notes      from './apps/notes.js';
import reminders  from './apps/reminders.js';
import health     from './apps/health.js';
import wallet     from './apps/wallet.js';
import appstore   from './apps/appstore.js';
import stocks     from './apps/stocks.js';       // 新增：股票
import shortcuts  from './apps/shortcuts.js';    // 新增：快捷指令
import threes     from './apps/threes.js';       // 新增：小三传奇
import dice       from './apps/dice.js';         // 新增：掷骰子
import flow11     from './apps/flow11.js';       // 新增：Flow 11
import safari     from './apps/safari.js';
import phone      from './apps/phone.js';
import facetime   from './apps/facetime.js';
import contacts   from './apps/contacts.js';
import findmy     from './apps/findmy.js';
import translate  from './apps/translate.js';
import game2048   from './apps/game2048.js';  // v7.29：2048 纸牌接龙（替换原播客位）
import books      from './apps/books.js';
import files      from './apps/files.js';   // 批次三：文件管理器（数据层）
import recorder   from './apps/recorder.js'; // 批次四：录音机（大功能）

export const initialApps = [
  // 第 1 页（24 格）
  messages, mail, photos, settings,
  clockApp, calendar, weather, music,
  calculator, camera, map, notes,
  reminders, health, wallet, appstore,
  safari, phone, facetime, contacts,
  findmy, translate, game2048, books,
  // 第 2 页（新应用）
  stocks, shortcuts, threes, dice, flow11, files, recorder,
];
