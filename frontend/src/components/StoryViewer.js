import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  ArrowBack,
  PlayArrow,
  Pause,
  Stop,
  Edit,
  Refresh,
  Check,
  Close,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { storyAPI, mediaAPI } from '../services/api';

const StoryViewer = ({ story, onStorySelect, onAddToHistory, relatedSigns = {} }) => {
  const [storyData, setStoryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [editingStory, setEditingStory] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState(null);
  const navigate = useNavigate();
  const videoSectionRef = useRef(null);
  const fallbackTimerRef = useRef(null);
  const preloadCacheRef = useRef({});
  const imageGenerationRef = useRef(null);
  const processingRef = useRef(null);
  const imageGenerationPromiseRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    if (story && (!processingRef.current || processingRef.current !== story)) {
      processingRef.current = story; // Mark as processing
      
      // Reset image generation ref for new story
      if (imageGenerationRef.current !== story) {
        imageGenerationRef.current = null;
        setGeneratedImageUrl(null);
      }
      
      // Wait for backend health before processing
      setLoading(true);
      const waitForBackend = async (timeoutMs = 60000) => {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
          try {
            const res = await fetch('http://127.0.0.1:8000/health', { cache: 'no-store' });
            if (res.ok) {
              const json = await res.json();
              if (json && json.status === 'healthy') break;
            }
          } catch (_) {
            // keep polling
          }
          await new Promise(r => setTimeout(r, 1000));
        }
        processStory();
      };
      waitForBackend();
    }
  }, [story]);

  // Cleanup effect to cancel requests when component unmounts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        console.log('StoryViewer unmounted, cancelled pending requests');
      }
    };
  }, []);

  const processStory = async (retryCount = 0) => {
    
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setError(null);
    try {
      console.time('API Call - processStory');
      const data = await storyAPI.processStory(story, relatedSigns);
      console.timeEnd('API Call - processStory');
      console.log('Story data received:', data);
      
      // Check if request was cancelled
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }
      
      setStoryData(data);
      
      // Generate image for the story (only if not already generated for this story)
      if (!imageGenerationRef.current || imageGenerationRef.current !== story) {
        console.log('Generating image for story:', story);
        
        // Cancel any existing image generation
        if (imageGenerationPromiseRef.current) {
        }
        
        try {
          console.time('API Call - generateImage');
          const imagePromise = storyAPI.generateImage(story);
          imageGenerationPromiseRef.current = imagePromise;
          
          const imageData = await imagePromise;
          console.timeEnd('API Call - generateImage');
          
          // Only set the image if this is still the current story
          if (processingRef.current === story) {
            setGeneratedImageUrl(imageData.image_url);
            imageGenerationRef.current = story; // Mark this story as having generated an image
            console.log('Image generated successfully for:', story);
          } else {
            console.log('Story changed during image generation, discarding result');
          }
        } catch (imageErr) {
          console.warn('Image generation failed, using fallback:', imageErr);
          // Keep using static images as fallback
        } finally {
          imageGenerationPromiseRef.current = null;
        }
      } else {
        console.log('Image already generated for story:', story, 'skipping generation');
      }
    } catch (err) {
      console.error('Error processing story:', err);
      console.timeEnd('Story Processing');
      
      // Don't retry if request was cancelled
      if (abortControllerRef.current?.signal.aborted) {
        console.log('Story processing cancelled, not retrying');
        return;
      }
      
      // If it's a network error and we haven't retried too many times, retry after a delay
      if (err.code === 'ERR_NETWORK' && retryCount < 5) {
        console.log(`Retrying in ${(retryCount + 1) * 1000}ms... (attempt ${retryCount + 1}/5)`);
        setTimeout(() => {
          processStory(retryCount + 1);
        }, (retryCount + 1) * 1000);
        return;
      }
      
      setError('Failed to process story. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGlossClick = (gloss, index) => {
    if (storyData) {
      navigate(`/explore/${storyData.entry_list[index]}`);
    }
  };

  const playStory = () => {
    setIsPlaying(true);
    setCurrentVideoIndex(0);
  };

  const advanceToNextClip = () => {
    setCurrentVideoIndex(prevIndex => {
      if (!storyData) return prevIndex;
      const next = prevIndex + 1;
      if (next >= storyData.video_paths.length) {
        return isPlaying ? 0 : prevIndex; // loop while playing
      }
      return next;
    });
  };

  // Preload next two clips for smoother playback
  useEffect(() => {
    if (!storyData) return;
    const indicesToPreload = [currentVideoIndex + 1, currentVideoIndex + 2];
    indicesToPreload.forEach(idx => {
      if (idx >= 0 && idx < storyData.video_paths.length) {
        const url = mediaAPI.getVideoUrl(storyData.video_paths[idx]);
        if (!preloadCacheRef.current[url]) {
          const v = document.createElement('video');
          v.preload = 'auto';
          v.src = url;
          preloadCacheRef.current[url] = v;
        }
      }
    });
  }, [storyData, currentVideoIndex]);

  // Fallback timer in case 'ended' does not fire reliably
  useEffect(() => {
    if (!isPlaying || !storyData || currentVideoIndex >= storyData.video_paths.length) {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      return;
    }
    const durationSec = (storyData.clip_durations[currentVideoIndex] || 0) / 1000;
    const bufferSec = 1.0;
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
    }
    fallbackTimerRef.current = setTimeout(() => {
      advanceToNextClip();
    }, (durationSec + bufferSec) * 1000);
    return () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
  }, [isPlaying, storyData, currentVideoIndex]);

  // Note: Removed automatic scrolling behavior to prevent jumping to video when user scrolls elsewhere

  const stopPlayback = () => {
    setIsPlaying(false);
    setCurrentVideoIndex(0);
  };

  const handleEditStory = () => {
    setEditedText(story);
    setEditingStory(true);
  };

  const handleSaveEdit = () => {
    onStorySelect(editedText);
    setEditingStory(false);
    setEditedText('');
  };

  const handleCancelEdit = () => {
    setEditingStory(false);
    setEditedText('');
  };

  const getStoryImage = () => {
    if (story === "if you give a pig a party") return "pig_party.jpg";
    if (story === "brown bear, brown bear, what do you see?") return "bear.jpg";
    return "pig_cake.jpg";
  };

  const cleanGlossText = (gloss) => {
    // Remove only commas, periods, and semicolons from ASL gloss
    return gloss.replace(/[,\.;]/g, '');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Processing your story...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={processStory}>
          Try Again
        </Button>
      </Box>
    );
  }

  if (!storyData) {
    return (
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No story data available
        </Typography>
        <Button variant="contained" onClick={() => navigate('/')} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/')} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          ASL Story Viewer
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Edit />}
          onClick={handleEditStory}
          sx={{ mr: 1 }}
        >
          Edit Story
        </Button>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={processStory}
        >
          Refresh
        </Button>
      </Box>

      <Grid container spacing={4}>
        {/* Row 1: Video full width */}
        <Grid item xs={12} ref={videoSectionRef}>
          <Card elevation={3}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2 }}>
                <Typography variant="h6">Video Playback</Typography>
              </Box>
              {isPlaying && currentVideoIndex < storyData.video_paths.length ? (
                <Box>
                  <Box sx={{ 
                    width: { xs: '100%', sm: '640px', md: '800px' },
                    maxWidth: '100%',
                    aspectRatio: '16/9',
                    maxHeight: { xs: 240, sm: 320, md: 360 },
                    overflow: 'hidden', 
                    backgroundColor: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    margin: '0 auto'
                  }}>
                    <video
                      key={currentVideoIndex}
                      src={mediaAPI.getVideoUrl(storyData.video_paths[currentVideoIndex])}
                      autoPlay
                      muted
                      playsInline
                      preload="auto"
                      onEnded={() => { if (fallbackTimerRef.current) { clearTimeout(fallbackTimerRef.current); fallbackTimerRef.current = null; } advanceToNextClip(); }}
                      onError={() => { if (fallbackTimerRef.current) { clearTimeout(fallbackTimerRef.current); fallbackTimerRef.current = null; } advanceToNextClip(); }}
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        display: 'block', 
                        objectFit: 'contain',
                        objectPosition: 'center center',
                        maxWidth: '100%',
                        maxHeight: '100%'
                      }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 3, py: 2 }}>
                    <Button variant="contained" color="error" startIcon={<Stop />} onClick={stopPlayback} size="small">
                      Stop
                    </Button>
                    <Typography variant="body2">
                      Playing: {storyData.lemma_ids[currentVideoIndex]}
                    </Typography>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', pt: 1, pb: 2 }}>
                  {storyData.video_paths.length > 0 ? (
                    <Box>
                      <Box sx={{ 
                        width: { xs: '100%', sm: '640px', md: '800px' },
                        maxWidth: '100%',
                        aspectRatio: '16/9',
                        maxHeight: { xs: 240, sm: 320, md: 360 },
                        overflow: 'hidden', 
                        backgroundColor: '#000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        margin: '0 auto'
                      }}>
                        <video
                          src={mediaAPI.getVideoUrl(storyData.video_paths[0])}
                          muted
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            display: 'block', 
                            objectFit: 'contain',
                            objectPosition: 'center center',
                            maxWidth: '100%',
                            maxHeight: '100%'
                          }}
                          controls
                          playsInline
                          preload="metadata"
                        />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 3, py: 2 }}>
                        <Button variant="contained" startIcon={<PlayArrow />} onClick={playStory} size="small">
                          Story Playback
                        </Button>
                        <Typography variant="body2">
                          Preview: {storyData.lemma_ids[0]}
                        </Typography>
                      </Box>
                    </Box>
                  ) : (
                    <Typography color="text.secondary">
                      No videos available
                    </Typography>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Row 2: Compact info with small image left and labels/content right - ALWAYS consistent layout */}
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3, minHeight: '200px' }}>
                {/* Image - Fixed width, always on left */}
                <Box sx={{ flexShrink: 0, width: '180px' }}>
                  <img
                    src={generatedImageUrl || mediaAPI.getImageUrl(getStoryImage())}
                    alt="Story illustration"
                    style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                  />
                </Box>
                
                {/* Content - Flexible width, always on right */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>ASL gloss:</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, flex: '1 1 auto' }}>
                      {storyData.asl_list.map((gloss, index) => {
                        const isActive = isPlaying && index === currentVideoIndex;
                        const entryId = storyData.entry_list[index];
                        const isFingerspelling = entryId && (
                          entryId.startsWith('temp_fingerspell_') || 
                          (entryId.length === 1 && entryId.match(/[a-z]/i))
                        );
                        return (
                          <Chip
                            key={index}
                            label={cleanGlossText(gloss)}
                            clickable={!isFingerspelling}
                            color={isActive ? 'secondary' : 'primary'}
                            variant={isActive ? 'filled' : 'outlined'}
                            onClick={!isFingerspelling ? () => handleGlossClick(gloss, index) : undefined}
                            sx={{ 
                              fontSize: '1.0rem', 
                              py: 1,
                              ...(isFingerspelling && {
                                cursor: 'default',
                                opacity: 0.7,
                                '&:hover': {
                                  opacity: 0.7
                                }
                              })
                            }}
                          />
                        );
                      })}
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>ASL sentence:</Typography>
                    <Typography variant="h6" sx={{ color: 'primary.main', wordBreak: 'break-word', overflowWrap: 'anywhere', flex: '1 1 auto' }}>
                      {story}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Edit Story Dialog */}
      <Dialog open={editingStory} onClose={handleCancelEdit} maxWidth="md" fullWidth>
        <DialogTitle>Edit Story</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            variant="outlined"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelEdit} startIcon={<Close />}>
            Cancel
          </Button>
          <Button onClick={handleSaveEdit} variant="contained" startIcon={<Check />}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StoryViewer;
