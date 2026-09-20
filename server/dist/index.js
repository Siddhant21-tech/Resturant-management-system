"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const socket_1 = require("./socket");
const restaurant_routes_1 = require("./routes/restaurant.routes");
const menu_routes_1 = require("./routes/menu.routes");
const session_routes_1 = require("./routes/session.routes");
const order_routes_1 = require("./routes/order.routes");
const bill_routes_1 = require("./routes/bill.routes");
const audit_routes_1 = require("./routes/audit.routes");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
// Initialize real-time WebSocket engine
(0, socket_1.initSocketIO)(server);
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Register API Routes
app.use('/api', restaurant_routes_1.restaurantRouter);
app.use('/api', menu_routes_1.menuRouter);
app.use('/api', session_routes_1.sessionRouter);
app.use('/api', order_routes_1.orderRouter);
app.use('/api', bill_routes_1.billRouter);
app.use('/api', audit_routes_1.auditRouter);
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
