import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Container } from '@mui/material';
import Header from './components/Header';
import VersionSelection from './components/VersionSelection';
import StorySelection from './components/StorySelection';
import StoryViewer from './components/StoryViewer';
import SignExplorer from './components/SignExplorer';
import SimpleWordMode from './components/SimpleWordMode';
import LoginForm from './components/LoginForm';
import './App.css';

const theme = createTheme({
  palette: {
    primary: {
      main: '#2E5266',
    },
    secondary: {
      main: '#10b981',
    },
    background: {
      default: '#f8f9fa',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 600,
    },
  },
});

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentStory, setCurrentStory] = useState(null);
  const [currentRelatedSigns, setCurrentRelatedSigns] = useState({});
  const [storyHistory, setStoryHistory] = useState([]);

  // Check if user is already authenticated on app load
  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (credentials) => {
    setIsAuthenticated(true);
  };

  const addToHistory = (story) => {
    if (story && story.trim() && !storyHistory.includes(story)) {
      setStoryHistory(prev => [story, ...prev]);
    }
  };

  const handleStorySelect = (story, relatedSigns = {}) => {
    setCurrentStory(story);
    setCurrentRelatedSigns(relatedSigns);
  };

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LoginForm onLogin={handleLogin} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
          <Header />
          <Container maxWidth="lg" sx={{ py: 4 }}>
            <Routes>
              <Route 
                path="/" 
                element={<VersionSelection />} 
              />
              <Route 
                path="/full-mode" 
                element={
                  <StorySelection 
                    onStorySelect={handleStorySelect}
                    storyHistory={storyHistory}
                    onAddToHistory={addToHistory}
                  />
                } 
              />
              <Route 
                path="/simple-mode" 
                element={<SimpleWordMode />} 
              />
              <Route 
                path="/story" 
                element={
                  <StoryViewer 
                    story={currentStory}
                    onStorySelect={handleStorySelect}
                    onAddToHistory={addToHistory}
                    relatedSigns={currentRelatedSigns}
                  />
                } 
              />
              <Route 
                path="/explore/:entryId" 
                element={
                  <SignExplorer 
                    onStorySelect={handleStorySelect}
                    onAddToHistory={addToHistory}
                  />
                } 
              />
            </Routes>
          </Container>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;
