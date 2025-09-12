const express = require('express');
const router = express.Router();
const { getRoom, getRecordings, getRoomParticipants } = require('../database/models');

// Get all active rooms
router.get('/rooms', (req, res) => {
  // This would typically query your in-memory rooms store
  // For production, you might want to store active rooms in database
  const roomList = [];
  for (let [roomName, room] of req.app.get('io').rooms) {
    if (roomName !== roomName) { // Skip individual socket rooms
      roomList.push({
        name: roomName,
        users: room.length,
        userList: room.sockets
      });
    }
  }
  res.json(roomList);
});

// Get room details
router.get('/rooms/:roomId', async (req, res) => {
  try {
    const room = await getRoom(req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get room participants
router.get('/rooms/:roomId/participants', async (req, res) => {
  try {
    const participants = await getRoomParticipants(req.params.roomId);
    res.json(participants);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get recordings
router.get('/recordings', async (req, res) => {
  try {
    const { roomId } = req.query;
    const recordings = await getRecordings(roomId || null);
    res.json(recordings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get recording by ID
router.get('/recordings/:recordingId', async (req, res) => {
  try {
    const recordings = await getRecordings();
    const recording = recordings.find(r => r.recording_id === req.params.recordingId);
    
    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }
    
    res.json(recording);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API documentation
router.get('/docs', (req, res) => {
  res.json({
    endpoints: {
      'GET /api/rooms': 'Get all active rooms',
      'GET /api/rooms/:roomId': 'Get specific room details',
      'GET /api/rooms/:roomId/participants': 'Get room participants',
      'GET /api/recordings': 'Get all recordings (optional roomId query parameter)',
      'GET /api/recordings/:recordingId': 'Get specific recording'
    }
  });
});

module.exports = router;
