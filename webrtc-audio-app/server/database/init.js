const { initDatabase } = require('./models');

async function initialize() {
    try {
        await initDatabase();
        console.log('✅ Database initialization completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        process.exit(1);
    }
}

initialize();
