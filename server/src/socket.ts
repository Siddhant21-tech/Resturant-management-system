import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

let io: SocketIOServer | null = null;

export const initSocketIO = (httpServer: HTTPServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Join branch room (general restaurant activity, tables, cashier)
    socket.on('join_branch', (branchId: string) => {
      socket.join(`branch_${branchId}`);
      console.log(`[Socket.IO] ${socket.id} joined branch_${branchId}`);
    });

    // Join kitchen station room (e.g. Main Kitchen, Bar, Bakery)
    socket.on('join_station', (stationId: string) => {
      socket.join(`station_${stationId}`);
      console.log(`[Socket.IO] ${socket.id} joined station_${stationId}`);
    });

    // Join table/customer room
    socket.on('join_table', (tableId: string) => {
      socket.join(`table_${tableId}`);
      console.log(`[Socket.IO] ${socket.id} joined table_${tableId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

// Dispatch helpers
export const emitToBranch = (branchId: string, event: string, data: any) => {
  if (io) {
    io.to(`branch_${branchId}`).emit(event, data);
    // Also emit universally for convenience during demo
    io.emit(event, data);
  }
};

export const emitToStation = (stationId: string, event: string, data: any) => {
  if (io) {
    io.to(`station_${stationId}`).emit(event, data);
  }
};

export const emitToTable = (tableId: string, event: string, data: any) => {
  if (io) {
    io.to(`table_${tableId}`).emit(event, data);
  }
};
