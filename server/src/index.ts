import express from 'express';
import http from 'http';
import cors from 'cors';
import { initSocketIO } from './socket';
import { restaurantRouter } from './routes/restaurant.routes';
import { menuRouter } from './routes/menu.routes';
import { sessionRouter } from './routes/session.routes';
import { orderRouter } from './routes/order.routes';
import { billRouter } from './routes/bill.routes';
import { auditRouter } from './routes/audit.routes';

const app = express();
const server = http.createServer(app);

// Initialize real-time WebSocket engine
initSocketIO(server);

app.use(cors());
app.use(express.json());

// Register API Routes
app.use('/api', restaurantRouter);
app.use('/api', menuRouter);
app.use('/api', sessionRouter);
app.use('/api', orderRouter);
app.use('/api', billRouter);
app.use('/api', auditRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'Event/Order-Based Restaurant Management Engine',
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 [Restaurant Engine API] Server running on http://localhost:${PORT}`);
  console.log(`⚡ [Real-Time WebSocket] Socket.IO server ready on port ${PORT}`);
});
