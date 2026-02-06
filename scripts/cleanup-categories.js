const fs = require('fs');
const path = require('path');

// Clean up category names to merge similar categories
function cleanupCategories() {
  console.log('🧹 Cleaning up category names...');
  
  const promptsPath = path.join(__dirname, '../backend/data/prompts.json');
  const backupPath = path.join(__dirname, '../backend/data/prompts-category-backup-' + Date.now() + '.json');
  
  try {
    // Create backup
    const originalData = fs.readFileSync(promptsPath, 'utf8');
    fs.writeFileSync(backupPath, originalData);
    console.log(`📄 Backup created: ${path.basename(backupPath)}`);
    
    // Parse and clean up
    const prompts = JSON.parse(originalData);
    console.log(`📊 Processing ${prompts.length} prompts...`);
    
    let changes = 0;
    prompts.forEach(prompt => {
      const originalCategory = prompt.category;
      
      // Merge similar categories
      if (prompt.category === 'Analysis') {
        prompt.category = 'Analysis & Research';
        changes++;
      } else if (prompt.category === 'Research') {
        prompt.category = 'Analysis & Research';
        changes++;
      } else if (prompt.category === 'Strategy & Vision') {
        prompt.category = 'Strategy';
        changes++;
      }
      
      if (originalCategory !== prompt.category) {
        console.log(`  ✏️  "${originalCategory}" → "${prompt.category}": ${prompt.title}`);
      }
    });
    
    // Save cleaned data
    fs.writeFileSync(promptsPath, JSON.stringify(prompts, null, 2));
    console.log(`✅ Cleaned up ${changes} category names`);
    
    // Show final distribution
    const categoryStats = {};
    prompts.forEach(prompt => {
      categoryStats[prompt.category] = (categoryStats[prompt.category] || 0) + 1;
    });
    
    console.log('\n📈 Final Category Distribution:');
    Object.entries(categoryStats)
      .sort(([,a], [,b]) => b - a)
      .forEach(([category, count]) => {
        console.log(`  ${category}: ${count} prompts`);
      });
      
  } catch (error) {
    console.error('❌ Error cleaning categories:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  cleanupCategories();
}

module.exports = { cleanupCategories };