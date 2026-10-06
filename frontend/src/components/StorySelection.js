import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Grid,
  Container,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  IconButton,
  Divider,
} from '@mui/material';
import {
  PlayArrow,
  Create,
  History,
  Delete,
  EmojiObjects,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const StorySelection = ({ onStorySelect, storyHistory, onAddToHistory }) => {
  const [inputText, setInputText] = useState('');
  const navigate = useNavigate();

  const presetStories = [
    {
      title: "Red worm, orange bison, yellow whale",
      text: "red worm, orange bison, yellow whale",
      description: "Story sentence 1"
    },
    {
      title: "Brown bear, brown bear, what do you see?",
      text: "brown bear, brown bear, what do you see?",
      description: "Story sentence 2"
    }
  ];

  const handleStorySubmit = () => {
    if (inputText.trim()) {
      onStorySelect(inputText.trim());
      onAddToHistory(inputText.trim());
      navigate('/story');
    }
  };

  const handlePresetSelect = (story) => {
    onStorySelect(story.text);
    onAddToHistory(story.text);
    navigate('/story');
  };

  const handleHistorySelect = (story) => {
    onStorySelect(story);
    navigate('/story');
  };

  const clearHistory = () => {
    // This would need to be implemented with proper state management
    console.log('Clear history');
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h2" component="h1" gutterBottom sx={{ color: 'primary.main', mb: 2 }}>
          👋 Welcome to the Rhyming ASL Story Generator!
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          Let's create your ASL story together.
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Create Your Own Story */}
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Create color="primary" sx={{ mr: 1 }} />
                <Typography variant="h5" component="h2">
                  Create Your Own Story
                </Typography>
              </Box>
              
              <TextField
                fullWidth
                multiline
                rows={4}
                placeholder="Enter your story here..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                variant="outlined"
                sx={{ mb: 3 }}
              />
              
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<PlayArrow />}
                onClick={handleStorySubmit}
                disabled={!inputText.trim()}
                sx={{ py: 1.5 }}
              >
                🚀 Start ASL Story
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Preset Stories */}
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <EmojiObjects color="primary" sx={{ mr: 1 }} />
                <Typography variant="h5" component="h2">
                  Or Pick a Story to Start
                </Typography>
              </Box>
              
              {presetStories.map((story, index) => (
                <Paper
                  key={index}
                  elevation={1}
                  sx={{
                    p: 2,
                    mb: 2,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      elevation: 3,
                      transform: 'translateY(-2px)',
                    },
                  }}
                  onClick={() => handlePresetSelect(story)}
                >
                  <Typography variant="h6" gutterBottom>
                    {story.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {story.description}
                  </Typography>
                </Paper>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Story History */}
        {storyHistory.length > 0 && (
          <Grid item xs={12}>
            <Card elevation={3}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <History color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h5" component="h2">
                      📚 Story History
                    </Typography>
                  </Box>
                  <IconButton onClick={clearHistory} color="error">
                    <Delete />
                  </IconButton>
                </Box>
                
                <List>
                  {storyHistory.map((story, index) => (
                    <React.Fragment key={index}>
                      <ListItem disablePadding>
                        <ListItemButton onClick={() => handleHistorySelect(story)}>
                          <ListItemText
                            primary={`${index + 1}. ${story.length > 50 ? story.substring(0, 50) + '...' : story}`}
                            secondary="Click to replay"
                          />
                        </ListItemButton>
                      </ListItem>
                      {index < storyHistory.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Container>
  );
};

export default StorySelection;
