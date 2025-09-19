#!/bin/bash

# Railway 部署启动脚本

echo "🚄 Railway 部署启动..."
echo "📁 当前目录: $(pwd)"
echo "📋 环境变量:"
echo "  - NODE_ENV: ${NODE_ENV:-development}"
echo "  - PORT: ${PORT:-3001}"
echo "  - RAILWAY_PUBLIC_DOMAIN: ${RAILWAY_PUBLIC_DOMAIN:-未设置}"

# 检查必要文件
if [ ! -f "package.json" ]; then
    echo "❌ 错误: package.json 文件不存在"
    exit 1
fi

if [ ! -f "server.js" ]; then
    echo "❌ 错误: server.js 文件不存在"
    exit 1
fi

# 显示 package.json 信息
echo "📦 项目信息:"
node -p "JSON.stringify(require('./package.json'), ['name', 'version', 'main', 'scripts'], 2)"

# 检查依赖
echo "🔍 检查依赖..."
if [ ! -d "node_modules" ]; then
    echo "📥 安装依赖..."
    npm ci || npm install
fi

# 启动服务
echo "🚀 启动服务..."
exec node server.js