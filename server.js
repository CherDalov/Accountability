const express = require('express');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse incoming JSON requests
app.use(express.json());
app.use(cors());

// Session management middleware
app.use(session({
    secret: 'yourSecretKey',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true in production when using HTTPS
}));

// In-memory storage for users and tasks (use a database in production)
let users = [];
let tasks = {};

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Register endpoint
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    const existingUser = users.find(user => user.username === username);

    if (existingUser) {
        return res.json({ success: false, message: 'Username already exists.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    users.push({ username, password: hashedPassword });
    res.json({ success: true });
});

// Login endpoint
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(user => user.username === username);

    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.json({ success: false, message: 'Invalid credentials.' });
    }

    // Store user info in session
    req.session.user = username;
    res.json({ success: true });
});

// Logout endpoint
app.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Check if authenticated
app.get('/isAuthenticated', (req, res) => {
    if (req.session.user) {
        res.json({ isAuthenticated: true });
    } else {
        res.json({ isAuthenticated: false });
    }
});

// Add a new task
app.post('/tasks', (req, res) => {
    const { task, day } = req.body;
    const user = req.session.user;

    if (!user) {
        return res.status(403).json({ message: 'Unauthorized' });
    }

    if (!tasks[user]) {
        tasks[user] = {};
    }

    if (!tasks[user][day]) {
        tasks[user][day] = [];
    }

    const newTask = { id: tasks[user][day].length + 1, text: task, completed: false };
    tasks[user][day].push(newTask);
    res.status(201).json(newTask);
});

// Get all tasks
app.get('/tasks', (req, res) => {
    const user = req.session.user;

    if (!user) {
        return res.status(403).json({ message: 'Unauthorized' });
    }

    res.json(tasks[user] || {});
});

// Update task status
app.put('/tasks/:day/:taskId', (req, res) => {
    const { day, taskId } = req.params;
    const { completed } = req.body;
    const user = req.session.user;

    if (!user) {
        return res.status(403).json({ message: 'Unauthorized' });
    }

    if (tasks[user] && tasks[user][day]) {
        const task = tasks[user][day].find(t => t.id === parseInt(taskId));
        if (task) {
            task.completed = completed;
            return res.json({ success: true });
        }
    }

    res.status(404).json({ message: 'Task not found' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
