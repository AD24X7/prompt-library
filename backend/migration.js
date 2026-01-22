// Migration script to move from JSON files to Supabase database
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration from environment
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase configuration. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Read JSON data files
function readJsonFile(filename) {
  try {
    const filePath = path.join(__dirname, 'data', filename);
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filename}:`, error.message);
    return [];
  }
}

// Migration functions
async function migrateUsers() {
  console.log('Migrating users...');
  const users = readJsonFile('users.json');
  
  if (!users.length) {
    console.log('No users to migrate');
    return;
  }

  for (const user of users) {
    try {
      // Create user in Supabase Auth first (if needed)
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: 'temporary-password-123', // User will need to reset
        email_confirm: true,
        user_metadata: {
          name: user.name,
          avatar: user.avatar
        }
      });

      if (authError && !authError.message.includes('already been registered')) {
        console.error('Error creating auth user:', authError);
        continue;
      }

      // Insert into public.users table
      const { error: dbError } = await supabase
        .from('users')
        .upsert({
          id: authUser?.user?.id || user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          created_at: user.createdAt,
          updated_at: user.updatedAt
        });

      if (dbError) {
        console.error('Error inserting user into database:', dbError);
      } else {
        console.log(`✓ Migrated user: ${user.email}`);
      }
    } catch (error) {
      console.error(`Error migrating user ${user.email}:`, error.message);
    }
  }
}

async function migrateCategories() {
  console.log('Migrating categories...');
  const categories = readJsonFile('categories.json');
  
  if (!categories.length) {
    console.log('No categories to migrate');
    return;
  }

  for (const category of categories) {
    try {
      const { error } = await supabase
        .from('categories')
        .upsert({
          id: category.id,
          name: category.name,
          description: category.description,
          created_at: category.createdAt
        });

      if (error) {
        console.error('Error inserting category:', error);
      } else {
        console.log(`✓ Migrated category: ${category.name}`);
      }
    } catch (error) {
      console.error(`Error migrating category ${category.name}:`, error.message);
    }
  }
}

async function migratePrompts() {
  console.log('Migrating prompts...');
  const prompts = readJsonFile('prompts.json');
  
  if (!prompts.length) {
    console.log('No prompts to migrate');
    return;
  }

  for (const prompt of prompts) {
    try {
      // Get category ID from category name
      const { data: categoryData } = await supabase
        .from('categories')
        .select('id')
        .eq('name', prompt.category)
        .single();

      const { error } = await supabase
        .from('prompts')
        .upsert({
          id: prompt.id,
          title: prompt.title,
          description: prompt.description,
          prompt: prompt.prompt,
          category_id: categoryData?.id,
          category_name: prompt.category,
          difficulty: prompt.difficulty,
          estimated_time: prompt.estimatedTime,
          created_at: prompt.createdAt,
          updated_at: prompt.updatedAt,
          usage_count: prompt.usageCount || 0,
          rating: prompt.rating || 0,
          last_used: prompt.lastUsed,
          tags: JSON.stringify(prompt.tags || []),
          placeholders: JSON.stringify(prompt.placeholders || []),
          apps: JSON.stringify(prompt.apps || []),
          urls: JSON.stringify(prompt.urls || [])
        });

      if (error) {
        console.error('Error inserting prompt:', error);
      } else {
        console.log(`✓ Migrated prompt: ${prompt.title}`);
      }

      // Migrate reviews for this prompt
      if (prompt.reviews && prompt.reviews.length > 0) {
        for (const review of prompt.reviews) {
          try {
            const { error: reviewError } = await supabase
              .from('reviews')
              .upsert({
                id: review.id,
                prompt_id: prompt.id,
                user_id: null, // Will need to be manually linked if needed
                rating: review.rating,
                comment: review.comment,
                tool_used: review.toolUsed,
                prompt_edits: review.promptEdits,
                what_worked: review.whatWorked,
                what_didnt_work: review.whatDidntWork,
                improvement_suggestions: review.improvementSuggestions,
                test_run_graphics_link: review.testRunGraphicsLink,
                parent_review_id: review.parentReviewId,
                created_at: review.createdAt,
                updated_at: review.updatedAt,
                media_files: JSON.stringify(review.mediaFiles || []),
                screenshots: JSON.stringify(review.screenshots || [])
              });

            if (reviewError) {
              console.error('Error inserting review:', reviewError);
            }
          } catch (reviewErr) {
            console.error('Error migrating review:', reviewErr.message);
          }
        }
      }
    } catch (error) {
      console.error(`Error migrating prompt ${prompt.title}:`, error.message);
    }
  }
}

async function migrateComments() {
  console.log('Migrating comments...');
  const comments = readJsonFile('comments.json');
  
  if (!comments.length) {
    console.log('No comments to migrate');
    return;
  }

  for (const comment of comments) {
    try {
      const { error } = await supabase
        .from('comments')
        .upsert({
          id: comment.id,
          prompt_id: comment.promptId,
          user_id: comment.userId,
          content: comment.content,
          parent_id: comment.parentId,
          created_at: comment.createdAt,
          updated_at: comment.updatedAt
        });

      if (error) {
        console.error('Error inserting comment:', error);
      } else {
        console.log(`✓ Migrated comment: ${comment.id}`);
      }
    } catch (error) {
      console.error(`Error migrating comment:`, error.message);
    }
  }
}

// Extract and migrate tags
async function migrateTags() {
  console.log('Extracting and migrating tags...');
  const prompts = readJsonFile('prompts.json');
  const tagSet = new Set();

  // Extract unique tags from all prompts
  prompts.forEach(prompt => {
    if (prompt.tags && Array.isArray(prompt.tags)) {
      prompt.tags.forEach(tag => tagSet.add(tag));
    }
  });

  // Insert tags
  for (const tagName of tagSet) {
    try {
      const { error } = await supabase
        .from('tags')
        .upsert({
          name: tagName,
          usage_count: prompts.filter(p => p.tags && p.tags.includes(tagName)).length
        });

      if (error) {
        console.error('Error inserting tag:', error);
      } else {
        console.log(`✓ Migrated tag: ${tagName}`);
      }
    } catch (error) {
      console.error(`Error migrating tag ${tagName}:`, error.message);
    }
  }

  // Create prompt-tag relationships
  console.log('Creating prompt-tag relationships...');
  for (const prompt of prompts) {
    if (prompt.tags && Array.isArray(prompt.tags)) {
      for (const tagName of prompt.tags) {
        try {
          // Get tag ID
          const { data: tagData } = await supabase
            .from('tags')
            .select('id')
            .eq('name', tagName)
            .single();

          if (tagData) {
            const { error } = await supabase
              .from('prompt_tags')
              .upsert({
                prompt_id: prompt.id,
                tag_id: tagData.id
              });

            if (error && !error.message.includes('duplicate')) {
              console.error('Error creating prompt-tag relationship:', error);
            }
          }
        } catch (error) {
          console.error(`Error linking prompt ${prompt.id} to tag ${tagName}:`, error.message);
        }
      }
    }
  }
}

// Main migration function
async function runMigration() {
  console.log('🚀 Starting migration from JSON to Supabase...');
  console.log('Make sure you have set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables');
  
  try {
    await migrateUsers();
    await migrateCategories();
    await migratePrompts();
    await migrateComments();
    await migrateTags();
    
    console.log('✅ Migration completed successfully!');
    console.log('\n📋 Post-migration tasks:');
    console.log('1. Update your backend to use Supabase instead of JSON files');
    console.log('2. Set up proper user authentication flow');
    console.log('3. Test all functionality with the new database');
    console.log('4. Users will need to reset their passwords (temporary passwords were set)');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration();
}

module.exports = {
  runMigration,
  migrateUsers,
  migrateCategories,
  migratePrompts,
  migrateComments,
  migrateTags
};