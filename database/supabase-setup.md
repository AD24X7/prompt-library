# Supabase Setup Guide for Prompt Library

## 🚀 Quick Setup Steps

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose organization and enter:
   - **Project Name**: `prompt-library`
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to your users
4. Wait for project creation (~2 minutes)

### 2. Get Your Project Credentials
After project creation, go to **Settings > API**:

```bash
# Your project URL
SUPABASE_URL=https://your-project-id.supabase.co

# Your anon key (for client-side)
SUPABASE_ANON_KEY=your-anon-key

# Your service role key (for server-side admin operations)
SUPABASE_SERVICE_KEY=your-service-role-key
```

### 3. Run Database Schema
1. In Supabase Dashboard, go to **SQL Editor**
2. Copy and paste the entire contents of `schema.sql`
3. Click **RUN** to create all tables, indexes, and policies

### 4. Environment Variables Setup
Create `.env.local` in your project root:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-role-key-here

# For migration script
NODE_ENV=development
```

### 5. Install Supabase Dependencies
```bash
cd /Users/anvitadekhane/src/delegate/prompt-library
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

### 6. Run Migration (Move JSON data to Supabase)
```bash
cd database
node migration.js
```

## 🏗️ Database Architecture

### Core Tables
- **users** - User accounts (extends Supabase auth)
- **categories** - Prompt categories
- **prompts** - Main prompt data with JSON fields for flexibility
- **reviews** - Detailed reviews with tool tracking
- **comments** - Threaded comments system
- **tags** - Normalized tag management
- **prompt_tags** - Many-to-many prompt-tag relationships
- **favorites** - User favorites
- **prompt_usage** - Analytics tracking

### Key Features
✅ **Full-text search** on prompts and titles  
✅ **JSON support** for arrays (tags, apps, URLs)  
✅ **Automatic rating calculation** via triggers  
✅ **Usage tracking** with analytics  
✅ **Row Level Security** for data protection  
✅ **Threaded comments** and reviews  
✅ **Real-time subscriptions** ready  

### Indexes for Performance
- Text search indexes on title and prompt content
- JSON indexes for tag queries  
- Standard indexes on foreign keys and commonly queried fields

## 🔐 Security Features

### Row Level Security (RLS)
- Users can only edit their own data
- Prompts are publicly readable
- Reviews and comments are publicly readable
- Only authenticated users can create content

### Authentication
- Built-in Supabase Auth with email/password
- Social login support (Google, GitHub, etc.)
- JWT tokens for API access
- Session management included

## 📊 Advanced Features Ready

### Real-time Subscriptions
```javascript
// Listen for new reviews in real-time
const reviewSubscription = supabase
  .from('reviews')
  .on('INSERT', payload => {
    console.log('New review:', payload.new);
  })
  .subscribe();
```

### Full-text Search
```sql
-- Search prompts by content
SELECT * FROM prompts 
WHERE to_tsvector('english', title || ' ' || prompt) 
@@ to_tsquery('english', 'strategy & planning');
```

### Analytics Queries
```sql
-- Top prompts by usage
SELECT title, usage_count, rating 
FROM prompts 
ORDER BY usage_count DESC, rating DESC 
LIMIT 10;

-- Popular tags
SELECT t.name, t.usage_count 
FROM tags t 
ORDER BY usage_count DESC;
```

## 🚦 Next Steps After Setup

1. **Update Backend**: Replace JSON file operations with Supabase client calls
2. **Update Frontend**: Integrate Supabase Auth for login/signup
3. **Add Real-time**: Implement live updates for new reviews/comments
4. **Setup Storage**: Use Supabase Storage for screenshot uploads
5. **Deploy**: Deploy to Vercel/Netlify with environment variables

## 💡 Why Supabase?

✅ **PostgreSQL** - Robust, proven database  
✅ **Built-in Auth** - No need for separate auth service  
✅ **Real-time** - Live updates out of the box  
✅ **Storage** - File uploads for screenshots  
✅ **Edge Functions** - Serverless functions if needed  
✅ **Generous Free Tier** - Up to 50,000 monthly active users  
✅ **Automatic API** - REST and GraphQL APIs generated  
✅ **Dashboard** - Built-in admin interface  

## 📈 Scaling Considerations

The schema supports:
- **Millions of prompts** with proper indexing
- **Concurrent users** with connection pooling
- **Real-time features** with built-in pub/sub
- **Full-text search** with PostgreSQL's native capabilities
- **Media storage** with Supabase Storage integration

Perfect for growing from prototype to production! 🚀