# localStorage 键名注册表（#283 处置建议① 落地件）

> **数据真源**：`docs/audits/storage-keys-registry.json`（生成件单真源）← `node scripts/gen-storage-keys-registry.mjs`（再生）/ `--check`（逐字节校验）。本文为人读版，随树再生。
> 扫描口径：Pass1 直接调用点字面键 + Pass2 键常量定义（同文件须有 localStorage 访问）；排除 `apps/_shared/vendor/`（第三方库内部键：highlight/epub 等，非项目命名空间）、`dist/`、`*.test.*`。
> 卡面证据（v10.72，18 种）→ 本表（v11.37 #322 现值 **138 键**；#283 处置②六批收编 37+F 档豁免 2 + #322 新增命名空间键 1）：键名面随 41 应用+11 native 扩张增长 5.8 倍，四套并存问题面同步收窄——本表即处置②收编与③硬门禁的基线。

## 总账（v11.37 #322 现值：138 键）

| 分组 | 键数 | 说明 |
| --- | --- | --- |
| `ios-desktop:` | 94 | 主力命名空间（卡面 14 键 → 现 94 键；#283 六批收编 37 键 + #322 新增 icon-wave 功能键） |
| `settings:` | 6 | 设置域二级命名空间（`*-v1` 结构版本先例集中地） |
| `android17:` | 1 | 孤儿前缀（卡面在录，收编候选） |
| 非命名空间键 | 39 | **批次1+2+3+4a+4b+5 后 35 键仅存迁移回落引用**（见下注记），回落期收口后移出；裸键 + 卡面未载的新孤儿前缀（`media-output:` ×2 / `typing.` 点分 ×2 / `vd.` ×1 / `md3.` 点分 ×1）——**四套并存实为八套形态** |

## `ios-desktop:` 命名空间（94 键）

