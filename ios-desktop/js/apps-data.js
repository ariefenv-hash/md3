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
import installer  from './apps/installer.js'; // v7.52：安装包（.mdapp 包管理）
import reaction   from './apps/reaction.js'; // v8.36 #29：反应力测试（P0 五应用之⑤）
import word       from './apps/word.js'; // v8.39 #28：每日单词（P0 应用之⑦）
import terminal   from './apps/terminal.js'; // v8.40 #25：命令行终端（P0 首位）
import piano      from './apps/piano.js'; // v8.41 #57：电子琴（#12 P1 批次）
import bytebeat   from './apps/bytebeat.js'; // v8.42 #30：ByteBeat 音乐编程（#12 P2 首位）
import python     from './apps/python.js'; // v8.43 #31：Python REPL（#12 P2·Pyodide 懒加载）
import ping       from './apps/ping.js'; // v8.44 #60：PING 网络诊断（#12 P1·fetch 计时）
import codeEditor from './apps/code-editor.js'; // v8.50 #32：代码编辑器 CodeMirror 6（#12 P1 首位·终端/Python 联动）
import midiPlayer from './apps/midi-player.js'; // v8.51 #56：MIDI 播放器（#12 P1·html-midi-player 钢琴卷帘）
import ocr from './apps/ocr.js'; // v8.52 #58：OCR 文字识别（#12 P1·Tesseract.js 5 离线内嵌）
import stt from './apps/stt.js'; // v8.53 #59：语音转文字（#12 P1·Web Speech 原生实时听写）
import radio from './apps/radio.js'; // v8.54 #61：收音机（#12 P1·radio-browser 电台目录 + https 直流）
import driving from './apps/driving.js'; // v8.55 #62：驾考题库（#12 P2·本地题库 + 刷题模式）

export const initialApps = [
  // 第 1 页（24 格）
  messages, mail, photos, settings,
  clockApp, calendar, weather, music,
  calculator, camera, map, notes,
  reminders, health, wallet, appstore,
  safari, phone, facetime, contacts,
  findmy, translate, game2048, books,
  // 第 2 页（新应用）
  stocks, shortcuts, threes, dice, flow11, files, recorder, installer, reaction, word, terminal, piano, bytebeat, python, ping, codeEditor, midiPlayer, ocr, stt, radio, driving,
];
