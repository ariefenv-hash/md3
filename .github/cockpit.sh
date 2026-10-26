#!/usr/bin/env bash
# ==================== 驾驶舱统一写入脚本（#80 瘦身改造 · v8.35）====================
# daily-issue-brief 与 issue-patrol 共用：往「每日简报」跟踪议题写唯一一条
# <!-- cockpit --> 机器评论，原地 PATCH，绝不追加（首启收编旧机器评论除外）。
#
# 用法：cockpit.sh <gate-exit-file> <gate-tail-file> [--create-issue]
#   gate-exit-file  vitest 退出码文件（0=通过）
#   gate-tail-file  vitest 失败尾部日志（仅在翻转时展示于变更区）
#   --create-issue  跟踪议题不存在时自动创建（仅简报工作流传；patrol 缺席即跳过）
#
# 核心机制（#80 §1.2 指纹 diff）：
#   1. 指纹 = md5(开放议题号集合（排除跟踪议题自身）+ 门禁态) 前 12 位，
#      存于评论隐藏块 <!-- fp:... -->；议题号集合存 <!-- state:... -->。
#      —— 排除跟踪议题自身：本评论每次 PATCH 都会 bump 其 updatedAt，
#         若计入指纹则永无静默轮（自指噪声）。
#      —— 仅用议题号集合而非 updatedAt：评论/编辑活动不改变开合事件集，
#         无开/关事件 = 静默轮，避免「有活动即刷变更」的次级噪声。
#   2. 指纹不变 → 静默轮：仅刷新时间戳与摘要行，变更区写「本轮无变化」，
#      24h 滚动日志逐字保留（#80 DoD：连续两轮无变化不重写变更区）。
#   3. 指纹变 → diff 开/关/门禁翻转事件，前置进 24h 滚动日志（≤20 条，
#      且仅保留 24h 内条目）。无开/关事件仅集合变动（如跟踪议题自身之外
#      不可能——指纹只有这两项）理论不可达，兜底同样按无事件静默处理。
#   4. 首启收编：找 <!-- cockpit --> 评论；没有则收编最旧的
#      github-actions[bot] 机器评论（<!-- patrol-snapshot --> 或「## 每日简报」
#      开头）PATCH 成驾驶舱；再清扫其余机器人旧机器评论（作者+标记双守卫，
#      人工评论绝不触碰）——#17 评论总数收敛为 驾驶舱×1 + 人工评论。
#   5. 全量盘点不进评论：摘要一行 + 变更区，明细按需 gh issue list 现查。
set -euo pipefail

GATE_FILE="${1:?usage: cockpit.sh <gate-exit-file> <gate-tail-file> [--create-issue]}"
TAIL_FILE="${2:-/dev/null}"
CREATE_ISSUE="${3:-}"

: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY required}"
command -v gh >/dev/null || { echo "gh 不可用，跳过"; exit 0; }
command -v jq >/dev/null || { echo "jq 不可用，跳过"; exit 0; }

export TZ=Asia/Shanghai
STAMP=$(date '+%Y-%m-%d %H:%M')
CUTOFF=$(date -d '24 hours ago' +%s)
BODY_FILE=$(mktemp)
trap 'rm -f "$BODY_FILE"' EXIT

# ---------- 0. 门禁态 ----------
GATE_PASS=0
[ -f "$GATE_FILE" ] && [ "$(cat "$GATE_FILE" 2>/dev/null | tr -d '[:space:]')" = "0" ] && GATE_PASS=1

# ---------- 1. 跟踪议题 ----------
TRACKING=$(gh issue list --state all --search '每日简报 in:title' --json number --jq '.[0].number // ""' 2>/dev/null || true)
if [ -z "$TRACKING" ]; then
  if [ "$CREATE_ISSUE" = "--create-issue" ]; then
    # 首建：无指纹可比，直接以首启形态创建
    OPEN_N=$(gh issue list --state open --limit 200 --json number --jq 'length')
    cat > "$BODY_FILE" <<EOF
<!-- cockpit -->
<!-- fp:INIT -->
<!-- state:|gate=${GATE_PASS} -->

## 驾驶舱 · ${STAMP}

**摘要**：开放 ${OPEN_N} · 24h 关闭 0 · 门禁 $([ "$GATE_PASS" = 1 ] && echo ✅ || echo ❌)（上轮 —）

### 本轮变更
- 🛫 驾驶舱启用（#80 瘦身改造：原地更新 + 指纹 diff + 静默轮）

### 近 24h 变更日志（滚动 ≤20 条 · 盘点明细按需 gh issue list 现查）

> 瘦身纪律：docs/ops-discipline.md · 池空后巡查总纲：#77
EOF
    gh issue create --title '每日简报（定时任务落地跟踪）' --body-file "$BODY_FILE"
    echo "跟踪议题不存在，已带驾驶舱首启创建"
    exit 0
  fi
  echo "跟踪议题不存在（由每日简报创建），本轮跳过"
  exit 0
fi