| 键名 | 形态 | 文件 |
| --- | --- | --- |
| `ios-desktop:active-profile` | constant | `ios-desktop/js/profiles.js` |
| `ios-desktop:anim-preset` | constant | `ios-desktop/js/animation-presets.js` |
| `ios-desktop:anim-speed` | constant | `ios-desktop/js/animation-presets.js` |
| `ios-desktop:audio-resource-mode` | constant | `ios-desktop/js/apps/settings.js` |
| `ios-desktop:backup-rollback` | constant | `ios-desktop/js/data-backup.js` |
| `ios-desktop:battery-rates` | constant | `ios-desktop/js/battery-service.js` |
| `ios-desktop:battery-saver` | constant | `ios-desktop/js/apps/settings-battery.js` 等 2 文件 |
| `ios-desktop:battery-sim-level` | constant | `ios-desktop/js/battery-service.js` |
| `ios-desktop:bg-mode` | constant | `ios-desktop/js/bg-freeze.js` |
| `ios-desktop:calc-btn-font-v1` | constant | `ios-desktop/apps/calculator/index.html` |
| `ios-desktop:calc-state-v1` | constant | `ios-desktop/apps/calculator/index.html` |
| `ios-desktop:camera-gallery` | direct | `ios-desktop/apps/camera/index.html` + `ios-desktop/js/vfs.js` |
| `ios-desktop:clock-font-v1` | constant | `ios-desktop/apps/clock-app/app.mjs` |
| `ios-desktop:clock-state-v1` | direct | `ios-desktop/apps/clock-app/app.mjs`（v11.35 #283 批4b 收编旧裸键 android_clock_state；e2e 九脚本同键面） |
| `ios-desktop:contacts-density-v1` | constant | `ios-desktop/apps/contacts/index.html` |
| `ios-desktop:contacts-v1` | constant/direct | `ios-desktop/apps/contacts/index.html` 写端 + `ios-desktop/apps/phone/index.html` 读端回落（v11.35 #283 批4b 收编旧裸键 md3_contacts，双端同批） |
| `ios-desktop:data-version` | direct | `ios-desktop/js/data-backup.js` 等 2 文件 |
| `ios-desktop:desktop-prefs` | constant | `ios-desktop/js/desktop-prefs.js` |
| `ios-desktop:dev-fps` | constant | `ios-desktop/js/dev-options.js` |
| `ios-desktop:dev-no-anim` | constant | `ios-desktop/js/dev-options.js` |
| `ios-desktop:files-clean-freed-total` | direct | `ios-desktop/js/apps/files.js` |
| `ios-desktop:development-settings-enabled` | constant | `ios-desktop/js/apps/settings.js` |
| `ios-desktop:device-name` | constant | `ios-desktop/js/apps/settings.js` |
| `ios-desktop:dock-items` | constant | `ios-desktop/js/dock.js` |
| `ios-desktop:folders` | direct | `ios-desktop/js/dev-options.js` |
| `ios-desktop:fx-rates` | constant | `ios-desktop/apps/calculator/index.html` |
| `ios-desktop:haptics-enabled` | constant | `ios-desktop/js/sound-haptics.js` |
| `ios-desktop:keypress-enabled` | constant | `ios-desktop/js/sound-haptics.js` |
| `ios-desktop:lock-quote-cache` | constant | `ios-desktop/js/lock-quotes.js` |
| `ios-desktop:lock-quote-online` | constant/direct | `ios-desktop/js/apps/settings.js` 等 2 文件 |
| `ios-desktop:midi-history-v1` | constant | `ios-desktop/apps/midi-player/app.mjs` |
| `ios-desktop:midi-last-v1` | constant | `ios-desktop/js/midi-player-core.js` |
| `ios-desktop:monet-enabled` | constant | `ios-desktop/js/theme-engine.js` |
| `ios-desktop:monet-seed` | constant | `ios-desktop/js/theme-engine.js` |
| `ios-desktop:navbar-enabled` | constant | `ios-desktop/js/nav-bar.js` |
| `ios-desktop:navbar-pos` | constant | `ios-desktop/js/nav-bar.js` |
| `ios-desktop:notes-memos` | direct | `ios-desktop/apps/notes/index.html`（v11.36 #283 批5 收编旧裸键 memos，直读形态常数化 MEMOS_KEY） |
| `ios-desktop:icon-wave` | constant | `ios-desktop/js/dev-options.js`（#322 图标波浪场开关：默认开/'0'关；消费面 app-window-parallel.js prepareRadialField 入口闸） |
| `ios-desktop:notifications` | constant/direct | `ios-desktop/js/apps/settings.js` 等 2 文件 |
| `ios-desktop:ocr-state-v1` | constant | `ios-desktop/js/ocr-core.js` |
| `ios-desktop:pages-apps` | direct | `ios-desktop/js/dev-options.js` 等 2 文件 |
| `ios-desktop:palette` | direct | `ios-desktop/js/video-wallpaper.js` |
| `ios-desktop:permissions` | constant | `ios-desktop/js/permissions.js` |
| `ios-desktop:pinned-cities` | constant | `ios-desktop/js/at-a-glance.js` |
| `ios-desktop:procedural-wallpaper` | constant/direct | `ios-desktop/js/procedural-wallpaper.js` 等 2 文件 |
| `ios-desktop:profiles` | constant | `ios-desktop/js/profiles.js` |
| `ios-desktop:removed-apps` | constant/direct | `ios-desktop/js/apps/settings.js` 等 6 文件 |
| `ios-desktop:reminders-groups` | direct | `ios-desktop/apps/reminders/index.html`（v11.36 #283 批5 收编旧裸键 md3_groups，直读形态常数化 GROUPS_KEY） |
| `ios-desktop:reminders-tasks` | direct | `ios-desktop/apps/reminders/index.html`（v11.36 #283 批5 收编旧裸键 md3_tasks，直读形态常数化 TASKS_KEY） |
| `ios-desktop:ringer-mode` | constant | `ios-desktop/js/sound-haptics.js` |
| `ios-desktop:sfx-volume` | constant | `ios-desktop/js/sound-haptics.js` |
| `ios-desktop:sound-enabled` | constant | `ios-desktop/js/sound-haptics.js` |
| `ios-desktop:split-groups` | constant/direct | `ios-desktop/js/recent-apps.js` 等 3 文件 |
| `ios-desktop:statusbar-battery-percent` | constant/direct | `ios-desktop/js/apps/settings-battery.js` 等 2 文件 |
| `ios-desktop:statusbar-icon-blocklist` | constant | `ios-desktop/js/apps/settings-pages/statusbar.js` 等 2 文件 |
| `ios-desktop:terminal-history` | constant | `ios-desktop/apps/terminal/index.html` |
| `ios-desktop:translate-history` | direct | `ios-desktop/apps/translate/index.html`（v11.36 #283 批5 收编旧裸键 translationHistory，直读形态常数化 HISTORY_KEY） |
| `ios-desktop:translate-visited` | direct | `ios-desktop/apps/translate/index.html`（v11.36 #283 批5 收编旧裸键 visited，直读形态常数化 VISITED_KEY） |
| `ios-desktop:theme-color-custom` | constant | `ios-desktop/js/theme-engine.js` |
| `ios-desktop:theme-hue` | direct | `ios-desktop/js/theme-engine.js` 等 2 文件 |
| `ios-desktop:theme-mode` | constant | `ios-desktop/js/theme-mode.js` |
| `ios-desktop:unlock-anim-style` | constant/direct | `ios-desktop/js/apps/settings.js` 等 2 文件 |
| `ios-desktop:video-wallpaper` | direct | `ios-desktop/js/procedural-wallpaper.js` |
| `ios-desktop:volume-side` | direct | `ios-desktop/js/apps/settings.js` |
| `ios-desktop:wallpaper` | direct | `ios-desktop/js/profiles.js` 等 3 文件 |
| `ios-desktop:wallpaper-blur` | constant | `ios-desktop/js/desktop-blur.js` |
| `ios-desktop:dice-lab-stats` | constant | `ios-desktop/apps/dice/index.html` |
| `ios-desktop:flow11-best` | constant | `ios-desktop/apps/flow11/index.html` |
| `ios-desktop:flow11-powerups` | constant | `ios-desktop/apps/flow11/index.html` |
| `ios-desktop:flow11-vol-v1` | constant | `ios-desktop/apps/flow11/index.html` |
| `ios-desktop:launch-seed-hue` | constant | `launch.html` |
| `ios-desktop:threes-hi` | constant | `ios-desktop/apps/threes/index.html` |
| `ios-desktop:threes-records` | constant | `ios-desktop/apps/threes/index.html` |
| `ios-desktop:typing-best-v1` | constant | `ios-desktop/apps/typing/index.html` |
| `ios-desktop:media-output:active` | constant | `ios-desktop/js/volume-dialog.js` |
| `ios-desktop:media-output:spatial` | constant | `ios-desktop/js/volume-dialog.js` |
| `ios-desktop:ocr-res-font-v1` | constant | `ios-desktop/apps/ocr/app.mjs` |
| `ios-desktop:one-handed-timeout-v1` | constant | `ios-desktop/js/one-handed.js` |
| `ios-desktop:stt-history` | constant | `ios-desktop/apps/stt/index.html` |
| `ios-desktop:tb-transient-edu` | constant | `ios-desktop/js/taskbar-transient.js` |
| `ios-desktop:weather-loc-v1` | constant | `ios-desktop/apps/weather/index.html` |
| `ios-desktop:weather-relocate-min-v1` | constant | `ios-desktop/apps/weather/index.html` |
| `ios-desktop:calevents-v1` | constant/direct | `ios-desktop/apps/calendar/index.html` 写端 + `ios-desktop/apps/clock-app/app.mjs` 读端回落 |
| `ios-desktop:calnotes-v2` | constant | `ios-desktop/apps/calendar/index.html` 写端 + `ios-desktop/js/cal-sync.js` 读端回落 |

