const fs = require('fs');
const path = require('path');

// Ensure recordings directory exists
function ensureRecordingsDir() {
    const recordingsDir = path.join(__dirname, '../storage/recordings');
    if (!fs.existsSync(recordingsDir)) {
        fs.mkdirSync(recordingsDir, { recursive: true });
    }
    return recordingsDir;
}

// Generate unique filename for recording
function generateRecordingFilename() {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `recording-${timestamp}-${randomStr}.wav`;
}

// Validate recording file
function isValidRecordingFile(file) {
    const allowedMimeTypes = ['audio/wav', 'audio/x-wav'];
    const allowedExtensions = ['.wav'];
    
    const extension = path.extname(file.originalname).toLowerCase();
    return allowedMimeTypes.includes(file.mimetype) && 
           allowedExtensions.includes(extension);
}

// Calculate recording duration
function calculateDuration(startTime) {
    return Math.floor((Date.now() - startTime) / 1000);
}

module.exports = {
    ensureRecordingsDir,
    generateRecordingFilename,
    isValidRecordingFile,
    calculateDuration
};
