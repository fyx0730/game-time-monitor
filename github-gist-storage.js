// GitHub Gist 存储方案 - 免费的云端存储
class GitHubGistStorage {
    constructor() {
        this.apiBase = 'https://api.github.com';
        this.gistId = localStorage.getItem('gameMonitor_gistId') || null;
        this.accessToken = localStorage.getItem('gameMonitor_githubToken') || null;
        this.fileName = 'game-monitor-data.json';
    }

    // 设置 GitHub Token（用户需要在 GitHub 创建 Personal Access Token）
    setAccessToken(token) {
        this.accessToken = token;
        localStorage.setItem('gameMonitor_githubToken', token);
    }

    // 创建新的 Gist
    async createGist(data) {
        if (!this.accessToken) {
            throw new Error('需要设置 GitHub Access Token');
        }

        const gistData = {
            description: '游戏时长监控数据备份',
            public: false, // 私有 Gist
            files: {
                [this.fileName]: {
                    content: JSON.stringify(data, null, 2)
                }
            }
        };

        try {
            const response = await fetch(`${this.apiBase}/gists`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(gistData)
            });

            if (!response.ok) {
                throw new Error(`创建 Gist 失败: ${response.status}`);
            }

            const result = await response.json();
            this.gistId = result.id;
            localStorage.setItem('gameMonitor_gistId', this.gistId);
            
            console.log('✅ Gist 创建成功:', result.html_url);
            return result;

        } catch (error) {
            console.error('创建 Gist 失败:', error);
            throw error;
        }
    }

    // 更新现有的 Gist
    async updateGist(data) {
        if (!this.accessToken || !this.gistId) {
            throw new Error('需要设置 GitHub Access Token 和 Gist ID');
        }

        const gistData = {
            files: {
                [this.fileName]: {
                    content: JSON.stringify(data, null, 2)
                }
            }
        };

        try {
            const response = await fetch(`${this.apiBase}/gists/${this.gistId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(gistData)
            });

            if (!response.ok) {
                throw new Error(`更新 Gist 失败: ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ Gist 更新成功');
            return result;

        } catch (error) {
            console.error('更新 Gist 失败:', error);
            throw error;
        }
    }

    // 从 Gist 读取数据
    async loadFromGist() {
        if (!this.gistId) {
            throw new Error('没有设置 Gist ID');
        }

        try {
            const response = await fetch(`${this.apiBase}/gists/${this.gistId}`);

            if (!response.ok) {
                throw new Error(`读取 Gist 失败: ${response.status}`);
            }

            const result = await response.json();
            const fileContent = result.files[this.fileName]?.content;

            if (!fileContent) {
                throw new Error('Gist 中没有找到数据文件');
            }

            const data = JSON.parse(fileContent);
            console.log('✅ 从 Gist 加载数据成功');
            return data;

        } catch (error) {
            console.error('从 Gist 加载数据失败:', error);
            throw error;
        }
    }

    // 保存数据到 Gist
    async saveToGist(data) {
        try {
            const dataWithMeta = {
                ...data,
                lastSync: new Date().toISOString(),
                syncSource: 'github-gist',
                version: '2.0'
            };

            if (this.gistId) {
                return await this.updateGist(dataWithMeta);
            } else {
                return await this.createGist(dataWithMeta);
            }

        } catch (error) {
            console.error('保存到 Gist 失败:', error);
            throw error;
        }
    }

    // 获取设置状态
    getStatus() {
        return {
            hasToken: !!this.accessToken,
            hasGistId: !!this.gistId,
            gistId: this.gistId,
            configured: !!(this.accessToken && this.gistId)
        };
    }

    // 清除配置
    clearConfig() {
        this.accessToken = null;
        this.gistId = null;
        localStorage.removeItem('gameMonitor_githubToken');
        localStorage.removeItem('gameMonitor_gistId');
    }

    // 获取配置说明
    getConfigInstructions() {
        return {
            title: '配置 GitHub Gist 存储',
            steps: [
                '1. 访问 https://github.com/settings/tokens',
                '2. 点击 "Generate new token (classic)"',
                '3. 选择 scope: "gist" (创建和修改 Gist)',
                '4. 复制生成的 token',
                '5. 在设置中粘贴 token'
            ],
            note: '⚠️ Token 将保存在浏览器本地，请妥善保管'
        };
    }
}

// 导出类供全局使用
window.GitHubGistStorage = GitHubGistStorage;