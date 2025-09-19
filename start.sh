#!/bin/bash

# 游戏时长监控面板 - 一键启动脚本

echo "🎮 游戏时长监控面板启动器"
echo "=========================="

# 检查是否存在后台目录
if [ -d "backend" ]; then
    echo ""
    echo "检测到后台服务，请选择启动方式："
    echo "1) 完整版本 (包含云端存储功能)"
    echo "2) 基础版本 (仅本地存储)"
    echo "3) 退出"
    echo ""
    read -p "请输入选择 (1-3): " choice
    
    case $choice in
        1)
            echo "🚀 启动完整版本..."
            cd backend
            if [ ! -f "node_modules/.package-lock.json" ] && [ ! -f "package-lock.json" ]; then
                echo "📦 正在安装后台依赖..."
                npm install
            fi
            echo "🌐 后台服务启动中，请稍候..."
            echo "📱 启动完成后请访问: http://localhost:3001"
            npm start
            ;;
        2)
            echo "🚀 启动基础版本..."
            if command -v python3 &> /dev/null; then
                echo "📱 请访问: http://localhost:8000"
                python3 -m http.server 8000
            elif command -v python &> /dev/null; then
                echo "📱 请访问: http://localhost:8000"
                python -m http.server 8000
            elif command -v php &> /dev/null; then
                echo "📱 请访问: http://localhost:8000"
                php -S localhost:8000
            else
                echo "❌ 未找到 Python 或 PHP，请手动用浏览器打开 index.html"
                if command -v open &> /dev/null; then
                    open index.html
                elif command -v xdg-open &> /dev/null; then
                    xdg-open index.html
                fi
            fi
            ;;
        3)
            echo "👋 再见！"
            exit 0
            ;;
        *)
            echo "❌ 无效选择"
            exit 1
            ;;
    esac
else
    echo "🚀 启动基础版本..."
    if command -v python3 &> /dev/null; then
        echo "📱 请访问: http://localhost:8000"
        python3 -m http.server 8000
    elif command -v python &> /dev/null; then
        echo "📱 请访问: http://localhost:8000"
        python -m http.server 8000
    elif command -v php &> /dev/null; then
        echo "📱 请访问: http://localhost:8000"
        php -S localhost:8000
    else
        echo "❌ 未找到 Python 或 PHP，请手动用浏览器打开 index.html"
        if command -v open &> /dev/null; then
            open index.html
        elif command -v xdg-open &> /dev/null; then
            xdg-open index.html
        fi
    fi
fi