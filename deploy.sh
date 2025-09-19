#!/bin/bash

# 游戏时长监控面板 - GitHub Pages 部署脚本

echo "🎮 游戏时长监控面板 - GitHub Pages 部署"
echo "==========================================="
echo ""
echo "📋 部署选项："
echo "1) 完整部署 (前端 + 说明如何部署后台)"
echo "2) 仅前端部署 (基础版本)"
echo "3) 查看部署状态"
echo "4) 退出"
echo ""
read -p "请选择部署方式 (1-4): " choice

case $choice in
    1)
        echo "🚀 开始完整部署..."
        ;;
    2)
        echo "🚀 开始前端部署..."
        ;;
    3)
        echo "📊 检查部署状态..."
        if git remote -v | grep -q "github.com"; then
            REPO_URL=$(git config --get remote.origin.url)
            GITHUB_URL=$(echo $REPO_URL | sed 's/.*github.com[:/]\([^/]*\)\/\([^.]*\).*/https:\/\/\1.github.io\/\2\//') 
            echo "🌐 GitHub Pages 地址: $GITHUB_URL"
            echo "📁 仓库地址: $REPO_URL"
            echo "🔄 最后提交: $(git log -1 --format='%h - %s (%cr)')"
        else
            echo "❌ 未找到 GitHub 远程仓库"
        fi
        exit 0
        ;;
    4)
        echo "👋 取消部署"
        exit 0
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

# 检查是否在 Git 仓库中
if [ ! -d ".git" ]; then
    echo "❌ 错误: 当前目录不是 Git 仓库"
    echo "请先运行: git init"
    exit 1
fi

# 检查是否有 GitHub 远程仓库
if ! git remote -v | grep -q "github.com"; then
    echo "❌ 错误: 未找到 GitHub 远程仓库"
    echo "请先添加 GitHub 仓库:"
    echo "git remote add origin https://github.com/用户名/仓库名.git"
    exit 1
fi

# 如果是完整部署，检查后台服务
if [ "$choice" = "1" ]; then
    if [ ! -d "backend" ]; then
        echo "⚠️  警告: 未找到 backend 目录"
        echo "将使用基础版本部署"
        choice="2"
    else
        echo "✅ 检测到后台服务目录"
    fi
fi

# 检查是否有未提交的更改
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 发现未提交的更改，正在提交..."
    
    # 添加所有文件
    git add .
    
    # 提示用户输入提交信息
    echo "请输入提交信息 (按回车使用默认信息):"
    read -r commit_message
    
    if [ -z "$commit_message" ]; then
        commit_message="更新: $(date '+%Y-%m-%d %H:%M:%S')"
    fi
    
    # 提交更改
    git commit -m "$commit_message"
    echo "✅ 已提交更改: $commit_message"
else
    echo "✅ 没有未提交的更改"
fi

# 推送到 GitHub
echo "📤 正在推送到 GitHub..."
git push origin main

if [ $? -eq 0 ]; then
    echo "🎉 部署成功！"
    echo ""
    GITHUB_URL=$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^/]*\)\/\([^.]*\).*/https:\/\/\1.github.io\/\2\//') 
    echo "🌐 你的网站将在几分钟内更新："
    echo "$GITHUB_URL"
    echo ""
    
    if [ "$choice" = "1" ]; then
        echo "📝 接下来的步骤："
        echo "1. 等待 GitHub Pages 部署完成 (3-5分钟)"
        echo "2. 访问上面的网址测试基础功能"
        echo "3. 按照 GITHUB_PAGES_DEPLOY.md 部署后台服务"
        echo "4. 启用云端存储功能"
        echo ""
        echo "📁 详细指南: GITHUB_PAGES_DEPLOY.md"
    else
        echo "📝 部署完成后："
        echo "1. 等待 3-5 分钟让更新生效"
        echo "2. 访问上面的网址使用基础版本"
        echo "3. 在设置中配置 MQTT Broker 地址"
    fi
    
    echo ""
    echo "💡 提示："
    echo "- 如果是首次部署，请在 GitHub 仓库设置中启用 Pages"
    echo "- 更新可能需要几分钟才能生效"
    echo "- 可以在仓库的 Actions 标签中查看部署状态"
else
    echo "❌ 推送失败，请检查网络连接和仓库权限"
    exit 1
fi