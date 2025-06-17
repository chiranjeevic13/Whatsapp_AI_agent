require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');
const { loadConfigurations } = require('./src/utils/configLoader');
const chatController = require('./src/controllers/chatController');

// Initialize the app
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Load configurations
loadConfigurations().then(() => {
  console.log('Configurations loaded successfully');
}).catch(err => {
  console.error('Failed to load configurations:', err);
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected');

  // Handle new lead
  socket.on('new-lead', async (leadData) => {
    await chatController.handleNewLead(io, socket.id, leadData);
  });

  // Handle user message
socket.on('user-message', async (data) => {
    console.log("Received user message in app.js:", data);
    if (!data || !data.conversationId) {
        console.error("Missing conversation ID in user message");
        socket.emit('error', { message: 'Missing conversation ID. Please start a new chat.' });
        return;
    }
    await chatController.handleUserMessage(io, socket.id, data);
});
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API to get all classifications
app.get('/api/classifications', (req, res) => {
  const fs = require('fs');
  try {
    const data = fs.readFileSync('./data/classifications.json', 'utf8');
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch classifications' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});