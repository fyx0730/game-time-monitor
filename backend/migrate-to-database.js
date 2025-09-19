#!/usr/bin/env node

// 数据迁移脚本：从文件存储迁移到 SQLite 数据库
const fs = require('fs').promises;
const path = require('path');
const GameDatabase = require('./database');

const DATA_DIR = path.join(__dirname, 'data');

async function migrateData() {
    console.log('🔄 开始数据迁移：文件存储 → SQLite 数据库');
    
    const db = new GameDatabase();
    
    try {
        // 初始化数据库
        console.log('📝 步骤 1: 初始化数据库...');
        await db.initialize();
        console.log('✅ 数据库初始化完成');
        
        // 读取所有用户文件
        console.log('📝 步骤 2: 扫描现有用户数据...');
        const files = await fs.readdir(DATA_DIR);
        const userFiles = files.filter(file => file.endsWith('.json'));
        
        console.log(`📊 发现 ${userFiles.length} 个用户数据文件`);
        
        if (userFiles.length === 0) {
            console.log('ℹ️ 没有找到需要迁移的数据文件');
            return;
        }
        
        let successCount = 0;
        let errorCount = 0;
        
        // 逐个迁移用户数据
        for (const file of userFiles) {
            try {
                const userId = file.replace('.json', '');
                console.log(`📝 迁移用户: ${userId}`);
                
                // 读取文件数据
                const filePath = path.join(DATA_DIR, file);
                const fileContent = await fs.readFile(filePath, 'utf8');
                const userData = JSON.parse(fileContent);
                
                // 保存到数据库
                await db.saveUserData(userId, userData);
                
                successCount++;
                console.log(`  ✅ 迁移成功: ${userId}`);
                
            } catch (error) {
                errorCount++;
                console.error(`  ❌ 迁移失败: ${userId}`, error.message);
            }
        }
        
        // 验证迁移结果
        console.log('📝 步骤 3: 验证迁移结果...');
        const allUsers = await db.getAllUsers();
        
        console.log('\n🎉 数据迁移完成！');
        console.log('================');
        console.log(`📊 总文件数: ${userFiles.length}`);
        console.log(`✅ 成功迁移: ${successCount}`);
        console.log(`❌ 迁移失败: ${errorCount}`);
        console.log(`💾 数据库用户数: ${allUsers.length}`);
        
        // 显示用户摘要
        if (allUsers.length > 0) {
            console.log('\n👥 迁移用户摘要:');
            for (const user of allUsers.slice(0, 5)) { // 只显示前5个
                console.log(`  - ${user.userId}: ${user.name || '未知'} (总时长: ${Math.round(user.totalTime / 60000)}分钟)`);
            }
            if (allUsers.length > 5) {
                console.log(`  ... 及其他 ${allUsers.length - 5} 个用户`);
            }
        }
        
        console.log('\n💡 提示:');
        console.log('  1. 数据已成功迁移到 SQLite 数据库');
        console.log('  2. 原始 JSON 文件保持不变（作为备份）');
        console.log('  3. 服务器将优先使用数据库存储');
        console.log('  4. 可以通过 /api/health 接口查看数据库状态');
        
    } catch (error) {
        console.error('❌ 数据迁移失败:', error);
        throw error;
    } finally {
        await db.close();
        console.log('🔒 数据库连接已关闭');
    }
}

// 处理命令行参数
const args = process.argv.slice(2);
const isForced = args.includes('--force');
const isHelp = args.includes('--help') || args.includes('-h');

if (isHelp) {
    console.log('🎮 游戏时长监控 - 数据迁移工具');
    console.log('================================');
    console.log('');
    console.log('用法:');
    console.log('  node migrate-to-database.js [选项]');
    console.log('');
    console.log('选项:');
    console.log('  --force    强制迁移（跳过确认）');
    console.log('  --help     显示帮助信息');
    console.log('');
    console.log('示例:');
    console.log('  node migrate-to-database.js');
    console.log('  node migrate-to-database.js --force');
    process.exit(0);
}

// 运行迁移
async function main() {
    try {
        if (!isForced) {
            console.log('⚠️ 警告: 即将开始数据迁移');
            console.log('该操作将：');
            console.log('  1. 读取所有 JSON 文件中的用户数据');
            console.log('  2. 创建 SQLite 数据库表结构');
            console.log('  3. 将数据迁移到数据库中');
            console.log('  4. 保留原始 JSON 文件作为备份');
            console.log('');
            console.log('按 Ctrl+C 取消，或等待 5 秒开始迁移...');
            
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        await migrateData();
        process.exit(0);
        
    } catch (error) {
        console.error('\n💥 迁移过程中发生错误:', error.message);
        process.exit(1);
    }
}

main();