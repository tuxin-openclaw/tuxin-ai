#!/usr/bin/env bash
# =============================================================
# Tuxin AI — 一键启动脚本
# 同时启动后端 (FastAPI :8000) 和前端 (Vite :5173)
# 用法: ./start.sh
# 选项: ./start.sh --install   首次运行，自动安装依赖
# =============================================================

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_LOG="$PROJECT_DIR/backend/.backend.log"
FRONTEND_LOG="$PROJECT_DIR/frontend/.frontend.log"
BACKEND_PID=""
FRONTEND_PID=""

# 颜色输出
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; RESET='\033[0m'

log()  { echo -e "${CYAN}[tuxin-ai]${RESET} $*"; }
ok()   { echo -e "${GREEN}[✓]${RESET} $*"; }
warn() { echo -e "${YELLOW}[!]${RESET} $*"; }
err()  { echo -e "${RED}[✗]${RESET} $*"; }

# ── 清理函数（Ctrl+C 时执行）────────────────────────────────
cleanup() {
  echo ""
  log "正在停止服务..."
  [[ -n "$BACKEND_PID" ]]  && kill "$BACKEND_PID"  2>/dev/null && ok "后端已停止"
  [[ -n "$FRONTEND_PID" ]] && kill "$FRONTEND_PID" 2>/dev/null && ok "前端已停止"
  exit 0
}
trap cleanup INT TERM

# ── 检查 .env ────────────────────────────────────────────────
check_env() {
  if [[ ! -f "$PROJECT_DIR/.env" ]]; then
    warn ".env 文件不存在，正在从 .env.example 复制..."
    if [[ -f "$PROJECT_DIR/.env.example" ]]; then
      cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
      warn "请编辑 .env 填写 ARK_API_KEY 后重新运行"
    else
      err "缺少 .env 文件，请创建并配置 ARK_API_KEY"
      exit 1
    fi
  fi
}

# ── 安装依赖 ─────────────────────────────────────────────────
install_deps() {
  log "安装 Python 依赖..."
  pip3 install -r "$PROJECT_DIR/backend/requirements.txt" -q
  ok "Python 依赖已安装"

  log "安装前端依赖..."
  cd "$PROJECT_DIR/frontend" && pnpm install --silent
  ok "前端依赖已安装"
  cd "$PROJECT_DIR"
}

# ── 启动后端 ─────────────────────────────────────────────────
start_backend() {
  log "启动后端 (FastAPI)..."
  cd "$PROJECT_DIR/backend"
  python3 -m uvicorn main:app --reload --port 8000 \
    --log-level info > "$BACKEND_LOG" 2>&1 &
  BACKEND_PID=$!

  # 等待后端就绪（最多 10s）
  for i in $(seq 1 20); do
    if curl -sf http://localhost:8000/docs > /dev/null 2>&1; then
      ok "后端已就绪  → http://localhost:8000"
      ok "API 文档    → http://localhost:8000/docs"
      return
    fi
    sleep 0.5
  done
  err "后端启动超时，查看日志: $BACKEND_LOG"
  exit 1
}

# ── 启动前端 ─────────────────────────────────────────────────
start_frontend() {
  log "启动前端 (Vite)..."
  cd "$PROJECT_DIR/frontend"
  npm run dev > "$FRONTEND_LOG" 2>&1 &
  FRONTEND_PID=$!

  # 等待前端就绪（最多 15s）
  for i in $(seq 1 30); do
    if curl -sf http://localhost:5173 > /dev/null 2>&1; then
      ok "前端已就绪  → http://localhost:5173"
      return
    fi
    sleep 0.5
  done
  err "前端启动超时，查看日志: $FRONTEND_LOG"
  exit 1
}

# ── 主流程 ───────────────────────────────────────────────────
echo ""
echo -e "${BLUE}╔══════════════════════════════════════╗${RESET}"
echo -e "${BLUE}║        Tuxin AI 个人工作台           ║${RESET}"
echo -e "${BLUE}╚══════════════════════════════════════╝${RESET}"
echo ""

# --install 模式：安装依赖
if [[ "$1" == "--install" ]]; then
  install_deps
fi

check_env
start_backend
start_frontend

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "  前端地址: ${CYAN}http://localhost:5173${RESET}"
echo -e "  后端地址: ${CYAN}http://localhost:8000${RESET}"
echo -e "  API 文档: ${CYAN}http://localhost:8000/docs${RESET}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "  按 ${YELLOW}Ctrl+C${RESET} 停止所有服务"
echo ""

# 持续输出实时日志（后端 + 前端交替）
tail -f "$BACKEND_LOG" "$FRONTEND_LOG" &
TAIL_PID=$!
wait "$BACKEND_PID" "$FRONTEND_PID"
kill "$TAIL_PID" 2>/dev/null
