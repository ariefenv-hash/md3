# 安卓16极客 · md3

> **网页版安卓 16 / Pixel 桌面模拟器** —— 纯前端 PWA，免安装、打开即玩。
> 31 个应用、锁屏、动态壁纸、Material Design 3 动态取色、弹簧物理动画、最近任务、下拉控制中心……

**[🖥️ 在线体验](https://ariefenv-hash.github.io/md3/)** · 纯静态部署，无任何后端 · 支持离线（Service Worker）

---

## 📑 目录

- [一、5 分钟跑起来（零基础）](#一5-分钟跑起来零基础)
- [二、本地开发（有前端基础）](#二本地开发有前端基础)
- [三、深度维护（贡献者）](#三深度维护贡献者)
- [四、FAQ 故障排查（症状 → 根因 → 解法）](#四faq-故障排查症状--根因--解法)
- [五、仓库结构](#五仓库结构)
- [六、来源与致谢](#六来源与致谢)

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
| `npm test` | Vitest 单元测试全量（当前 **102 项**，纯逻辑层均可本地跑） |
| `npm run test:watch` | 测试监听模式 |
| `npm run typecheck` | `tsc --noEmit` 全量类型检查 |
| `npm run new-app weather-widget 天气小件` | 生成新子应用脚手架（模板 + 接入指引） |

### 源码地图（改什么去哪）

| 想改什么 | 去哪 |
|---|---|
| 桌面布局 / 图标 / 页面 | `ios-desktop/js/desktop.js` + `ios-desktop/js/apps/*.js`（31 个应用定义） |
| 应用窗口 / 弹簧动画 | `ios-desktop/js/app-window.js` + `js/spring.js` + `js/config.js` |
| 主题色 / 取色引擎 | `ios-desktop/js/theme-engine.js`（MD3 令牌生成） |
| 多任务（最近任务卡片） | `ios-desktop/js/recent-apps.js` |
| 手势（上滑 / 横滑切换 / 拖拽） | `ios-desktop/js/gestures.js` + `js/nav-bar.js` |
| 状态栏 / 锁屏 / 控制中心 | `js/status-bar.js` / `js/lock-screen.js` / `js/quick-settings.js` |
| 某个 iframe 应用本体 | `ios-desktop/apps/<应用名>/index.html`（21 个，单文件自包含） |
| 样式令牌 / 主题 CSS | `ios-desktop/css/md3-theme.css`（12 个 CSS 模块） |

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

- **改任何运行时代码（HTML/CSS/JS）都必须递增 `sw.js` 里的 `VERSION`**（v34 → v35），
  否则老用户浏览器一直吃旧缓存（activate 时才会清空全部历史缓存并接管）；
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
  3. 若是发布新版本：记得递增 `sw.js` 的 `VERSION`（见[上文](#service-worker-机制改了代码必须懂的一层)），
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

第3层  ios-desktop/js/         53 个原生 ES Module（无框架、无打包器）
       ├── main.js             初始化编排
       ├── app-window.js       应用窗口弹簧物理引擎
       ├── spring.js / config.js  弹簧参数与手势阈值
       ├── gestures.js         系统手势（上滑 / 底部横滑切换 / 拖拽）
       ├── recent-apps.js      多任务（卡片 / 连续缩放 / 快速切换）
       ├── theme-engine.js     MD3 动态取色
       ├── battery-service.js  电量单一真源（实测速率估算剩余/充满时长）
       └── apps/*.js           31 个应用定义（图标 / 名称 / 页面）

第4层  ios-desktop/apps/*/     21 个 iframe 子应用（单文件自包含 HTML+CSS+JS）
                               books camera clock-app messages music phone photos
                               safari shortcuts translate weather ...

工程    package.json           dev / build / start / test / typecheck / new-app / deploy:gh
       vite.config.js          构建（base './' 相对路径，任意子路径可部署）
       vitest.config.js        测试配置（happy-dom）
       tests/                  11 个测试文件 · 102 项单测
       .github/workflows/      CI：push main → vitest 门禁 → build → gh-pages
       改动说明.md             版本变更记录（每版一节）
       ROADMAP.md              路线图
```

---

## 六、来源与致谢

- 本项目源自 [simulationandroid.netlify.app](https://simulationandroid.netlify.app/) 的开源镜像，经社区持续重构演进（v7.x 系列见 `改动说明.md`）；
- 部分视觉组件来自 [Uiverse](https://uiverse.io/)（MIT 协议，已在源码注释中逐处标注）；
- 图标字体：Google Fonts（异步加载，离线自动回退系统字体）。

**License**: 随上游镜像仓库协议。
