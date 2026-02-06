# New Intelligent Tag Classification System

## Overview
All prompts have been automatically retagged using an intelligent classification system that analyzes prompt content and assigns appropriate tags based on multiple dimensions.

## Tag Types

### 🔄 Usage Pattern
- **one-off**: Single-use tasks or decisions
- **repetitive**: Recurring tasks or workflows that can be used multiple times

### 🧠 Cognitive Type  
- **mechanical**: Rule-based or procedural tasks
- **reasoning**: Analysis or complex thinking required
- **mech+reason**: Both procedural and analytical elements

### 🎯 Interaction Style
- **ui-heavy**: Multiple interactions or interface-dependent tasks
- **skills-heavy**: Domain expertise or specialized knowledge required

### 🔄 Turn Complexity
- **single-turn**: Complete in 1-2 exchanges
- **multi-turn**: Requires 3-5 exchanges
- **extended**: Requires 6+ exchanges or ongoing interaction

### 📂 Domain Category
- **strategy**: Strategic planning and decision making
- **analysis**: Data analysis and research
- **creative**: Content creation and creative tasks
- **technical**: Programming and technical implementation
- **communication**: Writing and communication tasks
- **education**: Learning and teaching content
- **management**: Project and team management
- **marketing**: Marketing and business development
- **personal**: Personal productivity and self-improvement

## How It Works

1. **Automatic Classification**: Each prompt is analyzed for keywords, structure, and complexity
2. **Multi-dimensional Tagging**: Every prompt gets one tag from each of the 5 categories
3. **Smart Filtering**: The frontend allows filtering by tag type and specific tag values
4. **Performance Analysis**: Tool performance can now be analyzed across these dimensions

## Frontend Features

### Tag Type Selection
- Switch between different tag type categories
- View all available tags within each type
- Clear visual hierarchy with chip-based selection

### Filtering Capabilities
- Filter tool performance by specific tag combinations
- Compare AI tools across different prompt characteristics
- Analyze which tools work best for different types of tasks

## Usage Examples

- **Find tools for repetitive tasks**: Filter by `repetitive` in Usage Pattern
- **Compare reasoning vs mechanical tasks**: Switch between `reasoning` and `mechanical` in Cognitive Type
- **Analyze complex interactions**: Filter by `extended` in Turn Complexity
- **Domain-specific performance**: Filter by specific domains like `technical` or `creative`

## Benefits

1. **More Precise Analysis**: Understanding which AI tools excel at specific types of tasks
2. **Better Tool Selection**: Choose the right AI tool based on task characteristics
3. **Performance Insights**: Discover patterns in AI tool effectiveness
4. **Systematic Organization**: Consistent categorization across all prompts

## Maintenance

- The tagging system is automated and can be re-run with `node scripts/retag-prompts.js`
- Backup files are automatically created before any retagging operation
- The classification logic can be updated in the script as needed