# ---------- 2. 定位驾驶舱评论（优先 cockpit → 收编最旧机器评论）----------
COMMENTS_JSON=$(gh api "repos/${GITHUB_REPOSITORY}/issues/${TRACKING}/comments?per_page=100")
COCKPIT_ID=$(jq -r '[.[] | select(.body | startswith("<!-- cockpit -->"))] | sort_by(.created_at) | .[0].id // ""' <<<"$COMMENTS_JSON")
if [ -z "$COCKPIT_ID" ]; then
  # 收编：github-actions[bot] 且带已知机器标记（巡逻快照 / 旧版简报），取最旧
  COCKPIT_ID=$(jq -r '[.[] | select(.user.login == "github-actions[bot]") | select((.body | startswith("<!-- patrol-snapshot -->")) or (.body | startswith("## 每日简报")))] | sort_by(.created_at) | .[0].id // ""' <<<"$COMMENTS_JSON")
fi

# ---------- 3. 旧指纹 / 旧议题集 / 旧日志 ----------
OLD_FP=""
OLD_STATE=""
OLD_LOG=""
if [ -n "$COCKPIT_ID" ]; then
  OLD_BODY=$(jq -r --argjson id "$COCKPIT_ID" '.[] | select(.id == $id) | .body' <<<"$COMMENTS_JSON")
  OLD_FP=$(grep -o '<!-- fp:[0-9a-f]* -->' <<<"$OLD_BODY" | head -1 | sed 's/<!-- fp://; s/ -->//' || true)
  OLD_STATE=$(grep -o '<!-- state:[^>]* -->' <<<"$OLD_BODY" | head -1 | sed 's/<!-- state://; s/ -->//' || true)
  OLD_LOG=$(awk '/^### 近 24h 变更日志/{flag=1; next} flag {print}' <<<"$OLD_BODY" | grep -- '^-' || true)
fi

FIRST_RUN=0
[ -z "$OLD_STATE" ] && FIRST_RUN=1
OLD_FP="${OLD_FP:-INIT}"
OLD_NUMBERS="${OLD_STATE%%|*}"
OLD_GATE="${OLD_STATE##*|gate=}"
[ "$OLD_NUMBERS" = "$OLD_STATE" ] && OLD_NUMBERS=""
[ "$OLD_GATE" = "$OLD_STATE" ] && OLD_GATE=""

# ---------- 4. 新指纹（开放议题号集合排除跟踪议题自身 + 门禁态）----------
ISSUES_JSON=$(gh issue list --state open --limit 200 --json number,title)
NEW_NUMBERS=$(jq -r --argjson t "$TRACKING" '[.[].number | select(. != $t)] | sort | join(",")' <<<"$ISSUES_JSON")
STATE="${NEW_NUMBERS}|gate=${GATE_PASS}"
FP=$(printf '%s' "$STATE" | md5sum | cut -c1-12)

# ---------- 5. diff 事件（开/关/门禁翻转）----------
declare -a EVENTS=()
TITLE_LOOKUP=$(jq -r '.[] | "\(.number)\t\(.title)"' <<<"$ISSUES_JSON")
NEW_SORTED=$(printf '%s' "$NEW_NUMBERS" | tr ',' '\n' | sed '/^$/d' | sort)
OLD_SORTED=$(printf '%s' "$OLD_NUMBERS" | tr ',' '\n' | sed '/^$/d' | sort)

OPENED=$(comm -13 <(printf '%s\n' "$OLD_SORTED") <(printf '%s\n' "$NEW_SORTED") | sed '/^$/d' || true)
CLOSED=$(comm -23 <(printf '%s\n' "$OLD_SORTED") <(printf '%s\n' "$NEW_SORTED") | sed '/^$/d' || true)

# 首启（无旧指纹可比）不做全量 open/close diff——否则全部在管议题误报「新开」
if [ "$FIRST_RUN" = 1 ]; then
  EVENTS+=("- 🛫 驾驶舱启用（#80 瘦身改造：原地更新 + 指纹 diff + 静默轮）")
else
while IFS= read -r n; do
  [ -n "$n" ] || continue
  t=$(grep -P "^${n}\t" <<<"$TITLE_LOOKUP" | head -1 | cut -f2- || true)
  t="${t:0:40}"
  EVENTS+=("- 🆕 #${n} 新开（${t}）")
done <<<"$OPENED"
while IFS= read -r n; do
  [ -n "$n" ] || continue
  EVENTS+=("- ✅ #${n} 已关闭")
done <<<"$CLOSED"
if [ -n "$OLD_GATE" ] && [ "$OLD_GATE" != "$GATE_PASS" ]; then
  if [ "$GATE_PASS" = 1 ]; then
    EVENTS+=("- ✅ vitest 门禁恢复 ❌→✅")
  else
    EVENTS+=("- ⚠️ vitest 门禁翻转 ✅→❌（尾部见工作流日志）")
  fi
fi
fi

SILENT=0
if [ "$FP" = "$OLD_FP" ]; then
  SILENT=1
  SECTION_EVENTS="- 本轮无变化（指纹一致：${FP}）"