| `ios-desktop:books-progress-v1` | constant | `ios-desktop/apps/books/index.html` |
| `ios-desktop:books-settings-v1` | constant | `ios-desktop/apps/books/index.html` |
| `ios-desktop:messages-bots-v1` | constant | `ios-desktop/apps/messages/index.html`（v11.35 #283 批4b 收编旧裸键 md3_messages_bots_v1；e2e 三脚本同键面） |
| `ios-desktop:messages-rooms-v1` | constant | `ios-desktop/apps/messages/index.html` |
| `ios-desktop:messages-state-v1` | constant | `ios-desktop/apps/messages/index.html` |
| `ios-desktop:music-prefs-v1` | constant | `ios-desktop/apps/music/index.html` |
| `ios-desktop:safari-session-v1` | constant | `ios-desktop/apps/safari/index.html` |
| `ios-desktop:stocks-prefs-v1` | constant | `ios-desktop/apps/stocks/index.html` |
| `ios-desktop:typing-fontsize-v1` | constant | `ios-desktop/apps/typing/index.html` |
| `ios-desktop:ripple-config-v1` | constant | `ios-desktop/js/apps/settings-ripple.js` |

## `settings:` 域（6 键）

| 键名 | 形态 | 文件 |
| --- | --- | --- |
| `settings:accessibility-v1` | constant | `ios-desktop/js/apps/settings.js` |
| `settings:accounts-v1` | constant | `ios-desktop/js/apps/settings-pages/accounts.js` |
| `settings:display-v1` | constant/direct | `ios-desktop/js/aod-ui.js` 等 2 文件 |
| `settings:location-v1` | constant | `ios-desktop/js/apps/settings.js` |
| `settings:notifications-v1` | constant | `ios-desktop/js/apps/settings.js` |
| `settings:sound-v1` | constant | `ios-desktop/js/apps/settings.js` 等 2 文件 |

