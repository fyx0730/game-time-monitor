// 数据库功能测试脚本
const GameDatabase = require('./database');

async function testDatabase() {
    console.log('🔄 开始数据库功能测试...');
    
    const db = new GameDatabase();
    
    try {
        // 初始化数据库
        console.log('📝 步骤 1: 初始化数据库');
        await db.initialize();
        
        // 测试数据
        const testUserId = 'test_user_123';
        const testData = {
            players: [[testUserId, {
                id: testUserId,
                name: '测试用户',
                totalTime: 3600000, // 1小时
                sessions: [{
                    startTime: new Date().toISOString(),
                    endTime: new Date(Date.now() + 3600000).toISOString(),
                    duration: 3600000,
                    sessionId: 'session_1',
                    estimated: false
                }],
                isOnline: false
            }]],
            events: [{
                playerId: testUserId,
                type: 'game_start',
                timestamp: new Date().toISOString(),
                description: '游戏开始',
                sessionId: 'session_1'
            }, {
                playerId: testUserId,
                type: 'game_end',
                timestamp: new Date(Date.now() + 3600000).toISOString(),
                description: '游戏结束',
                sessionId: 'session_1'
            }]
        };
        
        // 测试保存数据
        console.log('📝 步骤 2: 保存测试数据');
        await db.saveUserData(testUserId, testData);
        console.log('✅ 数据保存成功');
        
        // 测试获取数据
        console.log('📝 步骤 3: 获取测试数据');
        const retrievedData = await db.getUserData(testUserId);
        console.log('✅ 数据获取成功');
        console.log('📊 获取的数据:', JSON.stringify(retrievedData, null, 2));
        
        // 测试获取所有用户
        console.log('📝 步骤 4: 获取所有用户列表');
        const allUsers = await db.getAllUsers();
        console.log('✅ 用户列表获取成功');
        console.log('👥 用户数量:', allUsers.length);
        
        // 测试统计数据
        console.log('📝 步骤 5: 获取统计数据');
        const stats = await db.getStatistics();
        console.log('✅ 统计数据获取成功');
        console.log('📈 统计数据:', JSON.stringify(stats, null, 2));
        
        // 清理测试数据
        console.log('📝 步骤 6: 清理测试数据');
        await db.deleteUser(testUserId);
        console.log('✅ 测试数据清理完成');
        
        console.log('🎉 数据库功能测试全部通过！');
        
    } catch (error) {
        console.error('❌ 数据库测试失败:', error);
    } finally {
        await db.close();
        console.log('🔒 数据库连接已关闭');
    }
}

// 运行测试
testDatabase().catch(console.error);