# 🚀 Deployment Guide - Prompt Library

This guide covers multiple deployment options for hosting your Prompt Library application publicly.

## 🏗️ Architecture Overview

- **Frontend**: React TypeScript app with Material-UI
- **Backend**: Node.js/Express API with Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: JWT + OAuth (Google/Microsoft)
- **Storage**: Database for all data + activity tracking

## 📋 Prerequisites

1. **Code Repository**: Push your code to GitHub
2. **Database**: PostgreSQL database (local or cloud)
3. **Environment Variables**: Configure all required environment variables
4. **OAuth Credentials**: Get Google/Microsoft OAuth credentials (optional)

## 🚀 Deployment Options

### Option 1: Railway (Recommended for beginners)

**Why Railway?**
- ✅ Simple one-click deployment
- ✅ Automatic PostgreSQL database
- ✅ Free tier available
- ✅ Automatic SSL/HTTPS
- ✅ Zero configuration needed

**Steps:**
1. Push code to GitHub
2. Visit [railway.app](https://railway.app)
3. "Deploy from GitHub" → Select your repository
4. Railway will automatically detect and deploy both frontend/backend
5. Add environment variables in Railway dashboard
6. Your app will be live at `https://your-app.railway.app`

**Required Environment Variables:**
```env
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-change-this
SESSION_SECRET=your-super-secret-session-key-change-this
GOOGLE_CLIENT_ID=your-google-client-id (optional)
GOOGLE_CLIENT_SECRET=your-google-client-secret (optional)
MICROSOFT_CLIENT_ID=your-microsoft-client-id (optional)
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret (optional)
```

### Option 2: Render (Great for full-stack apps)

**Steps:**
1. Push code to GitHub
2. Visit [render.com](https://render.com)
3. Create new "Web Service" from GitHub
4. Use the `render.yaml` configuration file (already created)
5. Render will deploy backend, frontend, and database

### Option 3: Vercel (Frontend) + Railway (Backend)

**Frontend on Vercel:**
1. Connect GitHub to [vercel.com](https://vercel.com)
2. Deploy frontend from `/frontend` directory
3. Set environment variable: `REACT_APP_API_URL=https://your-backend.railway.app/api`

**Backend on Railway:**
1. Deploy backend separately on Railway
2. Point Vercel frontend to Railway backend URL

### Option 4: Self-hosted with Docker

**Requirements:**
- VPS with Docker installed
- Domain name (optional)

**Steps:**
```bash
# Clone your repository
git clone https://github.com/your-username/prompt-library.git
cd prompt-library

# Set up environment variables
cp backend/.env.example backend/.env
# Edit backend/.env with your values

# Deploy with Docker Compose
docker-compose up -d

# Run database migrations
docker-compose exec backend npm run db:migrate:deploy
docker-compose exec backend npm run db:seed
```

## 🗄️ Database Setup

### For Cloud Deployments (Railway/Render)
- Database is automatically created and connected
- Environment variables are automatically set

### For Self-hosted
1. **Local PostgreSQL:**
```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb prompt_library
sudo -u postgres createuser prompt_user -P

# Update .env with connection string
DATABASE_URL="postgresql://prompt_user:password@localhost:5432/prompt_library"
```

2. **Cloud PostgreSQL** (Recommended):
   - **Supabase**: Free tier, easy setup
   - **Neon**: Serverless PostgreSQL
   - **AWS RDS**: Enterprise option

## 🔐 OAuth Setup (Optional but Recommended)

### Google OAuth
1. Visit [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable "Google+ API"
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - Development: `http://localhost:5000/auth/google/callback`
   - Production: `https://yourdomain.com/auth/google/callback`

### Microsoft OAuth
1. Visit [Azure Portal](https://portal.azure.com)
2. Go to "Azure Active Directory" > "App registrations"
3. Create new registration
4. Add redirect URIs similar to Google

## 🌍 Environment Variables

### Required for Production:
```env
# Database (automatically set by hosting providers)
DATABASE_URL="postgresql://user:password@host:port/database"

# Security
JWT_SECRET="generate-a-secure-random-string"
SESSION_SECRET="generate-another-secure-random-string"

# Application
NODE_ENV="production"
PORT="5000"
FRONTEND_URL="https://your-frontend-domain.com"

# OAuth (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
MICROSOFT_CLIENT_ID="your-microsoft-client-id"
MICROSOFT_CLIENT_SECRET="your-microsoft-client-secret"
```

### Generate Secure Secrets:
```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate Session secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 📦 Build Process

### Backend:
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm start
```

### Frontend:
```bash
cd frontend
npm install
npm run build
```

## 🔧 Database Migrations

### Initial Setup:
```bash
# Generate Prisma client
npm run db:generate

# Create and apply migrations
npm run db:migrate

# Seed with existing data (if migrating from JSON)
npm run db:seed
```

### Production Deployment:
```bash
# Apply migrations without prompting
npm run db:migrate:deploy
```

## 📊 Monitoring & Logging

### Activity Tracking
- All user actions are automatically logged
- View analytics at `/api/stats/activity`
- User-specific stats at `/api/stats/user`

### Health Check
- Monitor application health at `/health`
- Database connection status included

## 🔒 Security Considerations

1. **Environment Variables**: Never commit secrets to repository
2. **CORS**: Configure CORS for your domain only
3. **Rate Limiting**: Consider adding rate limiting for API endpoints
4. **HTTPS**: Always use HTTPS in production (automatic with cloud providers)
5. **Database**: Use connection pooling for production database

## 🚦 Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Environment variables configured
- [ ] Database connection tested
- [ ] OAuth credentials set up (optional)
- [ ] Domain configured (if custom domain)
- [ ] SSL/HTTPS enabled
- [ ] Database migrations applied
- [ ] Application health check passing
- [ ] Frontend can communicate with backend
- [ ] User registration/login working

## 📞 Support

### Common Issues:

1. **Database Connection Failed**
   - Check DATABASE_URL format
   - Verify database is running
   - Check firewall settings

2. **OAuth Not Working**
   - Verify redirect URIs match exactly
   - Check client ID/secret are correct
   - Ensure OAuth providers are enabled

3. **CORS Errors**
   - Update FRONTEND_URL in backend environment
   - Check CORS configuration

4. **Build Failures**
   - Clear node_modules and reinstall
   - Check Node.js version compatibility
   - Verify all dependencies are installed

### Getting Help:
- Check application logs in hosting provider dashboard
- Use `/health` endpoint to verify backend status
- Test database connection with Prisma Studio: `npm run db:studio`

## 🎉 Post-Deployment

Once deployed successfully:

1. **Test Core Features:**
   - User registration/login
   - Creating/editing prompts
   - Adding reviews
   - Search and filtering

2. **Set Up Monitoring:**
   - Set up uptime monitoring
   - Configure error tracking
   - Monitor database performance

3. **Share Your App:**
   - Your prompt library is now publicly accessible!
   - Share the URL with your team/community
   - Consider adding analytics

**Congratulations! Your Prompt Library is now live and accessible to anyone on the web! 🌍**