## `android17:` 孤儿前缀（1 键）

| 键名 | 形态 | 文件 |
| --- | --- | --- |
| `android17:shadeMode` | constant/direct | `ios-desktop/js/apps/settings.js` 等 2 文件 |

## 非命名空间键（39 键 · 处置②收编候选池；其中 37 键已收编、字面仅存迁移回落引用）

| 键名 | 形态 | 文件 | 收编注记 |
| --- | --- | --- | --- |
| `android_clock_state` | direct | `ios-desktop/apps/clock-app/app.mjs` | 裸键 → 建议 `ios-desktop:*`；**v11.35 #283 批次4b 已收编**（主键 `ios-desktop:clock-state-v1`，常量 `CLOCK_STATE_KEY`；直读形态常数化：装载读/save 写/onRefresh 重读三落点全走常量，迁移 IIFE 先于装载首读=时序防线；storage-stats 规则改新名并前移通用规则前=批2 顺序陷阱兑现；e2e 九脚本 30 处字面直灌新键）；本行字面仅存迁移回落引用，回落期结束随收口批次移出候选池 |
| `calevents_v1` | constant/direct | `ios-desktop/apps/calendar/index.html` | **v11.34 #283 批次4a 已收编**（主键 `ios-desktop:calevents-v1`，常量 `EV_DB_KEY`；共享键双端同批：读端主读新键+旧键回落（v11.17 vfs.js 先例），写端迁移 IIFE）；本行字面仅存迁移回落引用，回落期结束随收口批次移出候选池 |
| `calnotes_v2` | constant | `ios-desktop/apps/calendar/index.html` | **v11.34 #283 批次4a 已收编**（主键 `ios-desktop:calnotes-v2`，常量 `DB_KEY/CAL_DB_KEY`；共享键双端同批：读端主读新键+旧键回落（v11.17 vfs.js 先例），写端迁移 IIFE）；本行字面仅存迁移回落引用，回落期结束随收口批次移出候选池 |
| `dice_lab_stats` | direct | `ios-desktop/apps/dice/index.html` | **v11.32 #283 批次2 已收编**（主键 `ios-desktop:dice-lab-stats`，常量 `STATS_KEY`）；本行字面仅存迁移回落引用（回落读 + 搬移 + 清除），回落期结束随收口批次移出候选池 |
| `files_clean_freed_total` | direct | `ios-desktop/js/apps/files.js` | **v11.17 #283 已收编**（主键 `ios-desktop:files-clean-freed-total`）；本行字面仅存迁移回落引用（回落读+搬移+清除），回落期结束随②批移出候选池 |
| `flow11_best` | direct | `ios-desktop/apps/flow11/index.html` | **v11.32 #283 批次2 已收编**（主键 `ios-desktop:flow11-best`，常量 `FLOW_BEST_KEY`）；本行字面仅存迁移回落引用（回落读 + 搬移 + 清除），回落期结束随收口批次移出候选池 |
| `flow11_powerups` | direct | `ios-desktop/apps/flow11/index.html` | **v11.32 #283 批次2 已收编**（主键 `ios-desktop:flow11-powerups`，常量 `FLOW_POWERUPS_KEY`）；本行字面仅存迁移回落引用（回落读 + 搬移 + 清除），回落期结束随收口批次移出候选池 |
| `flow11-vol-v1` | direct | `ios-desktop/apps/flow11/index.html` | **v11.32 #283 批次2 已收编**（主键 `ios-desktop:flow11-vol-v1`，常量 `FLOW_VOL_KEY`）；本行字面仅存迁移回落引用（回落读 + 搬移 + 清除），回落期结束随收口批次移出候选池 |
| `launch-seed-hue` | direct | `launch.html` | **v11.32 #283 批次2 已收编**（主键 `ios-desktop:launch-seed-hue`，常量 `SEED_HUE_KEY`）；本行字面仅存迁移回落引用（回落读 + 搬移 + 清除），回落期结束随收口批次移出候选池 |
| `md3_books_progress_v1` | constant | `ios-desktop/apps/books/index.html` | 应用域裸键 → 建议 `ios-desktop:<app>-*`（#178 数据孤岛维度） | **v11.26 #283 批次1 已收编**（主键 `ios-desktop:books-progress-v1`，常量 `BOOKS_PROGRESS_KEY`）；本行字面仅存迁移回落引用（回落读 + 搬移 + 清除），回落期结束随收口批次移出候选池 |
| `md3_books_settings_v1` | constant | `ios-desktop/apps/books/index.html` | 应用域裸键 → 建议 `ios-desktop:<app>-*`（#178 数据孤岛维度） | **v11.26 #283 批次1 已收编**（主键 `ios-desktop:books-settings-v1`，常量 `BOOKS_SETTINGS_KEY`）；本行字面仅存迁移回落引用（回落读 + 搬移 + 清除），回落期结束随收口批次移出候选池 |
| `md3_contacts` | constant/direct | `ios-desktop/apps/contacts/index.html` | 应用域裸键 → 建议 `ios-desktop:<app>-*`（#178 数据孤岛维度）；**v11.35 #283 批次4b 已收编**（主键 `ios-desktop:contacts-v1`，常量 `KEY`；共享键双端同批：写端 contacts 迁移 IIFE + 读端 phone readContacts 主读新键+旧键回落不清除（批4a loadAgenda 先例同款）；e2e 零字面在案）；本行字面仅存迁移回落引用，回落期结束随收口批次移出候选池 |
| `md3_groups` | direct | `ios-desktop/apps/reminders/index.html` | 应用域裸键 → 建议 `ios-desktop:<app>-*`（#178 数据孤岛维度）；**v11.36 #283 批次5 已收编**（主键 `ios-desktop:reminders-groups`，常量 `GROUPS_KEY`；直读形态常数化：装载读/save 写/onRefresh 重读三落点全走常量，迁移 IIFE 先于装载首读；与 md3_tasks 同文件双键同批）；本行字面仅存迁移回落引用，回落期结束随收口批次移出候选池 |
| `md3_messages_bots_v1` | constant | `ios-desktop/apps/messages/index.html` | 应用域裸键 → 建议 `ios-desktop:<app>-*`（#178 数据孤岛维度）；**v11.35 #283 批次4b 已收编**（主键 `ios-desktop:messages-bots-v1`，常量 `BOT_STATE_KEY`；单端写读，批1 MSG/ROOM_STATE_KEY 同款迁移 IIFE；e2e 三脚本 21 处字面直灌新键——probe-v856-dispatch 为 ref-map 漏项全库 rg 复核自纠）；本行字面仅存迁移回落引用，回落期结束随收口批次移出候选池 |
| `md3_messages_rooms_v1` | constant | `ios-desktop/apps/messages/index.html` | 应用域裸键 → 建议 `ios-desktop:<app>-*`（#178 数据孤岛维度） | **v11.26 #283 批次1 已收编**（主键 `ios-desktop:messages-rooms-v1`，常量 `ROOM_STATE_KEY`）；本行字面仅存迁移回落引用（回落读 + 搬移 + 清除），回落期结束随收口批次移出候选池 |
| `md3_messages_state_v1` | constant | `ios-desktop/apps/messages/index.html` | 应用域裸键 → 建议 `ios-desktop:<app>-*`（#178 数据孤岛维度） | **v11.26 #283 批次1 已收编**（主键 `ios-desktop:messages-state-v1`，常量 `MSG_STATE_KEY`）；本行字面仅存迁移回落引用（回落读 + 搬移 + 清除），回落期结束随收口批次移出候选池 |
| `md3_music_prefs_v1` | constant | `ios-desktop/apps/music/index.html` | 应用域裸键 → 建议 `ios-desktop:<app>-*`（#178 数据孤岛维度） | **v11.26 #283 批次1 已收编**（主键 `ios-desktop:music-prefs-v1`，常量 `MUSIC_PREFS_KEY`）；本行字面仅存迁移回落引用（回落读 + 搬移 + 清除），回落期结束随收口批次移出候选池 |
| `md3_safari_session_v1` | constant | `ios-desktop/apps/safari/index.html` | 应用域裸键 → 建议 `ios-desktop:<app>-*`（#178 数据孤岛维度） | **v11.26 #283 批次1 已收编**（主键 `ios-desktop:safari-session-v1`，常量 `SESSION_KEY`）；本行字面仅存迁移回落引用（回落读 + 搬移 + 清除），回落期结束随收口批次移出候选池 |
| `md3_stocks_prefs_v1` | constant | `ios-desktop/apps/stocks/index.html` | 应用域裸键 → 建议 `ios-desktop:<app>-*`（#178 数据孤岛维度） | **v11.26 #283 批次1 已收编**（主键 `ios-desktop:stocks-prefs-v1`，常量 `PREFS_KEY`）；本行字面仅存迁移回落引用（回落读 + 搬移 + 清除），回落期结束随收口批次移出候选池 |
| `md3_tasks` | direct | `ios-desktop/apps/reminders/index.html` | 应用域裸键 → 建议 `ios-desktop:<app>-*`（#178 数据孤岛维度）；**v11.36 #283 批次5 已收编**（主键 `ios-desktop:reminders-tasks`，常量 `TASKS_KEY`；直读形态常数化同 GROUPS_KEY 五落点）；本行字面仅存迁移回落引用，回落期结束随收口批次移出候选池 |
| `md3_weather_loc_v1` | constant | `ios-desktop/apps/weather/index.html` | **v11.33 #283 批次3 已收编**（主键 `ios-desktop:weather-loc-v1`，常量 `LOC_KEY`）；本行字面仅存迁移回落引用（回落读 + 搬移 + 清除），回落期结束随收口批次移出候选池 |
| `md3_weather_relocate_min_v1` | constant | `ios-desktop/apps/weather/index.html` | **v11.33 #283 批次3 已收编**（主键 `ios-desktop:weather-relocate-min-v1`，常量 `REFRESH_KEY`）；本行字面仅存迁移回落引用（回落读 + 搬移 + 清除），回落期结束随收口批次移出候选池 |
| `md3.tbTransientEdu` | constant | `ios-desktop/js/taskbar-transient.js` | **v11.33 #283 批次3 已收编**（主键 `ios-desktop:tb-transient-edu`，常量 `EDU_KEY`）；本行字面仅存迁移回落引用（回落读 + 搬移 + 清除），回落期结束随收口批次移出候选池 |
| `media-output:active` | constant | `ios-desktop/js/volume-dialog.js` | **v11.33 #283 批次3 已收编**（主键 `ios-desktop:media-output:active`，常量 `MO_ACTIVE_KEY`）；本行字面仅存迁移回落引用（回落读 + 搬移 + 清除），回落期结束随收口批次移出候选池 |
| `media-output:spatial` | constant | `ios-desktop/js/volume-dialog.js` | **v11.33 #283 批次3 已收编**（主键 `ios-desktop:media-output:spatial`，常量 `MO_SPATIAL_KEY`）；本行字面仅存迁移回落引用（回落读 + 搬移 + 清除），回落期结束随收口批次移出候选池 |
| `memos` | direct | `ios-desktop/apps/notes/index.html` | 应用域裸键 → 建议 `ios-desktop:<app>-*`（#178 数据孤岛维度）；**v11.36 #283 批次5 已收编**（主键 `ios-desktop:notes-memos`，常量 `MEMOS_KEY`；直读形态常数化：装载读/save 写/onRefresh 重读三落点全走常量，迁移 IIFE 先于装载首读）；本行字面仅存迁移回落引用，回落期结束随收口批次移出候选池 |
| `ocr-res-font-v1` | constant | `ios-desktop/apps/ocr/app.mjs` | **v11.33 #283 批次3 已收编**（主键 `ios-desktop:ocr-res-font-v1`，常量 `KEY`）；本行字面仅存迁移回落引用（回落读 + 搬移 + 清除），回落期结束随收口批次移出候选池 |
| `one_handed_timeout_v1` | constant | `ios-desktop/js/one-handed.js` | **v11.33 #283 批次3 已收编**（主键 `ios-desktop:one-handed-timeout-v1`，常量 `TIMEOUT_STORAGE_KEY`）；本行字面仅存迁移回落引用（回落读 + 搬移 + 清除），回落期结束随收口批次移出候选池 |
| `pixel_camera_gallery` | direct | `ios-desktop/apps/camera/index.html` | **v11.17 #283 已收编**（主键 `ios-desktop:camera-gallery`，消费面 camera/vfs.js）；本行字面仅存迁移回落引用，回落期结束随②批移出候选池 |
| `rippleCfg_v1` | constant | `ios-desktop/js/apps/settings-ripple.js` | 裸键 → 建议 `ios-desktop:*` | **v11.26 #283 批次1 已收编**（主键 `ios-desktop:ripple-config-v1`，常量 `RIPPLE_CFG_KEY`）；本行字面仅存迁移回落引用（回落读 + 搬移 + 清除），回落期结束随收口批次移出候选池 |
| `sttHistory` | constant | `ios-desktop/apps/stt/index.html` | **v11.33 #283 批次3 已收编**（主键 `ios-desktop:stt-history`，常量 `ST_HIST_KEY`）；本行字面仅存迁移回落引用（回落读 + 搬移 + 清除），回落期结束随收口批次移出候选池 |
| `threes_hi` | direct | `ios-desktop/apps/threes/index.html` | **v11.32 #283 批次2 已收编**（主键 `ios-desktop:threes-hi`，常量 `HI_KEY`）；本行字面仅存迁移回落引用（回落读 + 搬移 + 清除），回落期结束随收口批次移出候选池 |
| `threes_records` | direct | `ios-desktop/apps/threes/index.html` | **v11.32 #283 批次2 已收编**（主键 `ios-desktop:threes-records`，常量 `RECORDS_KEY`）；本行字面仅存迁移回落引用（回落读 + 搬移 + 清除），回落期结束随收口批次移出候选池 |
| `translationHistory` | direct | `ios-desktop/apps/translate/index.html` | 应用域裸键 → 建议 `ios-desktop:<app>-*`（#178 数据孤岛维度）；**v11.36 #283 批次5 已收编**（主键 `ios-desktop:translate-history`，常量 `HISTORY_KEY`；直读形态常数化：装载读/save/清空 removeItem/onRefresh/VFS 镜像回写五落点全走常量，迁移 IIFE 先于装载首读；e2e-v177 读取面同批直灌）；本行字面仅存迁移回落引用，回落期结束随收口批次移出候选池 |
| `typing.best.v1` | constant | `ios-desktop/apps/typing/index.html` | **v11.32 #283 批次2 已收编**（主键 `ios-desktop:typing-best-v1`，常量 `BEST_KEY`）；本行字面仅存迁移回落引用（回落读 + 搬移 + 清除），回落期结束随收口批次移出候选池 |
| `typing.fontsize.v1` | constant | `ios-desktop/apps/typing/index.html` | 点分命名（typing 应用）→ 建议 `ios-desktop:typing-*` | **v11.26 #283 批次1 已收编**（主键 `ios-desktop:typing-fontsize-v1`，常量 `FONT_KEY`）；本行字面仅存迁移回落引用（回落读 + 搬移 + 清除），回落期结束随收口批次移出候选池 |
| `vd.safety.confirmed` | constant | `ios-desktop/js/volume-dialog.js` | 点分命名（volume-dialog）→ 建议 `ios-desktop:vd-*` 或并入 media-output 组；**v11.36 #283 批次5 语义裁决：豁免登记不收编**——实读实证 volume-dialog.js :240/:266 全走 **sessionStorage**（非 localStorage 键，e2e-v117/v193 同口径），`_localforage_support_test` 注记豁免先例同款；键名维持零改动，bare 计数如实维持至生成器支持键级豁免 |
| `visited` | direct | `ios-desktop/apps/translate/index.html` | 应用域裸键 → 建议 `ios-desktop:<app>-*`（#178 数据孤岛维度）；**v11.36 #283 批次5 已收编**（主键 `ios-desktop:translate-visited`，常量 `VISITED_KEY`；直读形态常数化：首访判定+双写三落点全走常量，迁移 IIFE 先于首访判定；零测试锚零 e2e 依赖）；本行字面仅存迁移回落引用，回落期结束随收口批次移出候选池 |
| `wallpaper-video-blob` | constant | `ios-desktop/js/video-wallpaper.js` | 裸键 → 建议 `ios-desktop:*`；**v11.36 #283 批次6a 语义裁决：豁免登记不收编**——实读确证纯 **IndexedDB 键**（video-wallpaper.js :32 `VIDEO_IDB_KEY`；:398/:440/:468 全走 idbSet/idbDel/idbGet；procedural-wallpaper.js:385 idbDel 同键；storage-stats.js:56 已在 IDB_OWNER_RULES 归 `__system`），生成器 Pass2 因同文件 localStorage 访问误捕进 bare；vd.safety.confirmed 批 5 注记豁免先例同款，键名维持零代码改动 |

