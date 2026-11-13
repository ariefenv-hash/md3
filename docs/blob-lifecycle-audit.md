# blob 资源生命周期审计（#303）

> 触发：深测首开信息（msg）应用捕获 `FAIL blob:http://127.0.0.1:8097/7cbe…`，同会话无 console error。
> 本文只做**证据归档与排查路径**，不改代码 —— 复现条件未收敛（首开一次，后续开关未再捕获），按议题处置建议③「低危先登记」。

## 一、全库 createObjectURL / revokeObjectURL 配对盘点

扫描面：`ios-desktop/**/*.{js,mjs,html}`，**排除 `.min.js` 与 `vendor/`**（首次粗扫被 `apps/messages/mqtt.min.js` 压缩代码污染，已剔除）。共 48 处调用，分布 18 个宿主。

| 宿主 | create | revoke | 配对判定 |
|---|---|---|---|
| `calendar` | 1 | 0 | **仅 create，无显式 revoke** → 泄漏/延迟回收候选 |
| `camera` | 1 | 0 | **仅 create，无显式 revoke** → 泄漏/延迟回收候选 |
| `clock-app` | 2 | 0 | **仅 create，无显式 revoke** → 泄漏/延迟回收候选 |
| `js/apps/files.js` | 1 | 1 | 部分配对（逐点核生命周期） |
| `js/apps/music.js` | 1 | 0 | **仅 create，无显式 revoke** → 泄漏/延迟回收候选 |
| `js/data-backup.js` | 1 | 1 | 部分配对（逐点核生命周期） |
| `js/media-service.js` | 4 | 2 | 部分配对（逐点核生命周期） |
| `js/procedural-wallpaper.js` | 1 | 1 | 部分配对（逐点核生命周期） |
| `js/storage.js` | 1 | 0 | **仅 create，无显式 revoke** → 泄漏/延迟回收候选 |
| `js/vfs.js` | 1 | 1 | 部分配对（逐点核生命周期） |
| `js/video-wallpaper.js` | 1 | 2 | 部分配对（逐点核生命周期） |
| `js/wallpaper.js` | 2 | 2 | 部分配对（逐点核生命周期） |
| `markdown` | 1 | 1 | 部分配对（逐点核生命周期） |
| `midi-player` | 1 | 1 | 部分配对（逐点核生命周期） |
| `music` | 7 | 2 | 部分配对（逐点核生命周期） |
| `ocr` | 2 | 3 | 部分配对（逐点核生命周期） |
| `photos` | 1 | 0 | **仅 create，无显式 revoke** → 泄漏/延迟回收候选 |
| `threes` | 2 | 0 | **仅 create，无显式 revoke** → 泄漏/延迟回收候选 |

## 二、关键结论：msg 应用自身不创建 blob URL

按应用名过滤 messages/msg 相关宿主：**0 个命中**（无）。
即 `apps/messages/` 业务代码**零 `createObjectURL` / 零 `revokeObjectURL`**；唯一命中来自 `mqtt.min.js` 压缩串中的无关同名片段（已排除）。

因此 #303 的 `FAIL blob:` **不是 msg 应用自己创建后提前撤销**，方向应转向：
1. **宿主转交**：`__syncIframeApp` / 窗口重开路径把宿主侧创建的 blob URL 注入 iframe，iframe 重载后 URL 已被宿主 revoke；
2. **VFS 传递**：头像/图片经 VFS 读取后以 blob URL 形式交给子应用，URL 生命周期归属不清；
3. **首开竞态**：冷启动直开时资源尚未就绪，浏览器只报网络层 `FAIL`，不产生 console error（与观测一致）。

## 三、逐点生命周期表（业务代码，非 vendor）

