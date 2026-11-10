# e2e-specs — playwright 常青 spec 目录（#272 渐进接入落点）

本目录是 `playwright.config.js`（#272 批 1 骨架）的 `testDir` 落点。**本批（v11.06）为空目录**：
仅本 README 占位，零 spec——`playwright test --pass-with-no-tests` 空跑通过，对既有
`scripts/e2e-*.mjs` 裸脚本三通道（npm `e2e:dist` / npm `e2e:sweep` / 直跑）零行为变更。

渐进接入纪律（docs/e2e-playwright-adoption.md §4）：

1. **批 2（渐进批）**：从 `docs/audits/e2e-inventory.json` A 档（常青回归候选）取前 10 家
   （#272 卡面建议③），逐脚本评审后改写为 `*.spec.js` 落入本目录，同批摘除
   npm `e2e:pw` 的 `--pass-with-no-tests` 旗标；
2. spec 命名遵循 #291 常青纪律：`<特性名>-<行为>.spec.js`，版本前缀仅限交付时点快照
   （须带 `@snapshot` 头注记）；
3. 每批接入后 `npm run e2e:pw` 须与对应裸脚本直跑结论一致（等强门禁 G6 同律）；
4. 被接入脚本的裸脚本本体在其 spec 门禁等强落地**之前不删除**（三档清单 B 档
   「标记归档可运行保留」同律）。
