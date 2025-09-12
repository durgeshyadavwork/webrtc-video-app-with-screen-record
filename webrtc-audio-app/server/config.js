require('dotenv').config();

module.exports = {
    // Server configuration
    port: process.env.PORT || 3000,
    environment: process.env.NODE_ENV || 'development',
    
    // Database configuration
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        name: process.env.DB_NAME || 'webrtc_app',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
    },
    
    // WebRTC configuration
    webrtc: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            {
                urls: 'turn:openrelay.metered.ca:80',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            },
            {
                urls: 'turn:openrelay.metered.ca:443',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            }
        ],
        maxUsersPerRoom: process.env.MAX_USERS_PER_ROOM || 5
    },
    
    // Recording configuration
    recording: {
        maxFileSize: process.env.MAX_RECORDING_SIZE || 100 * 1024 * 1024, // 100MB
        allowedMimeTypes: ['audio/wav'],
        storagePath: process.env.RECORDING_STORAGE_PATH || './storage/recordings'
    },
    
    // Security configuration
    security: {
        corsOrigin: process.env.CORS_ORIGIN || '*',
        rateLimit: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: process.env.RATE_LIMIT_MAX || 100
        }
    }
};
