"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitToTable = exports.emitToStation = exports.emitToBranch = exports.getIO = exports.initSocketIO = void 0;
const socket_io_1 = require("socket.io");
let io = null;
const initSocketIO = (httpServer) => {
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        },
    });
    io.on('connection', (socket) => {
        console.log(`[Socket.IO] Client connected: ${socket.id}`);
        // Join branch room (general restaurant activity, tables, cashier)
        socket.on('join_branch', (branchId) => {
            socket.join(`branch_${branchId}`);
            console.log(`[Socket.IO] ${socket.id} joined branch_${branchId}`);
        });
        // Join kitchen station room (e.g. Main Kitchen, Bar, Bakery)
        socket.on('join_station', (stationId) => {
            socket.join(`station_${stationId}`);
            console.log(`[Socket.IO] ${socket.id} joined station_${stationId}`);
        });
        // Join table/customer room
        socket.on('join_table', (tableId) => {
            socket.join(`table_${tableId}`);
            console.log(`[Socket.IO] ${socket.id} joined table_${tableId}`);
        });
        socket.on('disconnect', () => {
            console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
        });
    });
    return io;
};
exports.initSocketIO = initSocketIO;
const getIO = () => {
    if (!io) {
        throw new Error('Socket.IO not initialized');
    }
    return io;
};
exports.getIO = getIO;
// Dispatch helpers
const emitToBranch = (branchId, event, data) => {
    if (io) {
        io.to(`branch_${branchId}`).emit(event, data);
        // Also emit universally for convenience during demo
        io.emit(event, data);
    }
};
exports.emitToBranch = emitToBranch;
const emitToStation = (stationId, event, data) => {
    if (io) {
        io.to(`station_${stationId}`).emit(event, data);
    }
};
exports.emitToStation = emitToStation;
const emitToTable = (tableId, event, data) => {
    if (io) {
        io.to(`table_${tableId}`).emit(event, data);
    }
};
exports.emitToTable = emitToTable;