## 处置建议映射（卡面三条 · 本卷落地边界）

1. **① 注册表**：✅ 本卷落地（生成件 + 本文，`--check` 逐字节防腐闸；owner 列以首见文件路径推定，权威归属随②收编批逐键确认）。
2. **② 裸键收编**：**已开工**（v11.17 #283 首两键落地：`files_clean_freed_total`→`ios-desktop:files-clean-freed-total`、`pixel_camera_gallery`→`ios-desktop:camera-gallery`，收编带一次性迁移读：旧键兼容读+搬移+写新键；`_localforage_support_test` 建议注记豁免不收编）。其余 37 键留主任务窗施工，本表「收编注记」列即逐键建议草案，终审权留用户（#284 §3 同律）。
3. **③ audit 评分卡检测**：留②收编后开启硬门禁（现值非命名空间键如实登记不拦截——先收编后门禁，防开工即红）。

## 诚实边界

- Pass2 为键常量启发式（`*KEY* = 'literal'` 且同文件有 localStorage 访问），非键常量的字符串常量误入率由形态过滤（无空格/无插值/命名空间或 snake/hyphen 形态）压低但不为零——`--check` 保证登记面与扫描器确定性一致，语义级误报随②收编批逐键核。
- `ios-desktop:cdn-health:` 尾冒号拼接形态（运行时拼子键）如实登记为一个条目，展开面留②批。
- vendor 库（highlight/epub）内部 localStorage 使用不在本表（排除口径见头注）。
