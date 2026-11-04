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
- **v9.87 = 96992ff · #118 MediaSession artwork 封面全链路**（加餐，#192 规则顺延）：media-meta artworkFromTrack 纯函数 + importLocalAudio 内嵌封面解析（parseAudioMeta 复用零新增解析器，objectURL 同桶登记/淘汰同 revoke）+ external coverUrl 上报通道（缺省维持不清空）+ syncMediaSession artwork 外部优先 + 通知胶囊真封面渲染（16px 圆角 object-fit 零裸色）。vitest 3989/3989·208（+10）+ e2e-v118 4/4 + dist-smoke 40/40。坑：APIC data.length>32 门（测试封面字节 ≥33）。
- **补关回执**：#118 交付帖+关单 completed；#18 加餐帖在录。窗终账：两版本（v9.86/v9.87）+ 治理补关 ×45，议题池 108→61。

## R85 窗（2026-11-05 02:00 +08）

- **沙箱校准**：本地=远端=7773d49（R84 窗终 v9.87 完好在库，零丢失）；PAT A 200 有效；基线复跑 4018 全绿（含 v9.88 新增 29）
- **版本账勘误**：R84 两版未滚 package.json/README（停 9.85.0）+ 42 处版本真源断言体漏滚——本窗 roll 9.87→9.88 补齐代码侧 + 9.85→9.88 补滚 142 文件（断言体/历史注释随惯例前滚），pkg=README=v9.88 单一真源恢复一致
- **v9.88 = · #116 iOS 音量 P0 地基：媒体 GainNode 音量链**：aosp/media-gain.js 纯逻辑（isSameOriginMediaSource 同源门控 R2 / createGainChain 建链 R1 一次性 / resolveGainVolume / resumeIfSuspended R3 / nextPlayableIndex 接管态切曲跳过）+ media-service 接线（play+loadHostTrack 双挂载点——loadHostTrack 直调 audio.play() 绕过 this.play() 为首跑 e2e 实踩 / 元素中性化恒 1 防双层衰减 0.6×0.6=0.36 / setVolume 双写分流 / 外链 blob 归一化机会性后台 fetch→objectURL / R2 污染守卫拒装跨域源 / 全池不可播停止语义）+ sound-haptics getSharedAudioContext 共享单例出口（#117 收编第一步）。iOS audio.volume 只读恒 1（Apple 官方实证）→ 本地/VFS 主路径 GainNode 真生效；外链跨域维持直连边界（CORS taint 静音防御，#117 归一化后收口）。测试：vitest 4018/4018·210（基线 3989+29）零回归 + tests/v116-media-gain.test.js 29 断言（门控矩阵/钳位/建链接线序/跳过环绕/接管真跑/双写分流/归一化成败面/源码锚）+ e2e-v116 5/5（真实 AudioContext float32 增益 0.6000000238 实证非桩 + 30s WAV 防 ended→next 切回外链实踩）+ build + check:dist（171 precache 自洽）+ dist-smoke 40/40。关联：#116（主作业交付）/ #115（路线裁决落地）/ #117（音频图全量收方向）/ #109 / #18 §2.1。
- **v9.89 = · #109 音量键目标流判定**（加餐，#192 规则顺延）：aosp/volume-target-stream.js 纯逻辑（getActiveStreamType 四档判定链 call>alarm>music(3s 活跃窗 #193 同口径)>ring + targetStreamIconState 分流图标 per-stream mute + clampStreamVolume）+ volume-dialog 接线（stepVolume/show/mute 三入口目标流重判——AOSP mActiveStream 动态跟踪同构；music 档既有安全警告守门链保持；ring 档写真源 settings:sound-v1 同键 + settings-sound-changed 事件设置页双向同步；图标分流 music 两态不回归 + ring_volume/ring_volume_off/alarm/call 段）。范围纪律（议题原文口径）：网页可复现 music/ring 两档全量落地；alarm/call 档判定链与图标态在位、输入占位 false（无通话引擎；闹钟响铃态在 clock-app iframe 内部无宿主事件面——桥接留单列）；安全警告守门为 STREAM_MUSIC 专属语义（SoundDoseHelper）。测试：全量 vitest 4034/4034·211（基线 4018+16）零回归 + tests/v109-volume-target-stream.test.js 16 断言（四档链/窗口边界开区间/图标分流/per-stream 钳位/happy-dom 真跑 D 组五项：ring 档图标+真源落值/事件同步/媒体活跃回 music/覆盖层播放位/真源缺省与非法 JSON 兜底/剥注释扫描锚）+ v193 静态锚重锚（stepVolume 路由分道后 music 守门语义保持）+ build + check:dist（171 precache）+ dist-smoke 40/40。窗终账：两版本（v9.88 #116 / v9.89 #109），池 61→59。
