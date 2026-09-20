import { Router } from 'express';
import { prisma } from '../db';

export const restaurantRouter = Router();

// Get all restaurants (multi-tenancy)
restaurantRouter.get('/restaurants', async (req, res) => {
  try {
    const restaurants = await prisma.restaurant.findMany({
      include: {
        branches: {
          include: {
            kitchenStations: true,
          },
        },
      },
    });
    res.json(restaurants);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get branches for a restaurant
restaurantRouter.get('/restaurants/:restaurantId/branches', async (req, res) => {
  try {
    const branches = await prisma.branch.findMany({
      where: { restaurantId: req.params.restaurantId },
      include: {
        kitchenStations: true,
        tables: true,
      },
    });
    res.json(branches);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all tables for a branch (with live session status)
restaurantRouter.get('/branches/:branchId/tables', async (req, res) => {
  try {
    const tables = await prisma.table.findMany({
      where: { branchId: req.params.branchId },
      orderBy: { number: 'asc' },
    });

    // Fetch active session info for occupied tables
    const populatedTables = await Promise.all(
      tables.map(async (table) => {
        let activeSession = null;
        if (table.currentSessionId) {
          activeSession = await prisma.diningSession.findUnique({
            where: { id: table.currentSessionId },
            include: {
              waiter: true,
              orders: {
                include: {
                  items: {
                    include: { menuItem: true, station: true },
                  },
                },
              },
            },
          });
        }
        return {
          ...table,
          activeSession,
        };
      })
    );

    res.json(populatedTables);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get kitchen stations for a branch
restaurantRouter.get('/branches/:branchId/stations', async (req, res) => {
  try {
    const stations = await prisma.kitchenStation.findMany({
      where: { branchId: req.params.branchId },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(stations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get staff users for a restaurant/branch
restaurantRouter.get('/branches/:branchId/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { branchId: req.params.branchId },
    });
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
