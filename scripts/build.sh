#!/bin/bash

# ToolHub 打包脚本
# 用法: ./scripts/build.sh [platform]
# platform: mac | win | linux | all

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的信息
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# 获取项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# 读取版本号
VERSION=$(node -p "require('./package.json').version")
PRODUCT_NAME=$(node -p "require('./package.json').build.productName")

info "=========================================="
info "  $PRODUCT_NAME v$VERSION 打包脚本"
info "=========================================="

# 检查 Node.js 版本
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    error "Node.js 版本需要 16+，当前版本: $(node -v)"
fi
info "Node.js 版本: $(node -v)"

# 检查依赖
if [ ! -d "node_modules" ]; then
    warn "未检测到 node_modules，正在安装依赖..."
    npm install
fi

# 清理旧的构建产物
clean_dist() {
    info "清理旧的构建产物..."
    rm -rf dist/mac-arm64 dist/mac dist/win-unpacked dist/linux-unpacked
    rm -f dist/*.dmg dist/*.zip dist/*.exe dist/*.AppImage dist/*.deb dist/*.rpm
}

# 构建 TypeScript
build_ts() {
    info "构建 TypeScript..."
    npm run build
    success "TypeScript 构建完成"
}

# 打包 macOS
build_mac() {
    info "打包 macOS 版本..."
    npx electron-builder --mac dmg zip
    success "macOS 打包完成"
    echo ""
    info "输出文件:"
    ls -lh dist/*.dmg dist/*.zip 2>/dev/null || true
}

# 打包 Windows
build_win() {
    info "打包 Windows 版本..."
    npx electron-builder --win nsis portable
    success "Windows 打包完成"
    echo ""
    info "输出文件:"
    ls -lh dist/*.exe 2>/dev/null || true
}

# 打包 Linux
build_linux() {
    info "打包 Linux 版本..."
    npx electron-builder --linux AppImage deb
    success "Linux 打包完成"
    echo ""
    info "输出文件:"
    ls -lh dist/*.AppImage dist/*.deb 2>/dev/null || true
}

# 显示帮助
show_help() {
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  mac       打包 macOS 版本 (dmg + zip)"
    echo "  win       打包 Windows 版本 (nsis + portable)"
    echo "  linux     打包 Linux 版本 (AppImage + deb)"
    echo "  all       打包所有平台"
    echo "  clean     清理构建产物"
    echo "  help      显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 mac          # 打包 macOS"
    echo "  $0 win linux    # 打包 Windows 和 Linux"
    echo "  $0 all          # 打包所有平台"
    echo ""
}

# 主逻辑
if [ $# -eq 0 ]; then
    show_help
    exit 0
fi

# 解析参数
BUILD_MAC=false
BUILD_WIN=false
BUILD_LINUX=false
CLEAN_ONLY=false

for arg in "$@"; do
    case $arg in
        mac)
            BUILD_MAC=true
            ;;
        win)
            BUILD_WIN=true
            ;;
        linux)
            BUILD_LINUX=true
            ;;
        all)
            BUILD_MAC=true
            BUILD_WIN=true
            BUILD_LINUX=true
            ;;
        clean)
            CLEAN_ONLY=true
            ;;
        help|--help|-h)
            show_help
            exit 0
            ;;
        *)
            error "未知参数: $arg"
            ;;
    esac
done

# 执行清理
if [ "$CLEAN_ONLY" = true ]; then
    clean_dist
    success "清理完成"
    exit 0
fi

# 执行构建
clean_dist
build_ts

if [ "$BUILD_MAC" = true ]; then
    build_mac
fi

if [ "$BUILD_WIN" = true ]; then
    build_win
fi

if [ "$BUILD_LINUX" = true ]; then
    build_linux
fi

echo ""
success "=========================================="
success "  打包完成！"
success "=========================================="
echo ""
info "构建产物位于 dist/ 目录"
ls -lh dist/*.dmg dist/*.zip dist/*.exe dist/*.AppImage dist/*.deb 2>/dev/null || true
