/**
 * Migration script to move existing JSON data to PostgreSQL database
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs-extra');
const path = require('path');

const prisma = new PrismaClient();

async function migrateData() {
  console.log('🚀 Starting data migration...');

  try {
    // Read existing JSON data
    const dataDir = path.join(__dirname, '../../data');
    const categoriesFile = path.join(dataDir, 'categories.json');
    const promptsFile = path.join(dataDir, 'prompts.json');

    let categories = [];
    let prompts = [];

    if (await fs.pathExists(categoriesFile)) {
      categories = await fs.readJson(categoriesFile);
      console.log(`📁 Found ${categories.length} categories`);
    }

    if (await fs.pathExists(promptsFile)) {
      prompts = await fs.readJson(promptsFile);
      console.log(`📝 Found ${prompts.length} prompts`);
    }

    // Migrate categories
    console.log('📁 Migrating categories...');
    for (const category of categories) {
      await prisma.category.upsert({
        where: { name: category.name },
        create: {
          id: category.id,
          name: category.name,
          description: category.description || null,
          color: category.color || null,
          icon: category.icon || null,
          createdAt: category.createdAt ? new Date(category.createdAt) : new Date(),
          updatedAt: category.updatedAt ? new Date(category.updatedAt) : new Date()
        },
        update: {
          description: category.description || null,
          color: category.color || null,
          icon: category.icon || null,
          updatedAt: category.updatedAt ? new Date(category.updatedAt) : new Date()
        }
      });
    }
    console.log('✅ Categories migrated');

    // Migrate prompts
    console.log('📝 Migrating prompts...');
    for (const prompt of prompts) {
      // Create the prompt
      const createdPrompt = await prisma.prompt.upsert({
        where: { id: prompt.id },
        create: {
          id: prompt.id,
          title: prompt.title,
          description: prompt.description || null,
          prompt: prompt.prompt,
          category: prompt.category || 'Uncategorized',
          tags: prompt.tags || [],
          difficulty: prompt.difficulty || 'medium',
          estimatedTime: prompt.estimatedTime || '5-10 minutes',
          placeholders: prompt.placeholders || [],
          rating: prompt.rating || 0,
          usageCount: prompt.usageCount || 0,
          createdAt: prompt.createdAt ? new Date(prompt.createdAt) : new Date(),
          updatedAt: prompt.updatedAt ? new Date(prompt.updatedAt) : new Date(),
          // authorId will be null for migrated prompts (anonymous)
        },
        update: {
          title: prompt.title,
          description: prompt.description || null,
          prompt: prompt.prompt,
          category: prompt.category || 'Uncategorized',
          tags: prompt.tags || [],
          difficulty: prompt.difficulty || 'medium',
          estimatedTime: prompt.estimatedTime || '5-10 minutes',
          placeholders: prompt.placeholders || [],
          rating: prompt.rating || 0,
          usageCount: prompt.usageCount || 0,
          updatedAt: prompt.updatedAt ? new Date(prompt.updatedAt) : new Date()
        }
      });

      // Migrate reviews if they exist
      if (prompt.reviews && prompt.reviews.length > 0) {
        console.log(`  📊 Migrating ${prompt.reviews.length} reviews for "${prompt.title}"`);
        
        for (const review of prompt.reviews) {
          // Create anonymous user for legacy reviews
          let anonymousUser = await prisma.user.findFirst({
            where: { email: 'anonymous@system.local' }
          });

          if (!anonymousUser) {
            anonymousUser = await prisma.user.create({
              data: {
                email: 'anonymous@system.local',
                name: 'Anonymous User',
                provider: 'system',
                verified: true
              }
            });
          }

          await prisma.review.upsert({
            where: { id: review.id },
            create: {
              id: review.id,
              rating: review.rating,
              comment: review.comment || null,
              toolUsed: review.toolUsed || null,
              whatWorked: review.whatWorked || null,
              whatDidntWork: review.whatDidntWork || null,
              improvementSuggestions: review.improvementSuggestions || null,
              testRunGraphicsLink: review.testRunGraphicsLink || null,
              createdAt: review.createdAt ? new Date(review.createdAt) : new Date(),
              promptId: createdPrompt.id,
              userId: anonymousUser.id
            },
            update: {
              rating: review.rating,
              comment: review.comment || null,
              toolUsed: review.toolUsed || null,
              whatWorked: review.whatWorked || null,
              whatDidntWork: review.whatDidntWork || null,
              improvementSuggestions: review.improvementSuggestions || null,
              testRunGraphicsLink: review.testRunGraphicsLink || null,
              createdAt: review.createdAt ? new Date(review.createdAt) : new Date()
            }
          });
        }
      }
    }
    console.log('✅ Prompts migrated');

    // Create default categories if none exist
    const categoryCount = await prisma.category.count();
    if (categoryCount === 0) {
      console.log('📁 Creating default categories...');
      const defaultCategories = [
        { name: 'Strategy & Vision', description: 'Strategic planning and vision setting prompts' },
        { name: 'Stakeholder Communication', description: 'Communication with stakeholders and teams' },
        { name: 'Product Planning', description: 'Product roadmap and planning prompts' },
        { name: 'Decision Making', description: 'Decision frameworks and analysis' },
        { name: 'Team Management', description: 'Team leadership and management' },
        { name: 'Analysis & Research', description: 'Market and competitive analysis' }
      ];

      for (const category of defaultCategories) {
        await prisma.category.create({
          data: category
        });
      }
      console.log('✅ Default categories created');
    }

    console.log('🎉 Migration completed successfully!');
    
    // Print summary
    const finalStats = await Promise.all([
      prisma.category.count(),
      prisma.prompt.count(),
      prisma.review.count(),
      prisma.user.count()
    ]);

    console.log('\n📊 Migration Summary:');
    console.log(`   Categories: ${finalStats[0]}`);
    console.log(`   Prompts: ${finalStats[1]}`);
    console.log(`   Reviews: ${finalStats[2]}`);
    console.log(`   Users: ${finalStats[3]}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { migrateData };