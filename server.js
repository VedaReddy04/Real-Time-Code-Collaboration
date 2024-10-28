const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// CORS setup to allow requests from the React app on port 3000
app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
}));

// Socket.IO with CORS configuration
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

const PORT = process.env.PORT || 5000;

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client', 'build')));

// Room data storage
const rooms = {};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('joinRoom', ({ roomId, username }) => {
        socket.join(roomId);
        socket.roomId = roomId;
        socket.username = username;
    
        // Initialize the room if it doesn't exist
        if (!rooms[roomId]) {
            rooms[roomId] = { code: '', language: 'java', users: [] };
        }
    
        // Check if the user is already in the list by socket ID
        const userExists = rooms[roomId].users.find(user => user.id === socket.id);
    
        // Only add the user if they don't already exist in the room
        if (!userExists) {
            rooms[roomId].users.push({ id: socket.id, name: username });
            io.to(roomId).emit('userJoinedMessage', `${username} has joined the room`);
        }
    
        // Emit the updated user list with just the usernames
        io.to(roomId).emit('updateUserList', { users: rooms[roomId].users.map(user => user.name) });
    
        // Send the latest code and language to the new user
        socket.emit('codeUpdate', rooms[roomId].code);
        socket.emit('languageUpdate', rooms[roomId].language);
    });
    

    socket.on('codeChange', ({ roomId, code }) => {
        if (rooms[roomId]) {
            // Update room's code on the server
            rooms[roomId].code = code;
            // Broadcast code changes to all users except the sender
            socket.to(roomId).emit('codeUpdate', code);
        }
    });

    socket.on('languageChange', ({ roomId, language }) => {
        if (rooms[roomId]) {
            // Update room's language on the server
            rooms[roomId].language = language;
            // Broadcast language changes to all users except the sender
            socket.to(roomId).emit('languageUpdate', language);
        }
    });

    socket.on('leaveRoom', ({ roomId, username }) => {
        if (roomId && rooms[roomId]) {
            // Remove the user by matching socket.id
            rooms[roomId].users = rooms[roomId].users.filter(user => user.id !== socket.id);
            
            // Emit updated user list
            io.to(roomId).emit('updateUserList', { users: rooms[roomId].users.map(user => user.name) });
    
            // Notify room that the user has left
            io.to(roomId).emit('userLeftMessage', `${username} has left the room`);
    
            // Clean up room if empty
            if (rooms[roomId].users.length === 0) {
                delete rooms[roomId];
            }
        }
    });
    

    socket.on('disconnect', () => {
        const { roomId, username } = socket;
        
        if (roomId && rooms[roomId]) {
            // Remove the user by matching socket.id
            rooms[roomId].users = rooms[roomId].users.filter(user => user.id !== socket.id);
            
            // Emit updated user list
            io.to(roomId).emit('updateUserList', { users: rooms[roomId].users.map(user => user.name) });

            // Notify room that the user has left
            io.to(roomId).emit('userLeftMessage', `${username} has left the room`);

            // Clean up room if empty
            if (rooms[roomId].users.length === 0) {
                delete rooms[roomId];
            }
        }

        console.log('A user disconnected:', socket.id);
    });
    
});


// Helper function to get version index for JDoodle
const getVersionIndex = (lang) => {
    switch (lang) {
        case 'c':
            return '5';
        case 'cpp':
            return '5';
        case 'python3':
            return '4';
        case 'java':
            return '4';
        default:
            return '0';
    }
};

// Route to handle code execution requests
app.post('/run', async (req, res) => {
    const { code, language, roomId } = req.body;

    const requestData = {
        script: code,
        language: language,
        versionIndex: getVersionIndex(language),
        clientId: process.env.JDOODLE_CLIENT_ID,
        clientSecret: process.env.JDOODLE_CLIENT_SECRET,
    };

    try {
        const response = await axios.post('https://api.jdoodle.com/v1/execute', requestData, {
            headers: { 'Content-Type': 'application/json' },
        });

        const output = response.data.output || 'No output returned';
        
        // Emit output to all users in the room
        io.to(roomId).emit('outputUpdate', output);

        // Send output to the user who triggered the run
        res.send({ output });
    } catch (error) {
        const errorMsg = 'Error executing code: ' + (error?.response?.data?.error || error.message);
        io.to(roomId).emit('outputUpdate', errorMsg); // Broadcast error to all users
        res.status(500).send({ output: errorMsg });
    }
});


// Serve the React app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
});

// Start the server
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
