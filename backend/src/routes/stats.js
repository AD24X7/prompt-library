const express = require('express');
const { prisma } = require('../database');
const activityService = require('../services/activityService');

const router = express.Router();

// Get general statistics
router.get('/', async (req, res) => {
  try {
    const [
      totalPrompts,
      totalCategories,
      totalUsers,
      totalReviews,
      topCategories,
      recentPrompts,
      topRatedPrompts
    ] = await Promise.all([
      // Total counts
      prisma.prompt.count(),
      prisma.category.count(),
      prisma.user.count(),
      prisma.review.count(),
      
      // Top categories by prompt count
      prisma.category.findMany({
        include: {
          _count: {
            select: { prompts: true }
          }
        },
        orderBy: {
          prompts: {
            _count: 'desc'
          }
        },
        take: 5
      }),
      
      // Recent prompts
      prisma.prompt.findMany({
        include: {
          author: {
            select: { id: true, name: true, avatar: true }
          },
          _count: {
            select: { reviews: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),
      
      // Top rated prompts
      prisma.prompt.findMany({
        where: {
          rating: { gt: 0 }
        },
        include: {
          author: {
            select: { id: true, name: true, avatar: true }
          },
          _count: {
            select: { reviews: true }
          }
        },
        orderBy: { rating: 'desc' },
        take: 5
      })
    ]);

    // Calculate total usage
    const usageResult = await prisma.prompt.aggregate({
      _sum: {
        usageCount: true
      }
    });

    // Calculate average rating
    const ratingResult = await prisma.prompt.aggregate({
      _avg: {
        rating: true
      }
    });

    const stats = {
      totals: {
        prompts: totalPrompts,
        categories: totalCategories,
        users: totalUsers,
        reviews: totalReviews,
        usage: usageResult._sum.usageCount || 0
      },
      averages: {
        rating: ratingResult._avg.rating || 0
      },
      topCategories: topCategories.map(cat => ({
        id: cat.id,
        name: cat.name,
        promptCount: cat._count.prompts
      })),
      recentPrompts: recentPrompts.map(prompt => ({
        id: prompt.id,
        title: prompt.title,
        category: prompt.category,
        author: prompt.author,
        reviewCount: prompt._count.reviews,
        rating: prompt.rating,
        createdAt: prompt.createdAt
      })),
      topRatedPrompts: topRatedPrompts.map(prompt => ({
        id: prompt.id,
        title: prompt.title,
        category: prompt.category,
        author: prompt.author,
        reviewCount: prompt._count.reviews,
        rating: prompt.rating,
        createdAt: prompt.createdAt
      }))
    };
    
    res.json({ data: stats });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get activity statistics
router.get('/activity', async (req, res) => {
  try {
    const { timeframe = '7d' } = req.query;
    const stats = await activityService.getActivityStats(timeframe);
    
    res.json({ data: stats });
  } catch (error) {
    console.error('Get activity stats error:', error);
    res.status(500).json({ error: 'Failed to fetch activity statistics' });
  }
});

// Get user-specific stats (requires auth)
router.get('/user', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [
      userPrompts,
      userReviews,
      userActivities
    ] = await Promise.all([
      prisma.prompt.findMany({
        where: { authorId: req.user.id },
        include: {
          _count: {
            select: { reviews: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      
      prisma.review.findMany({
        where: { userId: req.user.id },
        include: {
          prompt: {
            select: { id: true, title: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      
      activityService.getUserActivities(req.user.id, 10)
    ]);

    // Calculate user stats
    const totalUsageOnUserPrompts = userPrompts.reduce(
      (sum, prompt) => sum + (prompt.usageCount || 0), 0
    );
    
    const totalReviewsOnUserPrompts = userPrompts.reduce(
      (sum, prompt) => sum + prompt._count.reviews, 0
    );

    const stats = {
      prompts: {
        total: userPrompts.length,
        totalUsage: totalUsageOnUserPrompts,
        totalReviews: totalReviewsOnUserPrompts,
        recent: userPrompts.slice(0, 5)
      },
      reviews: {
        total: userReviews.length,
        recent: userReviews.slice(0, 5)
      },
      recentActivity: userActivities
    };
    
    res.json({ data: stats });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

module.exports = router;