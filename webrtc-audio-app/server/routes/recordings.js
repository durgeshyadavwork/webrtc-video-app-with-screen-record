const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { saveRecording, updateRecordingStatus, getRecordingById, getRecordingsByRoom } = require('../database/models');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const { recordingId, roomId } = req.body;
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    
    // Use provided values or defaults to prevent 'undefined' filenames
    const safeRoomId = roomId || 'unknown_room';
    const safeRecordingId = recordingId || 'unknown_recording';
    
    cb(null, `recording_${safeRoomId}_${safeRecordingId}_${timestamp}${extension}`);
  }
});

// File filter to accept multiple audio formats - FIXED
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'audio/wav',
    'audio/webm',
    'audio/mpeg',
    'audio/mp4',
    'audio/ogg',
    'audio/x-m4a',
    'audio/x-wav',
    'audio/aac',
    'audio/x-aac'
  ];
  
  const allowedExtensions = ['.wav', '.webm', '.mp3', '.m4a', '.ogg', '.mp4', '.aac'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type. Allowed types: ${allowedExtensions.join(', ')}`), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Upload recording endpoint - FIXED
router.post('/upload', upload.single('recording'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded or invalid file type' 
      });
    }

    const { roomId, recordingId, duration, participants, createdBy } = req.body;
    
    // Validate required fields
    if (!roomId || !recordingId) {
      // Delete the uploaded file if required data is missing
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ 
        success: false, 
        error: 'roomId and recordingId are required' 
      });
    }

    // Parse participants if it's a string
    let participantsArray = [];
    try {
      participantsArray = typeof participants === 'string' ? 
        JSON.parse(participants) : 
        (Array.isArray(participants) ? participants : []);
    } catch (e) {
      console.error('Error parsing participants:', e);
      participantsArray = [];
    }

    // Update recording in database with file info
    const recording = await saveRecording({
      recording_id: recordingId,
      room_id: roomId,
      file_name: req.file.filename,
      file_path: req.file.path,
      file_size: req.file.size,
      duration: parseInt(duration) || 0,
      participants: participantsArray,
      created_by: createdBy
    });

    // Update recording status to completed (won't fail if status column doesn't exist)
    try {
      const statusUpdate = await updateRecordingStatus(recordingId, 'completed');
      if (statusUpdate && !statusUpdate.success) {
        console.log('Status update failed, but recording was saved:', statusUpdate.error);
      }
    } catch (statusError) {
      console.log('Status update failed, but recording was saved:', statusError.message);
    }

    res.json({
      success: true,
      message: 'Recording uploaded successfully',
      recording: recording
    });

  } catch (error) {
    console.error('Error uploading recording:', error);
    
    // Delete the uploaded file if there was an error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get recordings for a room
router.get('/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const recordings = await getRecordingsByRoom(roomId);
    
    res.json({
      success: true,
      recordings: recordings
    });
  } catch (error) {
    console.error('Error getting recordings:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get recording by ID
router.get('/:recordingId', async (req, res) => {
  try {
    const { recordingId } = req.params;
    const recording = await getRecordingById(recordingId);
    
    if (!recording) {
      return res.status(404).json({ 
        success: false, 
        error: 'Recording not found' 
      });
    }
    
    res.json({
      success: true,
      recording: recording
    });
  } catch (error) {
    console.error('Error getting recording:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Download recording
router.get('/download/:recordingId', async (req, res) => {
  try {
    const { recordingId } = req.params;
    const recording = await getRecordingById(recordingId);
    
    if (!recording || !recording.file_path) {
      return res.status(404).json({ 
        success: false, 
        error: 'Recording file not found' 
      });
    }

    if (!fs.existsSync(recording.file_path)) {
      return res.status(404).json({ 
        success: false, 
        error: 'Recording file not found on server' 
      });
    }

    res.download(recording.file_path, recording.file_name || `recording_${recordingId}.webm`);
  } catch (error) {
    console.error('Error downloading recording:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Delete recording
router.delete('/:recordingId', async (req, res) => {
  try {
    const { recordingId } = req.params;
    const recording = await getRecordingById(recordingId);
    
    if (!recording) {
      return res.status(404).json({ 
        success: false, 
        error: 'Recording not found' 
      });
    }

    // Delete file from filesystem if it exists
    if (recording.file_path && fs.existsSync(recording.file_path)) {
      fs.unlinkSync(recording.file_path);
    }

    // Delete from database
    const deleteQuery = 'DELETE FROM recordings WHERE recording_id = $1 RETURNING *';
    const result = await pool.query(deleteQuery, [recordingId]);
    
    res.json({
      success: true,
      message: 'Recording deleted successfully',
      recording: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting recording:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Health check endpoint for recordings
router.get('/health/status', async (req, res) => {
  try {
    // Test database connection
    const result = await pool.query('SELECT COUNT(*) FROM recordings');
    res.json({
      status: 'ok',
      total_recordings: parseInt(result.rows[0].count),
      upload_directory: uploadsDir,
      directory_exists: fs.existsSync(uploadsDir),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

module.exports = router;
