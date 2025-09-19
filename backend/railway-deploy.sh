#!/bin/bash

# Railway 部署和 CORS 配置脚本

echo "🚀 Railway 部署和 CORS 配置"
echo "=============================="

# 检查是否安装了 Railway CLI
if ! command -v railway &> /dev/null; then
    echo "❌ 未找到 Railway CLI"
    echo "请先安装: npm install -g @railway/cli"
    echo "然后运行: railway login"
    exit 1
fi

# 检查是否已登录
if ! railway whoami &> /dev/null; then
    echo "❌ 未登录 Railway"
    echo "请先运行: railway login"
    exit 1
fi

echo "✅ Railway CLI 已准备就绪"
echo ""

# 设置环境变量
echo "🔧 设置 CORS 环境变量..."

# 设置主要的 GitHub Pages 域名
railway variables set CORS_ORIGIN=https://fyx0730.github.io

# 设置生产环境标识
railway variables set NODE_ENV=production

# 设置端口（Railway 会自动提供，但设置默认值）
railway variables set PORT=3001

echo "✅ 环境变量设置完成"
echo ""

# 显示当前环境变量
echo "📋 当前环境变量:"
railway variables

echo ""
echo "🚀 开始部署..."

# 部署到 Railway
railway up

echo ""
echo "🎉 部署完成！"
echo ""
echo "📝 接下来的步骤："
echo "1. 检查部署状态: railway status"
echo "2. 查看日志: railway logs"
echo "3. 测试健康检查: curl https://your-app.up.railway.app/api/health"
echo ""
echo "🔗 CORS 已配置为允许："
echo "   - https://fyx0730.github.io"
echo "   - 所有 *.github.io 域名"
echo "   - localhost 开发环境"