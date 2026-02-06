const fs = require('fs');
const path = require('path');

// Tag classification system based on your requirements
const TAG_TYPES = {
  USAGE_PATTERN: {
    'one-off': 'Single-use task or decision',
    'repetitive': 'Recurring task or workflow'
  },
  COGNITIVE_TYPE: {
    'mechanical': 'Rule-based or procedural task',
    'reasoning': 'Analysis or complex thinking required',
    'mech+reason': 'Both procedural and analytical elements'
  },
  INTERACTION_STYLE: {
    'ui-heavy': 'Multiple interactions or interface-dependent',
    'skills-heavy': 'Domain expertise or specialized knowledge'
  },
  TURN_COMPLEXITY: {
    'single-turn': 'Complete in 1-2 exchanges',
    'multi-turn': 'Requires 3-5 exchanges',
    'extended': 'Requires 6+ exchanges or ongoing interaction'
  },
  DOMAIN_CATEGORY: {
    'strategy': 'Strategic planning and decision making',
    'analysis': 'Data analysis and research',
    'creative': 'Content creation and creative tasks',
    'technical': 'Programming and technical implementation',
    'communication': 'Writing and communication tasks',
    'education': 'Learning and teaching content',
    'management': 'Project and team management',
    'marketing': 'Marketing and business development',
    'personal': 'Personal productivity and self-improvement'
  }
};

// Classification rules based on prompt analysis
function classifyPrompt(prompt) {
  const text = (prompt.prompt + ' ' + prompt.title + ' ' + prompt.description).toLowerCase();
  const tags = {};

  // Usage Pattern Analysis
  const repetitiveKeywords = ['framework', 'template', 'process', 'workflow', 'system', 'method', 'approach', 'strategy'];
  const oneOffKeywords = ['analyze', 'review', 'evaluate', 'assess', 'create', 'write', 'design'];
  
  if (repetitiveKeywords.some(keyword => text.includes(keyword))) {
    tags.USAGE_PATTERN = 'repetitive';
  } else if (oneOffKeywords.some(keyword => text.includes(keyword))) {
    tags.USAGE_PATTERN = 'one-off';
  } else {
    tags.USAGE_PATTERN = 'one-off'; // default
  }

  // Cognitive Type Analysis
  const mechanicalKeywords = ['template', 'format', 'structure', 'checklist', 'steps', 'procedure'];
  const reasoningKeywords = ['analyze', 'evaluate', 'assess', 'think', 'consider', 'compare', 'strategy', 'decision'];
  
  const hasMechanical = mechanicalKeywords.some(keyword => text.includes(keyword));
  const hasReasoning = reasoningKeywords.some(keyword => text.includes(keyword));
  
  if (hasMechanical && hasReasoning) {
    tags.COGNITIVE_TYPE = 'mech+reason';
  } else if (hasReasoning) {
    tags.COGNITIVE_TYPE = 'reasoning';
  } else if (hasMechanical) {
    tags.COGNITIVE_TYPE = 'mechanical';
  } else {
    tags.COGNITIVE_TYPE = 'reasoning'; // default
  }

  // Interaction Style Analysis
  const uiHeavyKeywords = ['interface', 'dashboard', 'form', 'input', 'interaction', 'user', 'click', 'navigate'];
  const skillsHeavyKeywords = ['expertise', 'knowledge', 'specialized', 'technical', 'advanced', 'professional'];
  
  if (uiHeavyKeywords.some(keyword => text.includes(keyword))) {
    tags.INTERACTION_STYLE = 'ui-heavy';
  } else if (skillsHeavyKeywords.some(keyword => text.includes(keyword)) || 
             prompt.difficulty === 'hard' || 
             text.includes('expert') || text.includes('advanced')) {
    tags.INTERACTION_STYLE = 'skills-heavy';
  } else {
    tags.INTERACTION_STYLE = 'skills-heavy'; // default to skills-heavy for most prompts
  }

  // Turn Complexity Analysis (based on prompt structure and placeholders)
  const placeholderCount = (prompt.prompt.match(/\{[^}]+\}/g) || []).length;
  const hasMultipleSteps = text.includes('step') || text.includes('phase') || text.includes('stage');
  const hasIteration = text.includes('iterate') || text.includes('refine') || text.includes('improve');
  const promptLength = prompt.prompt.length;
  
  if (hasIteration || placeholderCount > 5 || promptLength > 2000 || hasMultipleSteps) {
    tags.TURN_COMPLEXITY = 'extended';
  } else if (placeholderCount > 2 || promptLength > 800 || hasMultipleSteps) {
    tags.TURN_COMPLEXITY = 'multi-turn';
  } else {
    tags.TURN_COMPLEXITY = 'single-turn';
  }

  // Domain Category Analysis
  const categoryMap = {
    'Strategy & Vision': 'strategy',
    'Competitive Intelligence': 'analysis',
    'Content Creation': 'creative',
    'Programming': 'technical',
    'Data Analysis': 'analysis',
    'Writing': 'communication',
    'Education': 'education',
    'Project Management': 'management',
    'Marketing': 'marketing',
    'Personal Productivity': 'personal',
    'Research': 'analysis',
    'Design': 'creative',
    'Business Development': 'marketing'
  };

  tags.DOMAIN_CATEGORY = categoryMap[prompt.category] || 'analysis';

  return tags;
}

// Main retagging function
async function retagPrompts() {
  console.log('🏷️  Starting prompt retagging process...');
  
  const promptsPath = path.join(__dirname, '../backend/data/prompts.json');
  const backupPath = path.join(__dirname, '../backend/data/prompts-backup-' + Date.now() + '.json');
  
  try {
    // Create backup
    const originalData = fs.readFileSync(promptsPath, 'utf8');
    fs.writeFileSync(backupPath, originalData);
    console.log(`📄 Backup created: ${path.basename(backupPath)}`);
    
    // Parse prompts
    const prompts = JSON.parse(originalData);
    console.log(`📊 Processing ${prompts.length} prompts...`);
    
    let processed = 0;
    const tagStats = {};
    
    // Process each prompt
    prompts.forEach(prompt => {
      // Clear existing tags
      prompt.tags = [];
      
      // Apply new classification
      const newTags = classifyPrompt(prompt);
      
      // Convert to flat tag array
      Object.entries(newTags).forEach(([tagType, tagValue]) => {
        prompt.tags.push(tagValue);
        
        // Track statistics
        if (!tagStats[tagType]) tagStats[tagType] = {};
        tagStats[tagType][tagValue] = (tagStats[tagType][tagValue] || 0) + 1;
      });
      
      processed++;
      if (processed % 20 === 0) {
        console.log(`⚡ Processed ${processed}/${prompts.length} prompts...`);
      }
    });
    
    // Save updated prompts
    fs.writeFileSync(promptsPath, JSON.stringify(prompts, null, 2));
    console.log('✅ All prompts retagged successfully!');
    
    // Display statistics
    console.log('\n📈 Tagging Statistics:');
    Object.entries(tagStats).forEach(([tagType, counts]) => {
      console.log(`\n${tagType}:`);
      Object.entries(counts).forEach(([tag, count]) => {
        console.log(`  ${tag}: ${count} prompts`);
      });
    });
    
    console.log(`\n🎯 Total prompts processed: ${processed}`);
    console.log(`📁 Backup saved as: ${path.basename(backupPath)}`);
    
  } catch (error) {
    console.error('❌ Error during retagging:', error);
    process.exit(1);
  }
}

// Run the retagging process
retagPrompts();