| 文件:行 | 类型 | 片段 |
|---|---|---|
| `apps/ocr/app.mjs:145` | revoke | `try { window.URL.revokeObjectURL(cur.blobUrl); } catch (e) { /* revoke 无害 */ }` |
| `apps/ocr/app.mjs:154` | create | `var url = window.URL.createObjectURL(blob);` |
| `apps/ocr/app.mjs:494` | create | `var url = window.URL.createObjectURL(f);` |
| `apps/ocr/app.mjs:497` | revoke | `window.URL.revokeObjectURL(probe.src);` |
| `apps/ocr/app.mjs:501` | revoke | `window.URL.revokeObjectURL(probe.src);` |
| `apps/threes/index.html:807` | create | `$('#polaroidImg').src = URL.createObjectURL(polaroidBlob);` |
| `apps/threes/index.html:813` | create | `const a = document.createElement('a'); a.href = URL.createObjectURL(polaroidBlob); a.download = 'threes-record` |
| `apps/photos/index.html:674` | create | `src: URL.createObjectURL(rec.blob),` |
| `apps/calendar/index.html:1008` | create | `a.href = URL.createObjectURL(new Blob([n.content], { type: 'text/markdown' }));` |
| `apps/midi-player/app.mjs:87` | revoke | `try { window.URL.revokeObjectURL(cur.blobUrl); } catch (e) { /* revoke 无害 */ }` |
| `apps/midi-player/app.mjs:121` | create | `cur.blobUrl = window.URL.createObjectURL(new Blob([buf], { type: 'audio/midi' }));` |
| `apps/music/index.html:1405` | create | `url: URL.createObjectURL(file),` |
| `apps/music/index.html:1478` | create | `url: URL.createObjectURL(f),` |
| `apps/music/index.html:1524` | create | `track.coverUrl = URL.createObjectURL(new Blob([meta.cover.data], { type: meta.cover.mime }));` |
| `apps/music/index.html:1526` | create | `track.coverUrl = URL.createObjectURL(new Blob([track.pkgCover.data], { type: track.pkgCover.mime }));` |
| `apps/music/index.html:1528` | create | `track.coverUrl = URL.createObjectURL(opts.pairCover);` |
| `apps/music/index.html:1891` | create | `a.href = URL.createObjectURL(new Blob([text], { type: mime ¦¦ 'text/plain' }));` |
| `apps/music/index.html:1895` | revoke | `setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400);` |
| `apps/music/index.html:2346` | revoke | `this.tracks.forEach(t => URL.revokeObjectURL(t.url));` |
| `apps/music/index.html:2483` | create | `url: URL.createObjectURL(rec.blob),` |
| `apps/markdown/index.html:439` | create | `a.href = URL.createObjectURL(blob);` |
| `apps/markdown/index.html:442` | revoke | `setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);` |
| `apps/camera/index.html:1107` | create | `const videoUrl = URL.createObjectURL(blob);` |
| `apps/clock-app/alarm.mjs:295` | create | `customAudio=new Audio(URL.createObjectURL(f));$('customRingtoneOption').disabled=0;$('globalRingtoneSelect').v` |
| `apps/clock-app/bedtime.mjs:39` | create | `noiseCustomAudio=new Audio(URL.createObjectURL(f));noiseCustomAudio.loop=true;noiseCustomAudio.volume=noiseVol` |
| `js/vfs.js:156` | revoke | `if (u) { try { URL.revokeObjectURL(u); } catch (e) {} urlCache.delete(path); }` |
| `js/vfs.js:301` | create | `const url = URL.createObjectURL(blob);` |
| `js/storage.js:10` | create | `//   读取时用 URL.createObjectURL() 生成本地链接直接使用，无膨胀、无上限。` |
| `js/wallpaper.js:114` | create | `const url = URL.createObjectURL(blob);` |
| `js/wallpaper.js:117` | revoke | `setTimeout(() => { try { URL.revokeObjectURL(prev); } catch (e) {} }, 30000);` |
| `js/wallpaper.js:527` | create | `const url = URL.createObjectURL(blob);` |
| `js/wallpaper.js:531` | revoke | `setTimeout(() => { prev.forEach((u) => { try { URL.revokeObjectURL(u); } catch (e) {} }); }, 30000);` |
| `js/video-wallpaper.js:377` | revoke | `if (objectURL) { try { URL.revokeObjectURL(objectURL); } catch (e) {} }` |
| `js/video-wallpaper.js:378` | create | `objectURL = URL.createObjectURL(blob);` |
| `js/video-wallpaper.js:451` | revoke | `if (objectURL) { try { URL.revokeObjectURL(objectURL); } catch (e) {} objectURL = ''; }` |
| `js/procedural-wallpaper.js:351` | revoke | `if (_snapshotObjectURL) { try { URL.revokeObjectURL(_snapshotObjectURL); } catch (e) {} }` |
| `js/procedural-wallpaper.js:352` | create | `_snapshotObjectURL = URL.createObjectURL(blob);` |
| `js/data-backup.js:201` | create | `const url = URL.createObjectURL(blob);` |
| `js/data-backup.js:210` | revoke | `setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) {} }, 3000);` |
| `js/media-service.js:173` | create | `if (blob && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {` |
| `js/media-service.js:174` | create | `try { t.src = URL.createObjectURL(blob); } catch (e) { /* 归一化失败保持原 src */ }` |
| `js/media-service.js:623` | create | `const objectUrl = URL.createObjectURL(file);` |
| `js/media-service.js:643` | create | `const coverUrl = URL.createObjectURL(new Blob([meta.cover.data], { type: meta.cover.mime ¦¦ 'image/jpeg' }));` |
| `js/media-service.js:660` | revoke | `try { URL.revokeObjectURL(t.src); } catch (e) {}` |
| `js/media-service.js:661` | revoke | `try { if (t.coverUrl) URL.revokeObjectURL(t.coverUrl); } catch (e) {} // #118 封面同撤销` |
| `js/apps/music.js:83` | create | `var url = window.URL.createObjectURL(files[i]);` |
| `js/apps/files.js:1167` | create | `a.href = URL.createObjectURL(blob);` |
| `js/apps/files.js:1172` | revoke | `setTimeout(function() { try { a.remove(); URL.revokeObjectURL(a.href); } catch (e) {} }, 3000);` |

## 四、复现收敛实验（下轮 sweep 执行，本卡不做）

| 实验 | 步骤 | 判据 |
|---|---|---|
| A 冷启动直开 | 全新页面 → 直接打开 msg，记录网络层 FAIL 与所有 blob URL | 是否稳定复现 |
| B 桌面多次开关 | 从桌面打开 → 关闭 → 再开 ×10，记录同一批 URL | 是否仅首开出现 |
| C iframe 重载 | 打开 msg → 触发 `__syncIframeApp` 重开 → 观察旧 URL 是否仍被引用 | 定位宿主转交 |
| D revoke 时序 | 在 `revokeObjectURL` 处打点，记录调用时刻与 img.src 赋值时刻 | 是否存在先撤后用 |

## 五、登记与升级条件

- 当前等级：**低危 / 观测**（单次、无 console error、无功能损伤）。
- 升级为 P2 缺陷的条件：A/B 任一稳定复现，或出现可见的图片加载失败/空白头像。
- 观测通道：#281 错误观测层若落地，blob 失败应纳入汇聚（现无通道，只报网络层）。

## 六、验收

- [x] 全库配对盘点完成，vendor 污染已剔除
- [x] 证实 msg 应用零直接调用，推断方向已改写
- [x] 复现实验矩阵与升级条件成文
- [ ] 复现收敛（明确留待下轮 sweep，非本卡范围）

关联：#303 / #281 / #304
