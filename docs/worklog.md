# worklog

## R83（2026-11-04 22:00–23:20 +08）窗账

- **v9.84 = 3bde2d0 · #204 单手模式 AOSP OneHanded 全机制**：aosp/one-handed.js 纯逻辑（wmshell main 实拉：状态机 NONE/ENTERING/ACTIVE/EXITING + 加固迁移表、offset 40% 勘误议题 33%、超时 NEVER/4/8/12s 默认 MEDIUM、触摸区域 round(y)<boundsTop + stop 一次门）+ one-handed.js DOM 面（#desktop translateY 338px 600ms decel + 退出三通道 上滑/点外部/超时 + __oneHanded 钩子）+ 接线三件（QS 磁贴 toggle / 编辑器目录 600px 隐藏 / nav-bar 下拉进入上滑退出）。vitest 3949/3949·206（+32）+ e2e-v984 14/14 + dist-smoke 40/40。
- **v9.85 = 10853c8 · #152 启动页谷歌开机动画**：launch.html .gboot 四色圆点（品牌规范色豁免在录）跳跃循环 2.4s 收敛淡出 + reduced-motion 静态点阵退化。vitest 3956/3956·207（+7）+ 无头冒烟（四色 RGB/收敛/零外链）。
- **补锚**：#161（v9.75 随 #158 落地的裁决实施补录帖 6633565621）。
- **查证裁决**：#185 弱密码启发式前置不成立（md3 锁屏无密码体系，议题自身「先查再动」查毕不动码）；#177 已 v9.68 交付在案（回帖在）。
- **修复**：R82 v9.83 批量版本号替换误伤 tests/v778 断言（`M109\.82` 被 9.82→9.83 波及），基线红转绿。
- **教训在录**：①批量替换版本号须排除正则字面量段（v778 误伤根因）②e2e 手势前置件（三键导航默认关闭需 navbar-enabled 注入）③超时 schedule 在 ENTERING 落定后（e2e 等待量 +600ms）。
