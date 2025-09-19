#!/usr/bin/env node

// 简化版数据库测试
console.log('🔄 开始 SQLite 数据库测试...');

// 检查依赖
try {
    const { Sequelize, DataTypes } = require('sequelize');
    console.log('✅ Sequelize 依赖加载成功');
    
    // 创建简单的数据库连接
    const sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: './data/test.db',
        logging: false
    });
    
    // 测试连接
    sequelize.authenticate()
        .then(() => {
            console.log('✅ SQLite 数据库连接成功');
            
            // 创建简单表
            const User = sequelize.define('user', {
                name: DataTypes.STRING,
                totalTime: DataTypes.INTEGER
            });
            
            return User.sync();
        })
        .then(() => {
            console.log('✅ 数据表创建成功');
            console.log('🎉 SQLite 数据库功能正常！');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ 数据库测试失败:', error.message);
            process.exit(1);
        });
        
} catch (error) {
    console.error('❌ 依赖加载失败:', error.message);
    console.log('请运行: npm install sqlite3 sequelize');
    process.exit(1);
}