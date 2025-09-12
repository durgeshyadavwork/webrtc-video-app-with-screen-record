// Generate random room ID
function generateRoomId() {
    return Math.random().toString(36).substring(2, 10);
}

// Validate room name
function isValidRoomName(roomName) {
    const regex = /^[a-zA-Z0-9-_]{1,50}$/;
    return regex.test(roomName);
}

// Extract user ID from socket
function getUserId(socket) {
    return socket.id.substring(0, 8);
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Error handler
function handleError(res, error, message = 'Internal server error') {
    console.error('Error:', error);
    res.status(500).json({ error: message, details: error.message });
}

module.exports = {
    generateRoomId,
    isValidRoomName,
    getUserId,
    formatFileSize,
    handleError
};
