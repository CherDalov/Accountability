const express = require('express');
const cors = require('cors'); // Enable CORS for frontend requests (if necessary)
const fs = require('fs');
const path = require('path');
const session = require('express-session'); // For session management
const bcrypt = require('bcrypt'); // For password hashing

const app = express();
const PORT = process.env.PORT || 3000;

// File paths for data
const tasksFilePath = path.join(__dirname, 'tasks.json');
const usersFilePath = path.join(__dirname, 'users.json');

// Middleware to parse incoming JSON requests
app.use(express.json());

// Session middleware
app.use(session({
    secret: 'your-secret-key', // Replace with a strong secret key in production
    resave: false,
    saveUninitialized: false,
}));

// Serve static files from the root directory
app.use(express.static(path.join(__dirname)));

// Default route to serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html')); // Ensure this matches your main HTML file name
});

// In-memory storage for tasks and users
let tasks = {};
let users = {};

// Load tasks from file
if (fs.existsSync(tasksFilePath)) {
    const data = fs.readFileSync(tasksFilePath);
    tasks = JSON.parse(data);
}

// Load users from file
if (fs.existsSync(usersFilePath)) {
    const data = fs.readFileSync(usersFilePath);
    users = JSON.parse(data);
}

// Function to save tasks to file
function saveTasksToFile() {
    fs.writeFileSync(tasksFilePath, JSON.stringify(tasks));
}

// Function to save users to file
function saveUsersToFile() {
    fs.writeFileSync(usersFilePath, JSON.stringify(users));
}

// Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session && req.session.username) {
        return next();
    } else {
        res.status(401).json({ message: 'Unauthorized' });
    }
}

// Endpoint to register a new user
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    if (users[username]) {
        return res.status(409).json({ message: 'Username already exists.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        users[username] = { password: hashedPassword };
        saveUsersToFile();
        res.status(201).json({ message: 'User registered successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error registering user.' });
    }
});

// Endpoint to log in a user
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    const user = users[username];

    if (!user) {
        return res.status(400).json({ message: 'Invalid username or password.' });
    }

    try {
        const match = await bcrypt.compare(password, user.password);
        if (match) {
            req.session.username = username;
            res.json({ message: 'Login successful.' });
        } else {
            res.status(400).json({ message: 'Invalid username or password.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error logging in.' });
    }
});

// Endpoint to log out a user
app.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logout successful.' });
});

// Endpoint to add a task (requires authentication)
app.post('/tasks', isAuthenticated, (req, res) => {
    const { task, day } = req.body;
    const username = req.session.username;

    if (!task || !day) {
        return res.status(400).json({ message: 'Task and day are required.' });
    }

    // Initialize user's tasks if not present
    if (!tasks[username]) {
        tasks[username] = {};
    }

    if (!tasks[username][day]) {
        tasks[username][day] = [];
    }

    const newTask = {
        id: tasks[username][day].length + 1,
        text: task,
        completed: false
    };

    tasks[username][day].push(newTask);
    saveTasksToFile();
    res.status(201).json(newTask);
});

// Endpoint to get all tasks for the logged-in user
app.get('/tasks', isAuthenticated, (req, res) => {
    const username = req.session.username;
    res.json(tasks[username] || {});
});

// Endpoint to toggle task completion (requires authentication)
app.put('/tasks/:day/:id', isAuthenticated, (req, res) => {
    const { day, id } = req.params;
    const username = req.session.username;

    if (tasks[username] && tasks[username][day]) {
        const task = tasks[username][day].find(t => t.id === parseInt(id));
        if (task) {
            task.completed = !task.completed; // Toggle completion
            saveTasksToFile();
            return res.json(task);
        }
    }
    res.status(404).json({ message: 'Task not found.' });
});

// Endpoint to delete a task (requires authentication)
app.delete('/tasks/:day/:id', isAuthenticated, (req, res) => {
    const { day, id } = req.params;
    const username = req.session.username;

    if (tasks[username] && tasks[username][day]) {
        tasks[username][day] = tasks[username][day].filter(t => t.id !== parseInt(id));
        // Reassign IDs to maintain consistency
        tasks[username][day].forEach((task, index) => task.id = index + 1);
        saveTasksToFile();
        return res.json({ message: 'Task deleted successfully.' });
    }
    res.status(404).json({ message: 'Task not found.' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
