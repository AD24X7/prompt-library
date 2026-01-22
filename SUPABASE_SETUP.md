# 🚀 Supabase Setup Guide - Quick Start

Your prompt library is now ready for Supabase! Follow these steps to complete the setup:

## Step 1: Create Supabase Project
1. Go to **[supabase.com](https://supabase.com)** and sign up/login
2. Click **"New Project"**
3. Enter:
   - **Project Name**: `prompt-library`
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to you
4. Wait ~2 minutes for project creation

## Step 2: Get Your Credentials
After project creation, go to **Settings > API**:
- **URL**: `https://your-project-id.supabase.co`
- **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **service_role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` ⚠️ Keep this secret!

## Step 3: Setup Database Schema
1. In Supabase Dashboard, go to **SQL Editor**
2. Copy the entire contents of `database/schema.sql`
3. Paste and click **RUN** 
4. ✅ You should see "Success. No rows returned" - tables are created!

## Step 4: Configure Environment Variables

### Backend (.env):
```bash
cd /Users/anvitadekhane/src/delegate/prompt-library/backend
cp .env.example .env
```

Edit `.env` with your actual values:
```bash
SUPABASE_URL=https://your-actual-project-id.supabase.co
SUPABASE_ANON_KEY=your-actual-anon-key
SUPABASE_SERVICE_KEY=your-actual-service-key
JWT_SECRET=your-super-secret-jwt-key-change-in-production
NODE_ENV=development
PORT=3001
```

### Frontend (.env):
```bash
cd /Users/anvitadekhane/src/delegate/prompt-library/frontend
cp .env.example .env
```

Edit `.env` with your values:
```bash
REACT_APP_SUPABASE_URL=https://your-actual-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-actual-anon-key
REACT_APP_API_URL=http://localhost:3001
```

## Step 5: Migrate Your Data (Optional)
To move your existing JSON data to Supabase:
```bash
cd /Users/anvitadekhane/src/delegate/prompt-library/database
node migration.js
```

## Step 6: Start with Supabase
```bash
# Backend with Supabase
cd /Users/anvitadekhane/src/delegate/prompt-library/backend
node server-supabase.js

# Frontend (in another terminal)
cd /Users/anvitadekhane/src/delegate/prompt-library/frontend
PORT=3005 npm start
```

## ✅ Verification Checklist
- [ ] Supabase project created
- [ ] Database schema deployed (8 tables created)
- [ ] Environment variables configured
- [ ] Backend starts without errors
- [ ] Frontend connects and loads
- [ ] Can view/create prompts
- [ ] Reviews and comments work

## 🎯 What You Get with Supabase:

### Immediate Benefits:
- **PostgreSQL Database**: Robust, scalable, ACID compliant
- **Automatic APIs**: REST & GraphQL endpoints generated
- **Real-time**: Live updates for reviews/comments
- **Built-in Auth**: Email/password + social logins
- **File Storage**: For screenshot uploads
- **Dashboard**: Built-in admin interface

### Advanced Features Ready:
- **Full-text Search**: Advanced search capabilities
- **Row Level Security**: Data protection policies
- **Database Triggers**: Auto-update ratings/usage counts
- **Analytics**: Built-in metrics and monitoring
- **Edge Functions**: Serverless functions if needed

### Scaling:
- **Free Tier**: 50K monthly active users
- **Generous Limits**: 500MB database, 1GB file storage
- **Auto-scaling**: Handles traffic spikes
- **Global CDN**: Fast worldwide access

## 🔧 Files Created/Modified:
- `backend/server-supabase.js` - New Supabase-powered API server
- `backend/supabase-service.js` - Database service layer  
- `frontend/src/utils/supabase.ts` - Frontend Supabase client
- `backend/.env.example` - Backend environment template
- `frontend/.env.example` - Frontend environment template

## 🚨 Next Steps After Setup:
1. **Test Everything**: Create prompts, add reviews, check performance page
2. **Deploy**: Use Vercel/Netlify with environment variables
3. **Add Auth**: Implement user registration/login
4. **Enable Real-time**: Add live updates for new reviews
5. **Add Storage**: Upload screenshots directly to Supabase

## 💡 Quick Commands:

### Switch between database modes:
```bash
# Use JSON files (current)
node server.js

# Use Supabase (new)  
node server-supabase.js
```

### Backup current data:
```bash
# Your JSON data is preserved in backend/data/
cp -r backend/data backend/data-backup
```

## 🆘 Troubleshooting:
- **"Missing Supabase configuration"**: Check environment variables
- **"relation does not exist"**: Run the schema.sql in Supabase SQL Editor
- **Connection errors**: Verify your Supabase URL and keys
- **CORS issues**: Supabase handles CORS automatically

Ready to go! 🎉