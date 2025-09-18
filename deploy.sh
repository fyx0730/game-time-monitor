#!/bin/bash

# 游戏时长监控面板 - GitHub Pages 部署脚本

echo "🚀 开始部署到 GitHub Pages..."

# 检查是否在 Git 仓库中
if [ ! -d ".git" ]; then
    echo "❌ 错误: 当前目录不是 Git 仓库"
    echo "请先运行: git init"
    exit 1
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
    echo "你的网站将在几分钟内更新："
    echo "https://$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^/]*\)\/\([^.]*\).*/\1.github.io\/\2/')/"
    echo ""
    echo "💡 提示："
    echo "- 如果这是首次部署，请在 GitHub 仓库设置中启用 Pages"
    echo "- 更新可能需要几分钟才能生效"
    echo "- 可以在仓库的 Actions 标签中查看部署状态"
else
    echo "❌ 推送失败，请检查网络连接和仓库权限"
    exit 1
fi