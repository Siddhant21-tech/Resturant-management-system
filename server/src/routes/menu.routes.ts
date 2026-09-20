import { Router } from 'express';
import { prisma } from '../db';

export const menuRouter = Router();

// Get full menu for a branch (grouped by category)
menuRouter.get('/branches/:branchId/menu', async (req, res) => {
  try {
    const categories = await prisma.menuCategory.findMany({
      where: { branchId: req.params.branchId },
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          include: {
            station: true,
          },
        },
      },
    });
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update item availability
menuRouter.patch('/menu/items/:id/availability', async (req, res) => {
  try {
    const { isAvailable } = req.body;
    const item = await prisma.menuItem.update({
      where: { id: req.params.id },
      data: { isAvailable },
    });
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
