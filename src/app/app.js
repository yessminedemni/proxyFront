// app.js
const express = require('express');
const path = require('path');
const apiRoutes = require('./routes/api');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api', apiRoutes);

// Start the server
app.listen(port, () => {
  console.log(`Dashboard available at http://localhost:${port}`);
});

module.exports = app;