elif [ "${#EVENTS[@]}" -eq 0 ]; then
  # 指纹变但零事件（理论上仅首启后的边角态）——按静默轮呈现，但仍更新指纹
  SECTION_EVENTS="- 本轮无变化（无开/关事件，指纹刷新 ${OLD_FP} → ${FP}）"
else
  SECTION_EVENTS=$(printf '%s\n' "${EVENTS[@]}")
fi

# ---------- 6. 24h 滚动日志（新事件前置 → 24h 过滤 → ≤20 条；静默轮逐字保留）----------
if [ "$SILENT" = 1 ]; then
  LOG_LINES="$OLD_LOG"
else
  STAMPED_EVENTS=""
  if [ "${#EVENTS[@]}" -gt 0 ]; then
    STAMPED_EVENTS=$(printf '%s\n' "${EVENTS[@]}" | sed "s/^- /- ${STAMP} · /")
  fi
  MERGED=$(printf '%s\n%s\n' "$STAMPED_EVENTS" "$OLD_LOG" | sed '/^$/d')
  LOG_LINES=""
  while IFS= read -r line; do
    [ -n "$line" ] || continue
    ts=$(sed -nE 's/^- ([0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}).*/\1/p' <<<"$line")
    if [ -n "$ts" ]; then
      epoch=$(date -d "$ts" +%s 2>/dev/null || echo 0)
      [ "$epoch" -ge "$CUTOFF" ] || continue
    fi
    LOG_LINES+="${line}"$'\n'
  done <<<"$MERGED"
  LOG_LINES=$(printf '%s' "$LOG_LINES" | head -n 20)
fi

# ---------- 7. 摘要行 ----------
OPEN_COUNT=$(printf '%s\n' "$NEW_NUMBERS" | tr ',' '\n' | sed '/^$/d' | wc -l | tr -d ' ')
CLOSED_24H=$(grep -c '已关闭' <<<"$LOG_LINES" || true)
CLOSED_24H=${CLOSED_24H:-0}
GATE_ICON=$([ "$GATE_PASS" = 1 ] && echo ✅ || echo ❌)
PREV_ICON="—"
[ -n "$OLD_GATE" ] && PREV_ICON=$([ "$OLD_GATE" = 1 ] && echo ✅ || echo ❌)
POOL_NOTE=""
[ "$OPEN_COUNT" = "0" ] && POOL_NOTE=" · 池已空 → 进入 #77 巡查循环"

# ---------- 8. 组装 + 原地 PATCH ----------
GATE_TAIL_BLOCK=""
if [ "$GATE_PASS" != 1 ] && [ "$SILENT" != 1 ]; then
  GATE_TAIL_BLOCK=$'\n<details><summary>vitest 失败尾部（仅翻转轮附）</summary>\n\n```\n'"$(tail -n 30 "$TAIL_FILE" 2>/dev/null || echo '(无日志)')"$'\n```\n</details>'
fi

cat > "$BODY_FILE" <<EOF
<!-- cockpit -->
<!-- fp:${FP} -->
<!-- state:${STATE} -->

## 驾驶舱 · ${STAMP}

**摘要**：开放 ${OPEN_COUNT} · 24h 关闭 ${CLOSED_24H} · 门禁 ${GATE_ICON}（上轮 ${PREV_ICON}）${POOL_NOTE}

### 本轮变更
${SECTION_EVENTS}${GATE_TAIL_BLOCK}

### 近 24h 变更日志（滚动 ≤20 条 · 盘点明细按需 gh issue list 现查）
${LOG_LINES}
> 瘦身纪律：docs/ops-discipline.md · 池空后巡查总纲：#77
EOF

if [ -n "$COCKPIT_ID" ]; then
  gh api -X PATCH "repos/${GITHUB_REPOSITORY}/issues/comments/${COCKPIT_ID}" -f body="$(cat "$BODY_FILE")" > /dev/null
  echo "驾驶舱已原地更新（comment ${COCKPIT_ID}）指纹 ${OLD_FP} → ${FP}"
else
  gh issue comment "$TRACKING" --body-file "$BODY_FILE" > /dev/null
  echo "驾驶舱已新建（跟踪议题 #${TRACKING}）"
fi

# ---------- 9. 清扫其余机器旧评论（作者=github-actions[bot] 且带机器标记；人工评论不触碰）----------
if [ -n "$COCKPIT_ID" ]; then
  jq -r --argjson keep "$COCKPIT_ID" '.[]
    | select(.user.login == "github-actions[bot]" and (.id != $keep))
    | select((.body | startswith("<!-- patrol-snapshot -->")) or (.body | startswith("## 每日简报")))
    | .id' <<<"$COMMENTS_JSON" | while IFS= read -r did; do
      [ -n "$did" ] || continue
      gh api -X DELETE "repos/${GITHUB_REPOSITORY}/issues/comments/${did}" > /dev/null \
        && echo "已清扫旧机器评论 ${did}"
  done
fi
