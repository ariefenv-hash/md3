# 安卓16极客 · md3

> **网页版安卓 16 / Pixel 桌面模拟器** —— 纯前端 PWA，免安装、打开即玩。
> 32 个应用、锁屏、动态壁纸、Material Design 3 动态取色、弹簧物理动画、最近任务、下拉控制中心……
> **v7.52 新增「安装包」：导入 .mdapp/.zip 压缩包，自动识别图标与名称，权限透明安装成桌面应用**（见[第六章](#六安装包mdapp格式规范与应用安装器)）。

**[🖥️ 在线体验](https://ariefenv-hash.github.io/md3/)** · 纯静态部署，无任何后端 · 支持离线（Service Worker）

---

## 📑 目录

- [一、5 分钟跑起来（零基础）](#一5-分钟跑起来零基础)
- [二、本地开发（有前端基础）](#二本地开发有前端基础)
- [三、深度维护（贡献者）](#三深度维护贡献者)
- [四、FAQ 故障排查（症状 → 根因 → 解法）](#四faq-故障排查症状--根因--解法)
- [五、仓库结构](#五仓库结构)
- [六、安装包（.mdapp）格式规范与应用安装器](#六安装包mdapp格式规范与应用安装器)
- [七、来源与致谢](#七来源与致谢)

---

## 一、5 分钟跑起来（零基础）

### 准备：装一个「启动器」（二选一）

| 选项 | 说明 | 下载 |
|---|---|---|
| **Python 3**（推荐） | macOS / Linux 一般自带；Windows 安装时勾选 *Add to PATH* | [python.org/downloads](https://www.python.org/downloads/) |
| **Node.js ≥ 20.19** | 想用 npm 全家桶（开发 / 构建）就装这个 | [nodejs.org](https://nodejs.org/) |

> 只是想「跑起来看看」→ 装 Python 就够了，**不需要** Node、不需要 `npm install`。

### 方式一：双击启动（最省事）

| 系统 | 操作 |
|---|---|
| Windows | 双击仓库根目录的 **`start.bat`** |
| macOS / Linux | 终端执行 **`./start.sh`**（首次先 `chmod +x start.sh`） |

启动器会自动选端口、打印地址、尝试打开浏览器。

### 方式二：Python 一条命令

```bash
cd md3                      # 进入仓库根目录（含 index.html 的那一层）
python3 -m http.server 8080  # Windows 写法：python -m http.server 8080
```

浏览器打开 **http://localhost:8080/**

### 方式三：npm 一条命令

```bash
npm install      # 仅首次
npm start        # 零依赖静态服务器：自动选端口 + 自动开浏览器 + 禁用缓存
```

### ⚠️ 三条铁律（90% 的「跑不起来」都在这里）

1. **必须用 `http://` 访问，不能双击 `index.html`。** 本项目使用原生 ES Module，
   `file://` 协议会被浏览器 CORS 策略直接拦截 → 白屏。见 [FAQ-1](#faq-1双击-indexhtml-打不开--一片白)。
2. **服务器必须以「仓库根目录」为站点根**（即 `md3/` 这一层，含 `index.html`、`ios-desktop/`）。
   把 `ios-desktop/` 或它的子目录当根 → 桌面能出来、但点开应用是白板。见 [FAQ-2](#faq-2桌面正常但点开应用全是白底板).
3. **地址栏用 `localhost` 或 `127.0.0.1`。** 用局域网 IP 访问时 PWA / 离线缓存功能受限（浏览器安全策略），桌面本身不受影响。见 [FAQ-7](#faq-7想用手机真机体验).

---

## 二、本地开发（有前端基础）

```bash
git clone https://github.com/ariefenv-hash/md3.git
cd md3
npm install
```

### 常用命令

| 命令 | 作用 |
|---|---|
| `npm run dev` | Vite 开发服务器（默认 http://localhost:5173，改代码即时热更新） |
| `npm start` | 零依赖静态服务器（自动端口 + 自动开浏览器 + `no-store` 禁缓存） |
| `npm test` | Vitest 单元测试全量（纯逻辑层均可本地跑，当前约 220+ 项） |
| `npm run test:watch` | 测试监听模式 |
| `npm run typecheck` | `tsc --noEmit` 全量类型检查 |
| `npm run new-app weather-widget 天气小件` | 生成新子应用脚手架（模板 + 接入指引） |

### 源码地图（改什么去哪）

| 想改什么 | 去哪 |
|---|---|
| 桌面布局 / 图标 / 页面 | `ios-desktop/js/desktop.js` + `ios-desktop/js/apps/*.js`（32 个应用定义） |
| 应用窗口 / 弹簧动画 | `ios-desktop/js/app-window.js` + `js/spring.js` + `js/config.js` |
| 主题色 / 取色引擎 | `ios-desktop/js/theme-engine.js`（MD3 令牌生成） |
| 多任务（最近任务卡片） | `ios-desktop/js/recent-apps.js` |
| 手势（上滑 / 横滑切换 / 拖拽） | `ios-desktop/js/gestures.js` + `js/nav-bar.js` |
| 状态栏 / 锁屏 / 控制中心 | `js/status-bar.js` / `js/lock-screen.js` / `js/quick-settings.js` |
| 某个 iframe 应用本体 | `ios-desktop/apps/<应用名>/index.html`（21 个，单文件自包含） |
| 样式令牌 / 主题 CSS | `ios-desktop/css/md3-theme.css`（12 个 CSS 模块） |
| 安装包系统（v7.52） | `js/pkg/`（解析/存储/注册） + `js/apps/installer.js` + `js/pkg-sdk.js` + `sw.js` 托管路由 |

### URL 参数速查

| 参数 | 作用 |
|---|---|
| `?nolock=1` | 跳过锁屏直达桌面（调试利器） |
| `?swtest=1` | 强制注册 Service Worker（默认在自动化环境跳过） |

### 浏览器建议

用 Chrome / Edge **DevTools 设备模拟**，视口设为 **412 × 915**（Pixel 比例，本项目的目标形态）。
直接开桌面视口也能用，但部分手势与布局按移动端设计。

---

## 三、深度维护（贡献者）

### 构建产物 `dist/`

```bash
npm run build
```

- 产物在 `dist/`：根壳 + `ios-desktop/` 全量拷贝（HTML 压缩）+ 带构建 ID 的 `sw.js` + 预缓存清单；
- `vite.config.js` 中 `base: './'`（**相对路径**）→ dist 可部署到任意子路径的静态托管（GitHub Pages 项目页、Netlify、Vercel、Nginx 子目录均可），无需改配置。

### 部署到线上（GitHub Pages）

本项目采用 **Actions 自动部署**：

```
push 到 main 分支
  → Actions「Deploy to GitHub Pages」自动触发
  → vitest 全绿门禁（不过不让上）
  → vite build
  → dist/ 强推到 gh-pages 分支
  → Pages（Deploy from branch 模式）自动上线
```

- 全程 1~2 分钟；线上地址：https://ariefenv-hash.github.io/md3/
- 手动部署（不经 CI）：`npm run deploy:gh`（需本机有仓库推送权限）；
- 不想走 CI：仓库 Actions 页 → Deploy to GitHub Pages → **Run workflow** 手动触发。

### Service Worker 机制（改了代码必须懂的一层）

`sw.js` 采用 **cacheFirst（缓存优先）** 策略，版本号形如 `geek-v34-cacheFirst`：

- **改任何运行时代码（HTML/CSS/JS）无需手动递增 `sw.js` 里的 `VERSION`**：
  构建时 `__BUILD_ID__` 会被替换为本次构建 id，且 CACHE_NAME 已包含 BUILD_ID ——
  SW 字节差异自动触发更新，activate 时旧构建缓存整体清理；
  仅当需要强制全量重新预缓存（如调整预缓存清单本身）时才手动递增 VERSION；
- 本地开发时 `npm start` / `npm run dev` 已禁 HTTP 缓存，但 **SW 是独立的一层**，
  调试期可在 DevTools → Application → Service Workers 勾选 **Bypass for site** 或点 **Unregister**；
- 自动化环境（`navigator.webdriver`）默认跳过 SW 注册，`?swtest=1` 可强制。

### 项目约定

- **`改动说明.md`**：每个版本一节，记录改动文件 / 关键设计决策 / 验证记录——提交前请追加；
- **`ROADMAP.md`**：路线图与待办；
- **`tests/`**：单测与场景测试（Vitest + happy-dom），新逻辑请配套用例；
- 新应用用 `npm run new-app <name> <中文标题>` 起步，脚手架会打印接入指引。

---

## 四、FAQ 故障排查（症状 → 根因 → 解法）

### FAQ-1：双击 `index.html` 打不开 / 一片白

- **症状**：直接双击仓库里的 `index.html`，页面空白或只有黑底启动画面，控制台报 CORS / module 错误。
- **根因**：浏览器对 `file://` 协议下的 ES Module 有严格 CORS 限制（`js/main.js` 等模块全部加载失败）；
  Service Worker 也要求安全上下文（`https://` 或 `localhost`）。
- **解法**：改用任一启动方式——`start.bat` / `./start.sh` / `python3 -m http.server 8080` / `npm start`，
  然后访问 `http://localhost:8080`。**记住：这个项目没有「双击即开」的用法。**

### FAQ-2：桌面正常，但点开应用全是「白底板」

- **症状**：桌面、图标、状态栏都正常；一点应用，窗口里是一块白/空的圆角板子（DevTools Network 里 `apps/<应用名>/index.html` 返回 404）。
- **根因**：**站点根目录不对**。应用是以 iframe 相对路径 `apps/.../index.html` 嵌入的，
  如果服务器把 `ios-desktop/`（或更深层的目录）当成了站点根，相对路径就会整体漂移到不存在的位置。
  典型触发方式：VSCode Live Server 时打开的是子文件夹、手动 `cd ios-desktop && python3 -m http.server`。
- **解法**：
  1. 停掉当前服务，回到**仓库根目录**（`md3/`，和 `package.json` 同层）重新起服务；
  2. 用仓库自带 `start.sh` / `start.bat` / `npm start` 起服，它们自动锚定正确根目录；
  3. 验证：浏览器开 `http://localhost:8080/ios-desktop/apps/weather/index.html`，能直接打开天气应用页即根目录正确。

### FAQ-3：改了代码，浏览器里还是旧版本

- **症状**：源码明明改了，刷新后毫无变化。
- **根因**：两层缓存。① Service Worker 的 cacheFirst 策略（生产保护机制）；② HTTP 缓存（少见，`npm start` 已禁用）。
- **解法**：
  1. DevTools → Application → Service Workers → 勾选 **Bypass for site**（临时绕过，刷新即生效）；
  2. 或点 **Unregister** 后刷新（彻底注销 SW）；
  3. 若是发布新版本：SW 会随构建 id 自动更新（见[上文](#service-worker-机制改了代码必须懂的一层)），
     用户端 activate 时会自动清空旧缓存。

### FAQ-4：起服务报「端口被占用」

- **症状**：`OSError: [Errno 98] Address already in use`（macOS/Linux）或 `WinError 10048`（Windows）。
- **根因**：8080 端口上已经有别的进程（常见：上一次没关干净的服务、其他开发工具）。
- **解法**：
  1. 换端口最省事：`python3 -m http.server 8081` 或 `npm start -- --port 8081`；
  2. 或找到占用者处理：macOS/Linux `lsof -i :8080`；Windows `netstat -ano | findstr :8080` 再到任务管理器结束对应 PID；
  3. `start.sh` 与 `npm start` 会自动在 8080~8089 里挑空闲端口，基本遇不到这个错。

### FAQ-5：锁屏进不去 / 每次调试都想跳过锁屏

- **症状**：不知道怎么解锁，或嫌每次开页面都要滑一下。
- **根因**：默认展示锁屏（上滑解锁，没有密码），这是产品形态不是故障。
- **解法**：上滑解锁即可；调试场景直接用 `http://localhost:8080/?nolock=1` 跳过锁屏。

### FAQ-6：字体 / 图标和截图长得很不一样

- **症状**：中文字体、数字字体或个别图标观感不同。
- **根因**：项目唯一的外部资源是 Google Fonts；离线 / 内网 / 字体被墙时自动回退系统字体，图标主体为内联 SVG 不受影响。
- **解法**：无需处理，功能完全不受影响；介意观感可联网后强刷（Ctrl+Shift+R）。

### FAQ-7：想用手机真机体验

- **症状**：想在手机浏览器里玩，而不是电脑模拟器。
- **根因**：——（这是用法问题，不是故障）
- **解法**：
  1. 手机与电脑连**同一个 Wi-Fi**；
  2. 电脑上起服务时监听所有网卡：`npm start -- --port 8080` 之外再用 `python3 -m http.server 8080 --bind 0.0.0.0`（`start.sh` 默认只绑本机）；
  3. 电脑查局域网 IP（`ipconfig` / `ifconfig`），手机浏览器开 `http://<电脑IP>:8080`；
  4. 注意：非 localhost 的 http 地址上，浏览器禁用 Service Worker → **离线缓存 / 添加到主屏幕不可用**，桌面与应用全部功能正常；
  5. 正式版请直接用线上部署地址（https，PWA 完整可用）。

### FAQ-8：`npm install` / `npm run build` 失败

- **症状**：安装或构建报一堆错，或 vite 提示版本不支持。
- **根因**：构建链（Vite 7 / Vitest 3 / TypeScript）需要 **Node ≥ 20.19**；旧 Node（16/18）会直接不兼容。国内网络可能拉包超时。
- **解法**：
  1. `node -v` 确认版本，低了去 [nodejs.org](https://nodejs.org/) 升级（或用 nvm）；
  2. 网络问题换镜像：`npm config set registry https://registry.npmmirror.com`；
  3. 只想跑页面不想折腾 → 完全不需要 Node，用 Python 方式启动即可（见[方式二](#方式二python-一条命令)）；
  4. 实在不行：`dist/` 目录内已是构建好的完整产物，直接静态托管它也能跑。

### FAQ-9：push 到 GitHub 后线上没有更新

- **症状**：代码推上去了，Pages 网站还是老样子。
- **根因**：线上是 **gh-pages 分支的构建产物**，不是 main 的源码——必须等 Actions 把 main 构建后推到 gh-pages。
- **解法**：
  1. 仓库 **Actions** 页看「Deploy to GitHub Pages」是否绿勾（红叉点进去看日志，常见：vitest 挂了被门禁拦下）；
  2. 绿勾后等 1~2 分钟再强刷（Ctrl+Shift+R）——即便部署完成，SW 缓存也可能挡一层（见 FAQ-3）；
  3. 确认推的是 **main** 分支（CI 只监听 main）；
  4. 还是不行：Actions → Deploy to GitHub Pages → Run workflow 手动触发一次。

---

## 五、仓库结构

```
第1层  index.html              根壳：Splash 启动画面 + iframe 加载 /ios-desktop/index.html
                               + Service Worker 注册（?swtest=1 强制；自动化环境跳过）
       manifest.webmanifest    PWA 清单（可安装到手机桌面）
       sw.js                   Service Worker（geek-vN · cacheFirst · activate 清历史缓存）
       start.sh / start.bat    一键本地启动器（Python 优先 / Node 回退）
       scripts/serve.mjs       npm start 背后的零依赖静态服务器
       scripts/new-app.mjs     新应用脚手架 CLI

第2层  ios-desktop/index.html  桌面主文档（静态骨架 + 12 个 CSS + ES 入口 js/main.js）

第3层  ios-desktop/js/         65 个原生 ES Module（无框架、无打包器；含 pkg/ 安装包子系统）
       ├── main.js             初始化编排
       ├── app-window.js       应用窗口弹簧物理引擎
       ├── spring.js / config.js  弹簧参数与手势阈值
       ├── gestures.js         系统手势（上滑 / 底部横滑切换 / 拖拽）
       ├── recent-apps.js      多任务（卡片 / 连续缩放 / 快速切换）
       ├── theme-engine.js     MD3 动态取色
       ├── battery-service.js  电量单一真源（实测速率估算剩余/充满时长）
       └── apps/*.js           32 个应用定义（图标 / 名称 / 页面）

第4层  ios-desktop/apps/*/     21 个 iframe 子应用（单文件自包含 HTML+CSS+JS）
                               books camera clock-app messages music phone photos
                               safari shortcuts translate weather ...

工程    package.json           dev / build / start / test / typecheck / new-app / deploy:gh
       vite.config.js          构建（base './' 相对路径，任意子路径可部署）
       vitest.config.js        测试配置（happy-dom）
       tests/                  33 个测试文件 · 460 项单测（含安装包 40 项）
       .github/workflows/      CI：push main → vitest 门禁 → build → gh-pages
       改动说明.md             版本变更记录（每版一节）
       ROADMAP.md              路线图
```

---

## 六、安装包（.mdapp）格式规范与应用安装器

> v7.52 新增。桌面内置「安装包」应用：把任意网页应用打包成 `.mdapp`（本质是 ZIP），
> 导入后**自动识别图标与名称、透明展示权限清单、一键安装成桌面应用**。装好的应用
> 以沙箱 iframe 运行，由 Service Worker 从 IndexedDB 虚拟托管，可随时卸载。

### 6.1 包结构（ZIP 根目录）

```text
my-app.mdapp（或 .zip）
├── manifest.json    必需 · 唯一权威元数据源（见 6.2）
├── index.html       必需（除非 manifest.entry 指定其他入口）
├── icon.svg         推荐 · 应用图标（矢量优先，也支持 png/jpg/webp…）
├── css/ js/ assets/ …任意相对路径资源
```

- 打包时可直接压 zip 根目录；若整包被套了一层文件夹（Windows 右键压缩习惯），安装器会自动剥离公共根目录；
- 文件名一律 UTF-8、相对路径，禁止绝对路径与 `..` 穿越（有则拒装）；
- 一键生成演示包：`node scripts/make-demo-pkg.mjs hello-world.mdapp`。

### 6.2 manifest.json 字段表

| 字段 | 必填 | 约束 | 说明 |
|---|---|---|---|
| `id` | ✅ | `/^[a-z][a-z0-9._-]{1,39}$/`，禁连续点 | 包唯一标识，全局唯一；与其它包同 id 安装 = 覆盖升级 |
| `name` | 推荐 | ≤ 24 字 | 应用名；缺省时自动识别（见 6.3） |
| `version` | 可选 | ≤ 20 位 `0-9A-Za-z.-` | 默认 `1.0.0` |
| `entry` | 可选 | 包内相对路径 | 默认 `index.html` |
| `icon` | 可选 | 包内相对路径，图片 ≤ 512KB | 缺省时自动识别（见 6.3） |
| `permissions` | 可选 | 白名单子集（见 6.4） | 安装单透明展示；运行时仍逐项询问 |
| `author` / `description` | 可选 | ≤ 40 / ≤ 120 字 | 安装单展示 |

### 6.3 自动识别规则（图标与名称）

| 项 | 识别链（高 → 低优先级） |
|---|---|
| 名称 | `manifest.name` → 入口页 `<title>` → 压缩包文件名（去扩展名） |
| 图标 | `manifest.icon` → 入口页 `<link rel="icon">` → 系统默认图标 |
| 入口 | `manifest.entry` → `index.html` |

**矢量优先**：全站内置应用图标都是 SVG 矢量，安装包图标同等待遇 —— `.svg` 图标
净化后**以内联 SVG 直接注入桌面**（与内置图标同一条渲染通道）：写
`hsl(calc(var(--md-h,215) …))` 公式即可**跟随系统主题色**（写法与
`app-icons.js` 内置图标一致），位图（png/jpg/webp…）才会栅格化到 ≤192px。
净化会剥除 SVG 内的 `<script>` / `on*` 事件 / `javascript:` 与外链引用。

### 6.4 权限白名单（5 类，与系统统一权限对话框同源）

| 权限键 | 说明 |
|---|---|
| `camera` | 拍照 / 录视频 |
| `microphone` | 录音 |
| `location` | 地理位置 |
| `notifications` | 发送系统通知 |
| `clipboard` | 读写剪贴板 |

`manifest.permissions` 里声明 → 安装确认单**透明列出**；运行时调用
`__system.requestPermission(name)` 仍会弹出 MD3 权限对话框（拒绝/仅本次/允许），
可在 设置 › 应用权限管理 随时改判。未知权限键安装时忽略并出警告。

### 6.5 体量与安全限制

| 项 | 上限 |
|---|---|
| 压缩包本体 | 30 MB |
| 解压后总量 / 单文件 | 40 MB / 25 MB（解压流式计数，炸包先于 OOM 被捾断） |
| 条目数 | 800（同名文件拒装；CRC32 逐文件校验） |
| 图标 | 512 KB（SVG 净化后内联；位图栅格化） |
| 可打包类型 | html/css/js/mjs/json/txt/md/xml/csv/map/svg/png/jpg/jpeg/gif/webp/avif/ico/bmp/woff/woff2/ttf/otf/wav/mp3/ogg/m4a/flac/mp4/webm/mov/wasm（白名单外拒装） |

运行隔离与信任模型：装好的应用与系统**同源运行**（Service Worker 从 IndexedDB 虚拟托管，
保证相对路径零改写可用），并由 SW 为包内页面注入两层防波堤 —— **CSP 响应头**（封外联，
仅允许 self/data/blob 请求）与 `pkg-sdk.js` 头注（系统桥先于包内脚本建立）。与真机侧载
APK 同级的信任前提：**只安装来源可信的安装包**；包内应用的持久化请优先用
`window.__system.fs`（虚拟文件系统，随卸载清理），不要用 `localStorage`。

### 6.6 包内应用可用的系统能力（`window.__system`）

Service Worker 会在返回包内 HTML 时自动注入 `pkg-sdk.js`，包内网页无需引入任何文件即得：

```js
__system.emit(event, payload, targetAppId)  // 跨应用事件总线
__system.notify({ title, body })            // 系统通知（横幅 + 通知中心）
__system.share({ title, text, url })        // 系统分享面板
__system.openApp('clock', { event, payload })// 深链打开其它应用
__system.requestPermission('microphone')    // → Promise<boolean>，弹统一权限对话框
__system.fs.write('/demo/a.txt', 'hi')      // 虚拟文件系统（持久化请走这里）
__system.clipboard.write({ text }) / read() // 全局剪贴板
```

主题色 / 明暗模式 / 壁纸 / 字体变更会自动同步进包内页面（SDK 内建监听），
应用只需使用 `--md-h` 等 CSS 变量即可与系统观感一致。底部手势（上滑回桌面、
边缘返回）由 SDK 穿透转发，手感与内置应用一致。

### 6.7 安装 / 卸载 / 管理入口

| 操作 | 路径 |
|---|---|
| 导入 | 安装包应用 → 右下角「导入压缩包」（支持多选）；或文件管理器里直接点击 zip/.mdapp 自动交接 |
| 安装 | 待安装列表点击卡片 → 安装确认单（图标/名称/版本/体量/权限/识别警告）→ 安装；图标自动放到桌面末页 |
| 打开 | 桌面图标，或安装包 › 已安装 › 打开 |
| 卸载 | 安装包 › 已安装 › 卸载（连权限记录与包数据一并清除） |
| 放回桌面 | 若曾用编辑模式 × 移除：已安装列表 › 放回桌面 |

### 6.8 最小示例

```json
{ "id": "com.example.hello", "name": "你好", "version": "1.0.0",
  "icon": "icon.svg", "permissions": [] }
```

```html
<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<title>你好</title><link rel="icon" href="icon.svg">
<style>body{font-family:system-ui;background:var(--md-surface,#141418);color:var(--md-on-surface,#eee)}</style>
</head><body>
<h1>你好，世界</h1>
<button onclick="__system.notify({title:'你好',body:'来自安装包'})">发通知</button>
</body></html>
```

---

## 七、来源与致谢

- 本项目源自 [simulationandroid.netlify.app](https://simulationandroid.netlify.app/) 的开源镜像，经社区持续重构演进（v7.x 系列见 `改动说明.md`）；
- 部分视觉组件来自 [Uiverse](https://uiverse.io/)（MIT 协议，已在源码注释中逐处标注）；
- 图标字体：Google Fonts（异步加载，离线自动回退系统字体）。

**License**: 随上游镜像仓库协议。
