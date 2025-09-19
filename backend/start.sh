#!/bin/bash

# 游戏时长监控面板后台服务启动脚本

echo "🚀 正在启动游戏时长监控后台服务..."

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: Node.js 未安装"
    echo "请先安装 Node.js: https://nodejs.org/"
    exit 1
fi

# 检查 npm 是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: npm 未安装"
    exit 1
fi

# 进入后台目录
cd "$(dirname "$0")"

echo "📁 当前目录: $(pwd)"

# 检查 package.json 是否存在
if [ ! -f "package.json" ]; then
    echo "❌ 错误: package.json 文件不存在"
    exit 1
fi

# 安装依赖
echo "📦 正在安装依赖..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

echo "✅ 依赖安装完成"

# 创建数据目录
mkdir -p data
echo "📁 数据目录已创建: $(pwd)/data"

# 启动服务器
echo "🚀 正在启动服务器..."
echo "-----------------------------------"

npm start