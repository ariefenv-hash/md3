# #283 处置② · 37 裸键收编工程：全貌取证、风险分层与分批计划

> 2026-11-14 · 实树 v11.26 · 报告件（非生成件）
> 输入：`docs/storage-keys-registry.md` 非命名空间段 39 行 − v11.17 已收编 2 键 = **37 键待收编**。
> 方法：`recon283.mjs` 逐键全库扫描（源码 + 测试 + e2e 脚本），产物 `docs/audits/storage-keys-ref-map.md`（411 行逐条引用点）。
> 结论先行：**不一次全清**。一次改完会撞上 #235 式连红，且 localStorage 键名是用户数据面，漏一处即数据孤岛。

## 一、实测全貌（与登记口径的偏差）

| 项 | 登记时估计 | 实测 |
| --- | --- | --- |
| 待收编键 | 37 | 37 |
| 源码引用点 | 「面较散但范式成熟」 | **150 处** |
| 测试字面锚 | 未计 | **84 处** |
| 涉及无头 e2e 脚本 | 未计 | **20+ 个**（`e2e-v157/v158/v181/v856/...`） |
| 跨应用共享键 | 未计 | **4 组** |

**三处口径发现**（本批最有价值的部分，会改变后续怎么改）：

1. **`wallpaper-video-blob` 根本不是 localStorage 键** —— `video-wallpaper.js:32` 是 `export const VIDEO_IDB_KEY`，`procedural-wallpaper.js:385` 用 `idbDel(...)`，`storage-stats.js` 也把它列在 `IDB_OWNER_RULES`。生成器 Pass2 因为「同文件有 localStorage 访问」把它误捕进 bare 组。**应豁免，不收编**。
2. **`vd.safety.confirmed` 是 `sessionStorage` 语义** —— `e2e-v117-audio-graph.mjs` / `e2e-v193-volume-safety.mjs` 全用 `sessionStorage.setItem/getItem`，而 `volume-dialog.js:85` 的常量在 localStorage 扫描面里。两种 storage 混在同一键名下，收编前必须先定语义。
3. **`visited` 侦察出现大量假阳性** —— `apps/_shared/vendor/*` 里的英文单词、`import-graph.test.js` 里的 `r.visited` 变量名都被字面匹配命中。真键只有 `translate/index.html` 3 处 + `storage-stats.js` 1 处。与 #274 的词表教训同构：**字面/词表只能当线索，必须逐条实读**。

## 二、风险分层（37 键逐键归档）

| 档 | 判据 | 键 | 处置 |
| --- | --- | --- | --- |
| **A** 零风险纯常量 | 单文件常量定义、0 测试锚、无共享、无 e2e 依赖 | `md3_books_progress_v1` `md3_books_settings_v1` `md3_messages_rooms_v1` `md3_messages_state_v1` `md3_music_prefs_v1` `md3_safari_session_v1` `md3_stocks_prefs_v1` `typing.fontsize.v1` | **批次 1 本批施工** |
| **A′** 双文件同键 | 常量在两个文件各一份、0 测试锚 | `rippleCfg_v1`（settings-ripple.js + charging-ripple.js） | **批次 1 同批**（双 IIFE 幂等） |
| **B** 单文件直写·轻锚 | direct 形态、测试锚 ≤2、无共享 | `dice_lab_stats` `flow11_best` `flow11_powerups` `flow11-vol-v1` `threes_hi` `threes_records` `launch-seed-hue` `ocr-res-font-v1` `one_handed_timeout_v1` `rippleCfg_v1`(已上调) `sttHistory` `typing.best.v1` `md3_weather_loc_v1` `md3_weather_relocate_min_v1` `md3.tbTransientEdu` `media-output:active` `media-output:spatial` | 批次 2–3，逐键同步测试锚 + e2e 脚本 |
| **C** 跨应用共享 | 写端与读端分属不同应用/模块 | `calevents_v1`（calendar 写 / clock-app 读）· `calnotes_v2`（calendar / cal-sync.js）· `md3_contacts`（contacts 写 / phone 读）· `md3_messages_bots_v1`（messages + 20 处 e2e）· `android_clock_state`（clock-app + 25 处 e2e） | 批次 4，**双端必须同批改**，否则 #175 数据孤岛复发 |
| **D** 测试硬锚密集 | 测试字面锚 ≥10 | `memos`(18) `visited`(11) `md3_groups`/`md3_tasks`(3/2，与 v219 归属测试耦合) `vd.safety.confirmed`(4) `translationHistory`(2 + m3e 锚) | 批次 5，**同步 `storage-stats.js` LS_OWNER_RULES 并重排前缀顺序** |
| **F** 误捕豁免 | 非 localStorage 键 / 语义待定 | `wallpaper-video-blob`（IDB 键）· `vd.safety.confirmed`（sessionStorage 混合，先定语义再归 B/D） | 登记豁免，不收编 |

