const fs = require('fs');
const path = require('path');

// Script to merge "Claude Cowork" and "Cowork" tools into just "Cowork"
async function mergeCoworkTools() {
  console.log('🔧 Starting Cowork tools merge process...');
  
  const promptsPath = path.join(__dirname, '../backend/data/prompts.json');
  const backupPath = path.join(__dirname, '../backend/data/prompts-cowork-merge-backup-' + Date.now() + '.json');
  
  try {
    // Create backup
    const originalData = fs.readFileSync(promptsPath, 'utf8');
    fs.writeFileSync(backupPath, originalData);
    console.log(`📄 Backup created: ${path.basename(backupPath)}`);
    
    // Parse prompts
    const prompts = JSON.parse(originalData);
    console.log(`📊 Processing ${prompts.length} prompts...`);
    
    let reviewsUpdated = 0;
    
    // Process each prompt to merge tool names in reviews
    prompts.forEach(prompt => {
      if (prompt.reviews && Array.isArray(prompt.reviews)) {
        prompt.reviews.forEach(review => {
          if (review.toolUsed === 'Claude Cowork') {
            review.toolUsed = 'Cowork';
            reviewsUpdated++;
            console.log(`✅ Updated review: "${review.toolUsed}" in prompt "${prompt.title}"`);
          }
        });
      }
    });
    
    // Save updated prompts
    fs.writeFileSync(promptsPath, JSON.stringify(prompts, null, 2));
    console.log(`✅ Cowork tools merged successfully!`);
    console.log(`🔄 Updated ${reviewsUpdated} reviews from "Claude Cowork" to "Cowork"`);
    console.log(`📁 Backup saved as: ${path.basename(backupPath)}`);
    
  } catch (error) {
    console.error('❌ Error during merge:', error);
    process.exit(1);
  }
}

// Run the merge process
mergeCoworkTools();