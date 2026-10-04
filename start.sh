#!/usr/bin/env bash
# ==================== start.sh — 安卓16极客 · 一键启动（macOS / Linux） ====================
#
# 双击或 ./start.sh 运行。自动完成：
#   1. 在仓库根目录起本地静态服务器（file:// 直开会被浏览器 CORS 拦截，必须走 HTTP）
#   2. 自动挑选空闲端口（8080 ~ 8089，全忙则退回 8080 让系统报错提示换端口）
#   3. 打印访问地址（含跳过锁屏的参数版）并尝试拉起默认浏览器
#   4. 优先使用 Python（python3 → python），没有则回退 Node（node scripts/serve.mjs）
#
# 依赖：Python 3 或 Node.js 任装其一即可。停止服务：Ctrl + C

cd "$(dirname "$0")" || exit 1

# ---------- 选一个空闲端口（bash 内建 /dev/tcp 探测，不依赖任何工具） ----------
PORT=""
for p in 8080 8081 8082 8083 8084 8085 8086 8087 8088 8089; do
  if ! (exec 3<>"/dev/tcp/127.0.0.1/$p") 2>/dev/null; then
    PORT="$p"
    break
  else
    exec 3>&- 3<&- 2>/dev/null
  fi
done
if [ -z "$PORT" ]; then
  PORT=8080
  echo "⚠ 8080~8089 端口都被占用，仍尝试 8080（若报错请手动改脚本里的端口）"
fi

URL="http://localhost:$PORT/"
LINE="────────────────────────────────────────────────"

# ---------- 尝试开浏览器（有则开，没有不影响服务） ----------
try_open() {
  if command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL" >/dev/null 2>&1 &
  elif command -v open >/dev/null 2>&1; then open "$URL" >/dev/null 2>&1 &
  fi
}

# ---------- 起服务：Python 优先，Node 回退 ----------
SRV_PID=""
cleanup() {
  [ -n "$SRV_PID" ] && kill "$SRV_PID" 2>/dev/null
  echo ""
  echo "已停止。"
  exit 0
}
trap cleanup INT TERM

if command -v python3 >/dev/null 2>&1; then
  PY=python3
elif command -v python >/dev/null 2>&1; then
  PY=python
fi

if [ -n "$PY" ]; then
  echo ""
  echo -e "\033[32m${LINE}"
  echo "  安卓16极客 · 本地服务器已启动（$PY）"
  echo -e "${LINE}\033[0m"
  echo "  ➜  地址        ${URL}"
  echo "  ➜  跳过锁屏    ${URL}?nolock=1"
  echo "  ➜  站点根      $(pwd)（仓库根目录）"
  echo "  ➜  停止        Ctrl + C"
  echo "${LINE}"
  echo ""
  try_open
  "$PY" -m http.server "$PORT" --bind 127.0.0.1
  exit $?
fi

if command -v node >/dev/null 2>&1; then
  exec node scripts/serve.mjs --port "$PORT"
fi

echo ""
echo "❌ 未找到 Python 或 Node.js，请先安装其中任意一个："
echo "   • Python 3：https://www.python.org/downloads/"
echo "   • Node.js：https://nodejs.org/（装完即可 npm install && npm start）"
echo ""
exit 1
