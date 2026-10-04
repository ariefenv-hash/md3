#!/bin/bash
# ==================== gen-tw-local.sh ====================
# Tailwind Play CDN 本地化：扫描 7 个 iframe 型 app 的 index.html，
# 用 tailwindcss CLI（与 Play CDN 同代 v3.4）预编译静态 utilities CSS。
# 产物：ios-desktop/apps/_shared/tw-utilities.css（SW 可缓存 → PWA 离线可用）
# safelist：books 页 'pl-' + (8 + depth*4) 算术拼接无法静态提取 → 显式列出
set -e
cd /home/z/my-project/md3-project
mkdir -p /tmp/twgen

cat > /tmp/twgen/input.css <<'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;
EOF

# safelist：books 目录树的动态缩进（depth 1-10 → pl-12..pl-48，含起点 pl-8）
SAFELIST=""
for px in 8 12 16 20 24 28 32 36 40 44 48; do
  SAFELIST="$SAFELIST '$SAFELIST_ITEM'"
done
SAFELIST=$(for px in 8 12 16 20 24 28 32 36 40 44 48; do printf "'pl-%s', " "$px"; done | sed "s/,$//")

cat > /tmp/twgen/tw.config.js <<EOF
module.exports = {
  content: [
    './ios-desktop/apps/notes/index.html',
    './ios-desktop/apps/safari/index.html',
    './ios-desktop/apps/photos/index.html',
    './ios-desktop/apps/books/index.html',
    './ios-desktop/apps/stocks/index.html',
    './ios-desktop/apps/messages/index.html',
    './ios-desktop/apps/weather/index.html',
  ],
  safelist: [${SAFELIST}],
  corePlugins: { preflight: true },
}
EOF

npx --yes tailwindcss@3.4.17 \
  -c /tmp/twgen/tw.config.js \
  -i /tmp/twgen/input.css \
  -o ios-desktop/apps/_shared/tw-utilities.css \
  --minify

echo "---- 产物 ----"
wc -c ios-desktop/apps/_shared/tw-utilities.css
echo "生成的工具类数量（约）:"
grep -oE '^\.[a-zA-Z][a-zA-Z0-9_\\\[:.\]-]*' ios-desktop/apps/_shared/tw-utilities.css | wc -l
echo "抽查关键类是否在场:"
for cls in "flex" "hidden" "animate-spin" "opacity-100" "pointer-events-none" "pl-8" "pl-12" "hover\\\\:bg-\[var"; do
  if grep -q "$cls" ios-desktop/apps/_shared/tw-utilities.css; then echo "  ✓ $cls"; else echo "  ✗ $cls 缺失!"; fi
done