> **LS_OWNER_RULES 的顺序陷阱**（批次 5 必读）：`ownerOf()` 是**前缀先匹配先返回**。所有键收编成 `ios-desktop:` 后，若具体规则排在 `['ios-desktop:', '__system']` 之后，会全部误归 `__system`；`tests/v219-app-data-registry.test.js` 的 `ownerOfLs(...)` 断言会连带全红。必须把具体规则整体前移。

## 三、收编范式（与 v11.17 首两键同款，零新增 API）

每处常量定义改值 + 紧跟一段幂等迁移 IIFE：

```js
const BOOKS_PROGRESS_KEY = 'ios-desktop:books-progress-v1';
// #283 处置②批次1：新键缺失时回落旧裸键并一次性搬移（旧键读写点已全库清零）
(function () { try {
  if (localStorage.getItem(BOOKS_PROGRESS_KEY) === null) {
    var old = localStorage.getItem('md3_books_progress_v1');
    if (old !== null) { localStorage.setItem(BOOKS_PROGRESS_KEY, old); localStorage.removeItem('md3_books_progress_v1'); }
  }
} catch (e) {} })();
```

- 读写点**全走常量，零改动**（这正是 A 档低风险的原因）
- 生成器 Pass2 捕获新键（constant 形态）→ `ios-desktop:` 组 +1；Pass1 捕获迁移 IIFE 里的旧键字面 → bare 组**如实保留**（如 v11.17 两键注记「仅存迁移回落引用，回落期结束移出候选池」）
- **因此 bare 计数不会因收编而下降**，下降要等「回落期结束、删除迁移 IIFE」的收口批次。这是设计使然，不是没做完 —— 交付帖必须讲清楚，否则会被误读成无效施工

## 四、批次计划与 DoD

| 批次 | 范围 | DoD |
| --- | --- | --- |
| **1（本批）** | A + A′ 共 **9 键 / 10 处常量** | 常量改值 + 10 段迁移 IIFE + 生成器/registry 再生 + 常青迁移回归测试 + 全量门禁 + dist 随树 |
| 2–3 | B 档 16 键 | 每键同步测试硬锚 + 对应 e2e 脚本字面，逐批全量 vitest |
| 4 | C 档 5 键 | 双端同批改 + 跨应用读写一致性无头验证（calendar→clock、contacts→phone） |
| 5 | D 档 6 键 | LS_OWNER_RULES 前移 + v219 测试同步 + 存储占用页归属回归 |
| 6 | F 档 + 收口 | 登记豁免；全批确认无遗漏后删除迁移 IIFE、bare 组真正清零；**③ 硬门禁才开启** |

**每批共同门禁**：`gen-storage-keys-registry.mjs --write` → A 档 16 生成件 `--check` → 静态闸 5 连 → 全量 vitest 分片 → `npm run build` + `verify-dist` + `check:dist-parity` → 单 commit 单交付帖。

## 五、#283 关单条件

| 建议 | 状态 |
| --- | --- |
| ① 注册表 | ✅ `d31f9212` |
| ② 37 键收编 | 🔶 本批 9 键（37 → **28**），剩 4 批 |
| ③ 裸键硬门禁 | ⬜ 必须等 ② 全清 + 回落期收口后再开（先开会「开工即红」） |

**本卡保持 `open` / `P2`**。

## 诚实边界

- 引用计数来自字面匹配，含假阳性（见 §一.3）；每批施工前仍须逐键实读确认。
- 迁移 IIFE 的安全性依赖「常量定义在所有读写之前」——A 档均为文件顶部常量，成立；B/C/D 档存在延迟读取，插入点需逐个确认，不能照搬。
- 本批未做浏览器真机迁移验证；用 vitest 的 mock localStorage 覆盖「旧键存在→搬移→删旧键→新键可读」链路。

关联：#283 #175 #178 #219 #240 #274 #291 `docs/storage-keys-registry.md` `scripts/gen-storage-keys-registry.mjs`
