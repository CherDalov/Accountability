const express = require('express');
const cors = require('cors'); // Enable CORS for frontend requests
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// File path for tasks data
const dataFilePath = path.join(__dirname, 'tasks.json');

// Middleware to parse incoming JSON requests
app.use(express.json());
app.use(cors()); // Allow requests from any origin (CORS policy)

// In-memory storage for tasks
let tasks = {};

// Load tasks from file
if (fs.existsSync(dataFilePath)) {
    const data = fs.readFileSync(dataFilePath);
    tasks = JSON.parse(data);
}

// Function to save tasks to file
function saveTasksToFile() {
    fs.writeFileSync(dataFilePath, JSON.stringify(tasks));
}

// Endpoint to add a task
app.post('/tasks', (req, res) => {
    const { task, day } = req.body;

    if (!task || !day) {
        return res.status(400).json({ message: 'Task and day are required.' });
    }

    // If the day doesn't exist in tasks, initialize it
    if (!tasks[day]) {
        tasks[day] = [];
    }

    const newTask = {
        id: tasks[day].length + 1, // Simple ID assignment
        text: task,
        completed: false
    };

    tasks[day].push(newTask); // Add the task to the appropriate day
    saveTasksToFile();
    res.status(201).json(newTask);
});

// Endpoint to get all tasks
app.get('/tasks', (req, res) => {
    res.json(tasks);
});

// Endpoint to toggle task completion
app.put('/tasks/:day/:id', (req, res) => {
    const { day, id } = req.params;
    if (tasks[day]) {
        const task = tasks[day].find(t => t.id === parseInt(id));
        if (task) {
            task.completed = !task.completed; // Toggle completion
            saveTasksToFile();
            return res.json(task);
        }
    }
    res.status(404).json({ message: 'Task not found.' });
});

// Endpoint to delete a task
app.delete('/tasks/:day/:id', (req, res) => {
    const { day, id } = req.params;
    if (tasks[day]) {
        tasks[day] = tasks[day].filter(t => t.id !== parseInt(id));
        // Reassign IDs to maintain consistency
        tasks[day].forEach((task, index) => task.id = index + 1);
        saveTasksToFile();
        return res.json({ message: 'Task deleted successfully.' });
    }
    res.status(404).json({ message: 'Task not found.' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
