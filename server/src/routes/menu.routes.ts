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

menuRouter.patch('/menu/items/:id', async (req, res) => {
  try {
    const { name, price, isAvailable } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = String(name).trim();
    if (price !== undefined) data.price = Number(price);
    if (isAvailable !== undefined) data.isAvailable = Boolean(isAvailable);
    const item = await prisma.menuItem.update({ where: { id: req.params.id }, data });
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

menuRouter.post('/branches/:branchId/menu/items', async (req, res) => {
  try {
    const { categoryId, name, price, prepTimeMinutes = 15, isVeg = true, isAvailable = true } = req.body;
    if (!categoryId || !String(name || '').trim() || Number(price) < 0) {
      return res.status(400).json({ error: 'Category, item name, and valid price are required' });
    }
    const category = (await prisma.menuCategory.findMany({ where: { branchId: req.params.branchId } }))
      .find((item: any) => item.id === categoryId);
    if (!category) return res.status(404).json({ error: 'Menu category not found for this branch' });
    const stations = await prisma.kitchenStation.findMany({ where: { branchId: req.params.branchId } });
    const item = await prisma.menuItem.create({
      data: {
        branchId: req.params.branchId,
        categoryId,
        name: String(name).trim(),
        price: Number(price),
        prepTimeMinutes: Math.max(1, Number(prepTimeMinutes)),
        isVeg: Boolean(isVeg),
        isAvailable: Boolean(isAvailable),
        stationId: stations[0]?.id || null,
      },
    });
    res.status(201).json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
