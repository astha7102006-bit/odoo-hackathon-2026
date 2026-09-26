require('dotenv').config();
const { getDatabase } = require('./db/connection');
const { seedDatabase } = require('./db/seed');
const createApp = require('./app');

const PORT = process.env.PORT || 5000;

// Initialize database & run seed data
const db = getDatabase();
seedDatabase(db);
console.log('✅ SQLite database connected and seeded successfully.');

// Create and start Express server
const app = createApp(db);

const server = app.listen(PORT, () => {
  console.log(`🚀 StockSense Backend Server running on http://localhost:${PORT}`);
  console.log(`📦 Available endpoints:`);
  console.log(`   GET  /api/products`);
  console.log(`   GET  /api/locations`);
  console.log(`   GET  /api/stock`);
  console.log(`   POST /api/operations`);
  console.log(`   POST /api/operations/:id/validate`);
  console.log(`   GET  /api/operations`);
  console.log(`   GET  /api/moves`);
  console.log(`   GET  /api/dashboard`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    db.close();
    console.log('HTTP server and database closed');
  });
});
