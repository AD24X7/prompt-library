const { prisma } = require('../database');

class ActivityService {
  // Log user activity
  async logActivity(action, options = {}) {
    const { userId, details, req } = options;
    
    try {
      await prisma.userActivity.create({
        data: {
          action,
          userId: userId || null,
          details: details || null,
          ipAddress: req ? this.getClientIP(req) : null,
          userAgent: req ? req.get('User-Agent') : null
        }
      });
    } catch (error) {
      // Don't fail the main operation if activity logging fails
      console.error('Activity logging failed:', error);
    }
  }

  // Get client IP address
  getClientIP(req) {
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null);
  }

  // Get user activities
  async getUserActivities(userId, limit = 50, offset = 0) {
    return prisma.userActivity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });
  }

  // Get global activity stats
  async getActivityStats(timeframe = '7d') {
    const date = new Date();
    
    switch (timeframe) {
      case '24h':
        date.setHours(date.getHours() - 24);
        break;
      case '7d':
        date.setDate(date.getDate() - 7);
        break;
      case '30d':
        date.setDate(date.getDate() - 30);
        break;
      default:
        date.setDate(date.getDate() - 7);
    }

    const activities = await prisma.userActivity.findMany({
      where: {
        createdAt: { gte: date }
      },
      select: {
        action: true,
        createdAt: true
      }
    });

    // Group by action
    const stats = activities.reduce((acc, activity) => {
      acc[activity.action] = (acc[activity.action] || 0) + 1;
      return acc;
    }, {});

    return {
      timeframe,
      total: activities.length,
      breakdown: stats
    };
  }

  // Common activity logging methods
  async logPromptView(promptId, userId, req) {
    await this.logActivity('prompt_viewed', {
      userId,
      details: { promptId },
      req
    });
  }

  async logPromptTest(promptId, userId, req) {
    await this.logActivity('prompt_tested', {
      userId,
      details: { promptId },
      req
    });
  }

  async logPromptCreate(promptId, userId, req) {
    await this.logActivity('prompt_created', {
      userId,
      details: { promptId },
      req
    });
  }

  async logPromptEdit(promptId, userId, req) {
    await this.logActivity('prompt_edited', {
      userId,
      details: { promptId },
      req
    });
  }

  async logPromptDelete(promptId, userId, req) {
    await this.logActivity('prompt_deleted', {
      userId,
      details: { promptId },
      req
    });
  }

  async logReviewAdd(promptId, reviewId, userId, req) {
    await this.logActivity('review_added', {
      userId,
      details: { promptId, reviewId },
      req
    });
  }

  async logUserSignup(userId, provider, req) {
    await this.logActivity('user_signup', {
      userId,
      details: { provider },
      req
    });
  }

  async logUserSignin(userId, provider, req) {
    await this.logActivity('user_signin', {
      userId,
      details: { provider },
      req
    });
  }
}

module.exports = new ActivityService();