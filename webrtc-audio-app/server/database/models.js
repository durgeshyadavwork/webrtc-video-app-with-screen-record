const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// PostgreSQL connection pool
const pool = new Pool({
  user: process.env.DB_USER || 'webrtc_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'webrtc_app',
  password: process.env.DB_PASSWORD || 'Durgesh!123',
  port: process.env.DB_PORT || 5432,
});

// Initialize database tables
async function initDatabase() {
  try {
    // Create rooms table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        room_id VARCHAR(255) UNIQUE NOT NULL,
        room_name VARCHAR(255),
        created_by VARCHAR(255),
        max_participants INTEGER DEFAULT 5,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP
      )
    `);

    // Create participants table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS participants (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        room_id VARCHAR(255) NOT NULL,
        user_name VARCHAR(255),
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        left_at TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE
      )
    `);

    // Create recordings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS recordings (
        id SERIAL PRIMARY KEY,
        recording_id UUID NOT NULL,
        room_id VARCHAR(255) NOT NULL,
        file_name VARCHAR(255),
        file_path VARCHAR(500),
        file_size INTEGER,
        duration INTEGER,
        participants TEXT[],
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
  }
}

// Save recording to database
async function saveRecording(recordingData) {
  const {
    recording_id,
    room_id,
    room_name,
    file_name,
    file_path,
    file_size,
    duration,
    participants,
    created_by
  } = recordingData;

  // Ensure room_id is provided
  if (!room_id) {
    throw new Error('room_id is required for saving recording');
  }

  const query = `
    INSERT INTO recordings 
    (recording_id, room_id, file_name, file_path, file_size, duration, participants, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;

  const values = [
    recording_id || uuidv4(),
    room_id,
    file_name || `recording_${room_id}_${Date.now()}`,
    file_path,
    file_size,
    duration,
    participants || [],
    created_by || 'system'
  ];

  try {
    const result = await pool.query(query, values);
    console.log('Recording saved to database:', result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error('Error saving recording to database:', error);
    throw error;
  }
}

// Create room
async function createRoom(roomId, roomName, createdBy, maxParticipants = 5) {
  const query = `
    INSERT INTO rooms (room_id, room_name, created_by, max_participants)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (room_id) DO NOTHING
    RETURNING *
  `;
  
  try {
    const result = await pool.query(query, [roomId, roomName, createdBy, maxParticipants]);
    return result.rows[0];
  } catch (error) {
    console.error('Error creating room:', error);
    throw error;
  }
}

// Get room
async function getRoom(roomId) {
  const query = 'SELECT * FROM rooms WHERE room_id = $1';
  
  try {
    const result = await pool.query(query, [roomId]);
    return result.rows[0];
  } catch (error) {
    console.error('Error getting room:', error);
    throw error;
  }
}

// Add participant - FIXED VERSION (Simple INSERT)
async function addParticipant(userId, roomId, userName) {
  // Pehle check karein ki room exist karti hai ya nahi
  const roomExists = await getRoom(roomId);
  if (!roomExists) {
    // Agar room nahi hai toh pehle create karein
    await createRoom(roomId, roomId, 'system');
  }

  // Simple INSERT query without ON CONFLICT
  const query = `
    INSERT INTO participants (user_id, room_id, user_name)
    VALUES ($1, $2, $3)
    RETURNING *
  `;
  
  try {
    const result = await pool.query(query, [userId, roomId, userName]);
    return result.rows[0];
  } catch (error) {
    // Agar user already exists toh update karein
    if (error.code === '23505') { // unique violation
      const updateQuery = `
        UPDATE participants 
        SET joined_at = CURRENT_TIMESTAMP, left_at = NULL, user_name = $3
        WHERE user_id = $1 AND room_id = $2
        RETURNING *
      `;
      const updateResult = await pool.query(updateQuery, [userId, roomId, userName]);
      return updateResult.rows[0];
    }
    console.error('Error adding participant:', error);
    throw error;
  }
}

// Update participant left time
async function updateParticipantLeftTime(userId, roomId) {
  const query = `
    UPDATE participants 
    SET left_at = CURRENT_TIMESTAMP 
    WHERE user_id = $1 AND room_id = $2 AND left_at IS NULL
    RETURNING *
  `;
  
  try {
    const result = await pool.query(query, [userId, roomId]);
    return result.rows[0];
  } catch (error) {
    console.error('Error updating participant left time:', error);
    throw error;
  }
}

// Update participant count
async function updateParticipantCount(roomId, count) {
  // This function might not be needed if you're tracking count in application memory
  console.log(`Room ${roomId} now has ${count} participants`);
}

// Close room
async function closeRoom(roomId) {
  const query = `
    UPDATE rooms 
    SET closed_at = CURRENT_TIMESTAMP 
    WHERE room_id = $1 
    RETURNING *
  `;
  
  try {
    const result = await pool.query(query, [roomId]);
    return result.rows[0];
  } catch (error) {
    console.error('Error closing room:', error);
    throw error;
  }
}

// Update recording status function - FIXED VERSION
async function updateRecordingStatus(recordingId, status) {
  try {
    // First check if status column exists
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'recordings' AND column_name = 'status'
    `;
    
    const result = await pool.query(checkQuery);
    
    if (result.rows.length === 0) {
      console.log('Status column does not exist in recordings table. Skipping status update.');
      return { success: true, message: 'Status column not available' };
    }
    
    // If column exists, update status
    const query = `
      UPDATE recordings 
      SET status = $1 
      WHERE recording_id = $2 
      RETURNING *
    `;

    const updateResult = await pool.query(query, [status, recordingId]);
    console.log('Recording status updated:', updateResult.rows[0]);
    return updateResult.rows[0];
  } catch (error) {
    console.error('Error updating recording status:', error);
    // Don't throw error, just log it
    return { success: false, error: error.message };
  }
}

// Get recording by ID
async function getRecordingById(recordingId) {
  const query = 'SELECT * FROM recordings WHERE recording_id = $1';
  
  try {
    const result = await pool.query(query, [recordingId]);
    return result.rows[0];
  } catch (error) {
    console.error('Error getting recording:', error);
    throw error;
  }
}

// Get all recordings for a room
async function getRecordingsByRoom(roomId) {
  const query = 'SELECT * FROM recordings WHERE room_id = $1 ORDER BY created_at DESC';
  
  try {
    const result = await pool.query(query, [roomId]);
    return result.rows;
  } catch (error) {
    console.error('Error getting recordings for room:', error);
    throw error;
  }
}

// Get active participants count for a room
async function getActiveParticipantsCount(roomId) {
  const query = `
    SELECT COUNT(*) 
    FROM participants 
    WHERE room_id = $1 AND left_at IS NULL
  `;
  
  try {
    const result = await pool.query(query, [roomId]);
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('Error getting active participants count:', error);
    throw error;
  }
}

module.exports = {
  pool,
  initDatabase,
  createRoom,
  getRoom,
  saveRecording,
  addParticipant,
  updateParticipantLeftTime,
  updateParticipantCount,
  closeRoom,
  updateRecordingStatus,
  getRecordingById,
  getRecordingsByRoom,
  getActiveParticipantsCount
};
