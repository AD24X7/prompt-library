import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { NavBar } from './components/NavBar';
import { Dashboard } from './pages/Dashboard';
import { PromptsPage } from './pages/PromptsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { CreatePromptPage } from './pages/CreatePromptPage';
import { EditPromptPage } from './pages/EditPromptPage';
import { PromptDetailPage } from './pages/PromptDetailPage';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <NavBar />
            <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/prompts" element={<PromptsPage />} />
                <Route path="/prompts/:id" element={<PromptDetailPage />} />
                <Route path="/prompts/:id/edit" element={<EditPromptPage />} />
                <Route path="/create" element={<CreatePromptPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
              </Routes>
            </Box>
          </Box>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
