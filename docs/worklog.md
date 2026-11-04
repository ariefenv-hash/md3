# worklog

## R83（2026-11-04 22:00–23:20 +08）窗账

- **v9.84 = 3bde2d0 · #204 单手模式 AOSP OneHanded 全机制**：aosp/one-handed.js 纯逻辑（wmshell main 实拉：状态机 NONE/ENTERING/ACTIVE/EXITING + 加固迁移表、offset 40% 勘误议题 33%、超时 NEVER/4/8/12s 默认 MEDIUM、触摸区域 round(y)<boundsTop + stop 一次门）+ one-handed.js DOM 面（#desktop translateY 338px 600ms decel + 退出三通道 上滑/点外部/超时 + __oneHanded 钩子）+ 接线三件（QS 磁贴 toggle / 编辑器目录 600px 隐藏 / nav-bar 下拉进入上滑退出）。vitest 3949/3949·206（+32）+ e2e-v984 14/14 + dist-smoke 40/40。
- **v9.85 = 10853c8 · #152 启动页谷歌开机动画**：launch.html .gboot 四色圆点（品牌规范色豁免在录）跳跃循环 2.4s 收敛淡出 + reduced-motion 静态点阵退化。vitest 3956/3956·207（+7）+ 无头冒烟（四色 RGB/收敛/零外链）。
- **补锚**：#161（v9.75 随 #158 落地的裁决实施补录帖 6633565621）。
- **查证裁决**：#185 弱密码启发式前置不成立（md3 锁屏无密码体系，议题自身「先查再动」查毕不动码）；#177 已 v9.68 交付在案（回帖在）。
- **修复**：R82 v9.83 批量版本号替换误伤 tests/v778 断言（`M109\.82` 被 9.82→9.83 波及），基线红转绿。
- **教训在录**：①批量替换版本号须排除正则字面量段（v778 误伤根因）②e2e 手势前置件（三键导航默认关闭需 navbar-enabled 注入）③超时 schedule 在 ENTERING 落定后（e2e 等待量 +600ms）。

## R84（2026-11-05 00:00–01:00 +08）窗账

- **治理补关 ×45**：逐议题证据链核验后关单（R59 同款协议）——39 completed（#204/#203/#202/#201/#200/#199/#198/#197/#196/#195/#193/#190/#187/#186/#184/#177/#176/#173/#169/#168/#166/#165/#164/#162/#161/#158/#155/#152/#145/#132/#111/#98/#95/#36/#35/#34/#33/#20/#24，各附版本+commit+测试证据帖）+ 5 not_planned（#128/#134/#52/#51/#129 duplicate 从属，主导 #164/#166/#173/#157/#165 均已交付）+ #179（准入六条已并入 #18 §2.1）。议题池 108→63，恢复真实状态。
- **v9.86 = 75e6d9b · #110 媒体键 MediaSession 键盘映射**：aosp/media-keys.js 纯逻辑（MediaSessionStack.getPriorityList L374-411 三级仲裁双游标分段插入同构 + KeyEvent KEYCODE 六常量 + UI Events 八键全映射 + streamsToSessions 常驻会话/LRU 排布 + routeMediaAction 单目标路由）+ media-service dispatchMediaKey（真行为缺口修复：externalActive() 让「暂停但有曲目」覆盖层抢占「播放中」宿主 → 仲裁根治；宿主控制走 playHost/loadHostTrack 原生路径绕二段路由；快照读会话上报态）+ volume-dialog keydown 同源入口接线（#111 正交、repeat 守卫、#77-A 天然特性检测）+ __mediaKeys 钩子。vitest 3979/3979·208（+23）+ e2e-v110 9/9 + dist-smoke 40/40。
- **教训在录**：①paused 为原型 getter——sloppy 赋值静默失败，e2e stub 须 defineProperty；②仲裁输入用会话上报态（PlaybackState 语义）非 audio.paused 裸值（src 装载期瞬时回真）；③e2e 断网下外域 src error 污染播放态断言——原型补丁派发真实事件保 notify 链路；④e2e 需先 openAppById 产生 iframe 方可同源监听 MEDIA_COMMAND；⑤媒体键与 chord 语义正交（单键即时 ≠ 保持时长），共用 keydown 入口但消费即 return。
