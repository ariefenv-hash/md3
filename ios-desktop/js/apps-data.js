// ==================== apps-data.js — 应用数据聚合入口 ====================
//
// 每个应用的内容定义已拆分到 js/apps/ 目录下的独立文件中。
// 本文件只负责聚合导入，确保 initialApps 数组顺序不变。
// 每个 import 行尾注含「用途：」为清单级用途契约（#296）：非空且全量唯一，
// check:comments 强检（缺注/过短/复制粘贴重复即红）；「用途：」标记是未来
// APPS.md 生成器的同源消费切分点（生成接线属 #285 车道，本文件不做）。

import messages   from './apps/messages.js'; // 用途：即时信息会话——消息收发/表情与回执
import mail       from './apps/mail.js'; // 用途：邮件——收件箱浏览与信件阅读
import photos     from './apps/photos.js'; // 用途：相册——图库浏览与大图查看
import settings   from './apps/settings.js'; // 用途：系统设置中枢——多分区偏好管控
import clockApp   from './apps/clock.js'; // 用途：时钟——闹钟管理与时间工具
import calendar   from './apps/calendar.js'; // 用途：日历——月历浏览与日程查看
import weather    from './apps/weather.js'; // 用途：天气——城市检索与实况预报浏览
import music      from './apps/music.js'; // 用途：音乐播放——本地导入/歌词制作与播放控制
import calculator from './apps/calculator.js'; // 用途：计算器——算式求值与历史记录
import camera     from './apps/camera.js'; // 用途：相机——WebRTC 取景拍摄
import map        from './apps/map.js'; // 用途：地图——地图浏览与地点查看
import notes      from './apps/notes.js'; // 用途：备忘录——速记与笔记管理
import reminders  from './apps/reminders.js'; // 用途：提醒事项——待办清单管理
import health     from './apps/health.js'; // 用途：健身记录——活动数据概览
import wallet     from './apps/wallet.js'; // 用途：钱包——票卡凭证聚合
import appstore   from './apps/appstore.js'; // 用途：应用市场——在线目录与应用安装
import stocks     from './apps/stocks.js';       // 新增：股票｜用途：股票行情——列表检索与走势浏览
import shortcuts  from './apps/shortcuts.js';    // 新增：快捷指令｜用途：指令卡片集管理与运行
import threes     from './apps/threes.js';       // 新增：小三传奇｜用途：数字滑块益智——配对合并
import dice       from './apps/dice.js';         // 新增：掷骰子｜用途：多骰投掷与投掷历史
import flow11     from './apps/flow11.js';       // 新增：Flow 11｜用途：消除棋盘——莫奈莫兰迪配色玩法
import safari     from './apps/safari.js'; // 用途：浏览器——网页访问与书签管理
import phone      from './apps/phone.js'; // 用途：电话——拨号盘与拨号操作
import facetime   from './apps/facetime.js'; // 用途：视频通话——Meet 会话入口
import contacts   from './apps/contacts.js'; // 用途：通讯录——联系人检索与详情
import findmy     from './apps/findmy.js'; // 用途：查找——设备定位视图
import translate  from './apps/translate.js'; // 用途：翻译——多语言互译
import game2048   from './apps/game2048.js';  // v7.29：2048 纸牌接龙（替换原播客位）｜用途：滑块拼图——同值合并冲高分
import books      from './apps/books.js'; // 用途：图书——电子书阅读与书架
import files      from './apps/files.js';   // 批次三：文件管理器（数据层）｜用途：VFS 目录浏览与文件操作
import recorder   from './apps/recorder.js'; // 批次四：录音机（大功能）｜用途：录音录制与回放管理
import installer  from './apps/installer.js'; // v7.52：安装包（.mdapp 包管理）｜用途：包导入安装与卸载托管
import reaction   from './apps/reaction.js'; // v8.36 #29：反应力测试（P0 五应用之⑤）｜用途：响应时长测量与最佳成绩
import word       from './apps/word.js'; // v8.39 #28：每日单词（P0 应用之⑦）｜用途：词库卡片翻转学习
import terminal   from './apps/terminal.js'; // v8.40 #25：命令行终端（P0 首位）｜用途：命令行会话与虚拟文件系统操作
import piano      from './apps/piano.js'; // v8.41 #57：电子琴（#12 P1 批次）｜用途：键盘弹奏与录音回放
import bytebeat   from './apps/bytebeat.js'; // v8.42 #30：ByteBeat 音乐编程（#12 P2 首位）｜用途：表达式合成音频
import python     from './apps/python.js'; // v8.43 #31：Python REPL（#12 P2·Pyodide 懒加载）｜用途：浏览器内交互执行
import ping       from './apps/ping.js'; // v8.44 #60：PING 网络诊断（#12 P1·fetch 计时）｜用途：连通性探测与计时统计
import codeEditor from './apps/code-editor.js'; // v8.50 #32：代码编辑器 CodeMirror 6（#12 P1 首位·终端/Python 联动）｜用途：代码编辑与联动运行
import midiPlayer from './apps/midi-player.js'; // v8.51 #56：MIDI 播放器（#12 P1·html-midi-player 钢琴卷帘）｜用途：MIDI 播放与卷帘可视化
import ocr from './apps/ocr.js'; // v8.52 #58：OCR 文字识别（#12 P1·Tesseract.js 5 离线内嵌）｜用途：离线图片文本提取
import stt from './apps/stt.js'; // v8.53 #59：语音转文字（#12 P1·Web Speech 原生实时听写）｜用途：实时听写转写
import radio from './apps/radio.js'; // v8.54 #61：收音机（#12 P1·radio-browser 电台目录 + https 直流）｜用途：电台检索与直播播放
import driving from './apps/driving.js'; // v8.55 #62：驾考题库（#12 P2·本地题库 + 刷题模式）｜用途：科目练习与刷题模式
import gravity from './apps/gravity.js'; // v9.03 #123：重力沙盒（#12 P1·N 体轨道演算）｜用途：天体轨道物理演算
import drawcircle from './apps/drawcircle.js'; // v9.05 #124：画圆挑战（#12 应用批·nightsky simul/drawcircle.html 对标超越，手绘圆精度评分）｜用途：手绘圆精度评分
import typing from './apps/typing.js'; // v9.06 #122：打字练习（#12 应用批·nightsky nstypepractise 一期：英文单词/句子/自由练习 + 逐字比对指示器）｜用途：打字练习与逐字比对
import markdown from './apps/markdown.js'; // v9.16 #165：Markdown 编辑器（复用已 vendor marked + sanitize 白名单闸 + VFS /documents/ 与文件管理器互通）｜用途：编辑预览与文档互通
import archive from './apps/archive.js'; // v9.17 #166：压缩/解压（复用已 vendor JSZip，多选压缩/解压到 /archives/，只做 zip）｜用途：zip 打包与解档
import pdf from './apps/pdf.js'; // v9.18 #164：PDF 阅读（复用已 vendor pdf.js v3.11.174，零新增体积；翻页/缩放/目录/文本选择/全文搜索）｜用途：文档阅读与全文搜索
import chess from './apps/chess.js'; // v9.94 #132：国际象棋（完整规则易位/过路兵/升变/将死/逼和/三次重复 + AI 三档 minimax α-β + SAN 棋谱；纯逻辑核 js/chess-core.js perft 金标验证）｜用途：规则对弈与 AI 对局

export const initialApps = [
  // 第 1 页（24 格）
  messages, mail, photos, settings,
  clockApp, calendar, weather, music,
  calculator, camera, map, notes,
  reminders, health, wallet, appstore,
  safari, phone, facetime, contacts,
  findmy, translate, game2048, books,
  // 第 2 页（新应用）
  stocks, shortcuts, threes, dice, flow11, files, recorder, installer, reaction, word, terminal, piano, bytebeat, python, ping, codeEditor, midiPlayer, ocr, stt, radio, driving, gravity, drawcircle, typing, markdown, archive, pdf, chess, // v9.13 #180：歌词制作（原 49 号）撤独立应用户口——并入 music 歌词制作二级界面，打轴核 apps/music/lyric-core.js；v9.16 #165：markdown 第 49 号；v9.17 #166：archive 第 50 号；v9.18 #164：pdf 第 51 号（溢出格由 state.js 页容 24 严格分页自适应）；v9.94 #132：chess 第 52 号
];
