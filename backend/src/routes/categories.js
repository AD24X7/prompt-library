const express = require('express');
const { prisma } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all categories
router.get('/', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { prompts: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    const enrichedCategories = categories.map(category => ({
      ...category,
      promptCount: category._count.prompts
    }));

    res.json({ data: enrichedCategories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create category (admin only - for now just require auth)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, color, icon } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const existingCategory = await prisma.category.findUnique({
      where: { name }
    });

    if (existingCategory) {
      return res.status(400).json({ error: 'Category with this name already exists' });
    }

    const newCategory = await prisma.category.create({
      data: {
        name,
        description: description || null,
        color: color || null,
        icon: icon || null
      }
    });
    
    res.status(201).json({ data: newCategory });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const updatedCategory = await prisma.category.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        updatedAt: new Date()
      }
    });
    
    res.json({ data: updatedCategory });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: { prompts: true }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    if (category._count.prompts > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category that contains prompts' 
      });
    }
    
    await prisma.category.delete({
      where: { id: req.params.id }
    });
    
    res.status(204).send();
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;