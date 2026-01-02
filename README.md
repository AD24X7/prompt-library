# LLM Prompt Library for Directors & PMs

A local web application for managing and organizing LLM prompts tailored for Director and Product Manager roles.

## Features

### 🎯 Core Functionality
- **Prompt Management**: Create, edit, delete, and organize prompts
- **Smart Categorization**: Organize by role, use-case, and difficulty
- **Advanced Search**: Find prompts by title, content, tags, or category
- **Interactive Testing**: Test prompts with custom inputs and placeholders
- **Usage Tracking**: Monitor which prompts are most effective
- **Rating & Reviews**: Community feedback on prompt quality

### 📊 Director/PM Focused
- **Strategic Planning**: Decision frameworks, stakeholder analysis
- **Product Management**: Roadmap prioritization, feature analysis
- **Team Leadership**: Performance reviews, team development
- **Communication**: Stakeholder communication plans, change management
- **Analysis**: Market research, competitive positioning

### ✨ User Experience
- Clean, professional Material-UI interface
- Responsive design for desktop and mobile
- Real-time search and filtering
- Copy-to-clipboard functionality
- Customizable prompt templates with variables

## Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

1. **Clone and setup**:
   ```bash
   cd prompt-library
   npm run install:all
   ```

2. **Start development servers**:
   ```bash
   npm run dev
   ```

   This runs both backend (port 3001) and frontend (port 3000) concurrently.

3. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

### Manual Setup (Alternative)

**Backend**:
```bash
cd backend
npm install
npm run dev
```

**Frontend**:
```bash
cd frontend
npm install
npm start
```

## Application Structure

```
prompt-library/
├── backend/               # Express.js API server
│   ├── server.js         # Main server file
│   ├── data/             # JSON data storage
│   └── package.json      # Backend dependencies
├── frontend/             # React TypeScript UI
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Main application pages
│   │   ├── types/        # TypeScript type definitions
│   │   └── utils/        # API client and utilities
│   └── package.json      # Frontend dependencies
└── package.json          # Root package with scripts
```

## Usage Guide

### Creating Prompts
1. Navigate to "Create" in the top navigation
2. Fill in prompt details:
   - **Title**: Descriptive name for the prompt
   - **Category**: Select from predefined categories
   - **Description**: Brief explanation of the prompt's purpose
   - **Prompt Content**: The actual prompt with placeholders like `{variable}`
   - **Metadata**: Difficulty level, estimated time, tags

### Using Prompts
1. Browse prompts on the "Prompts" page
2. Use search/filter to find relevant prompts
3. Click on a prompt to view details
4. Use "Test & Customize" to:
   - Fill in placeholder variables
   - Modify the prompt for your specific use case
   - Copy the customized version

### Managing Categories
- Access "Categories" to view and create new categories
- Categories help organize prompts by function or role
- Each category shows the count of associated prompts

### Dashboard Analytics
- View usage statistics and prompt library metrics
- See top categories and recently added prompts
- Quick access to common actions

## Sample Prompts Included

The application comes pre-loaded with professional prompts for:

1. **Strategic Decision Framework** - Comprehensive decision-making analysis
2. **Stakeholder Communication Plan** - Template for project communications
3. **Product Roadmap Prioritization** - Feature and initiative ranking
4. **Team Performance Review** - Structured employee development
5. **Market & Competitive Analysis** - Strategic market positioning
6. **Change Management Strategy** - Organizational change planning

## API Endpoints

### Prompts
- `GET /api/prompts` - List all prompts (with search/filter)
- `GET /api/prompts/:id` - Get specific prompt
- `POST /api/prompts` - Create new prompt
- `PUT /api/prompts/:id` - Update prompt
- `DELETE /api/prompts/:id` - Delete prompt
- `POST /api/prompts/:id/use` - Track usage
- `POST /api/prompts/:id/review` - Add rating/review

### Categories
- `GET /api/categories` - List all categories
- `POST /api/categories` - Create new category

### Analytics
- `GET /api/stats` - Get usage statistics
- `GET /health` - Health check

## Data Storage

The application uses JSON files for data persistence:
- `backend/data/prompts.json` - All prompts
- `backend/data/categories.json` - Category definitions

For production use, consider migrating to a proper database (PostgreSQL, MongoDB, etc.).

## Customization

### Adding New Categories
1. Use the Categories page in the UI, or
2. Edit `backend/data/categories.json` directly

### Modifying Sample Data
Edit `backend/data/sample-prompts.json` and restart the server (only loads on first run).

### Styling
The app uses Material-UI with a professional theme. Modify the theme in `frontend/src/App.tsx`.

## Production Deployment

### Build for Production
```bash
npm run build
```

### Start Production Server
```bash
npm start
```

### Environment Variables
Create `.env` files for configuration:
- `REACT_APP_API_URL` - API base URL for frontend
- `PORT` - Backend server port (default: 3001)

## Technical Architecture

### Backend
- **Express.js** - Web server framework
- **File-based storage** - JSON files for persistence
- **CORS enabled** - Cross-origin requests supported
- **Request logging** - Morgan middleware
- **Security headers** - Helmet middleware

### Frontend
- **React 18** with TypeScript
- **Material-UI** - Professional component library
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls
- **Responsive design** - Mobile-friendly interface

## Contributing

1. Follow the existing code structure and naming conventions
2. Add TypeScript types for new features
3. Use Material-UI components for consistency
4. Test both create/read/update/delete operations
5. Consider mobile responsiveness for new UI components

## Support

For technical issues:
1. Check browser console for errors
2. Verify backend server is running on port 3001
3. Ensure all npm dependencies are installed
4. Check network requests in browser dev tools

---

**Built for Directors and Product Managers who want to systematically leverage LLMs for strategic decision-making, team leadership, and organizational excellence.**