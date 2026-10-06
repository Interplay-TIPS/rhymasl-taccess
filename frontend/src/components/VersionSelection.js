import React from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Container,
  Paper,
} from '@mui/material';
import {
  AutoStories,
  Psychology,
  ArrowForward,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const VersionSelection = () => {
  const navigate = useNavigate();

  const handleVersionSelect = (version) => {
    if (version === 'full') {
      navigate('/full-mode');
    } else if (version === 'simple') {
      navigate('/simple-mode');
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h2" component="h1" gutterBottom sx={{ color: 'primary.main', mb: 2 }}>
          👋 Welcome to RhymASL!
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          Choose your preferred experience to get started with ASL storytelling.
        </Typography>
      </Box>

      <Grid container spacing={4} justifyContent="center" alignItems="stretch">
        {/* Full Story Mode */}
        <Grid item xs={12} lg={6} sx={{ display: 'flex' }}>
          <Card 
            elevation={3} 
            sx={{ 
              height: '100%',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 6,
              },
            }}
            onClick={() => handleVersionSelect('full')}
          >
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <AutoStories 
                sx={{ 
                  fontSize: 80, 
                  color: 'primary.main', 
                  mb: 2 
                }} 
              />
              <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
                Full Story Mode
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
                Create rhyming ASL story sentences,<br/>
                explore phonological features among ASL signs,<br/>
                visualize ASL sign videos and images for stories.
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Features:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Rhyming story creation<br/>
                  • Sign phonological analysis and exploration<br/>
                  • Story editing and history
                </Typography>
              </Box>
              
              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForward />}
                sx={{ 
                  py: 1.5, 
                  px: 4,
                  borderRadius: 2,
                }}
              >
                Start Full Mode
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Simple Word Mode */}
        <Grid item xs={12} lg={6} sx={{ display: 'flex' }}>
          <Card 
            elevation={3} 
            sx={{ 
              height: '100%',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 6,
              },
            }}
            onClick={() => handleVersionSelect('simple')}
          >
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <Psychology 
                sx={{ 
                  fontSize: 80, 
                  color: 'secondary.main', 
                  mb: 2 
                }} 
              />
              <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
                Simple Word Mode
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
                Enter a single word and instantly see<br/>
                phonologically similar signs, generated story,<br/>
                and ASL sign videos all in one streamlined interface.
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Features:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Single word input<br/>
                  • Phonologically similar signs discovery<br/>
                  • Auto-generated story<br/>
                  • All-in-one interface
                </Typography>
              </Box>
              
              <Button
                variant="contained"
                color="secondary"
                size="large"
                endIcon={<ArrowForward />}
                sx={{ 
                  py: 1.5, 
                  px: 4,
                  borderRadius: 2,
                }}
              >
                Start Simple Mode
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Additional Info */}
      <Box sx={{ textAlign: 'center', mt: 6 }}>
        <Paper elevation={1} sx={{ p: 3, backgroundColor: 'background.paper' }}>
          <Typography variant="body2" color="text.secondary">
            💡 <strong>Tip:</strong> You can switch between modes anytime using the header navigation. 
            Both modes share the same powerful ASL analysis engine!
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default VersionSelection;
