import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
} from '@mui/material';
import {
  ArrowBack,
  PlayArrow,
  Pause,
  Stop,
  Edit,
  Check,
  Close,
  Refresh,
  Search,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { storyAPI, signAPI, mediaAPI } from '../services/api';

const SimpleWordMode = () => {
  const [inputWord, setInputWord] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Utility function to clean sign text by removing L_ prefix and _num suffixes
  const cleanSignText = (text) => {
    if (!text) return text;
    return text.replace(/^L_/, '').replace(/_\d+$/, '');
  };
  const [originalSign, setOriginalSign] = useState(null);
  const [relatedSigns, setRelatedSigns] = useState(null);
  const [relatedSignsInfo, setRelatedSignsInfo] = useState({});
  const [relatedSignsMapping, setRelatedSignsMapping] = useState({});
  const [generatedStory, setGeneratedStory] = useState('');
  const [storyData, setStoryData] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [editingStory, setEditingStory] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState(null);
  const [aspect, setAspect] = useState('handshape');
  const [numResults, setNumResults] = useState(1);
  const [loadingRelated, setLoadingRelated] = useState(false);
  
  const navigate = useNavigate();
  const videoSectionRef = React.useRef(null);
  const fallbackTimerRef = React.useRef(null);
  const preloadCacheRef = React.useRef({});
  const abortControllerRef = React.useRef(null);

  const processWord = async () => {
    if (!inputWord.trim()) return;

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);
    setOriginalSign(null);
    setRelatedSigns(null);
    setRelatedSignsMapping({});
    setGeneratedStory('');
    setStoryData(null);
    setGeneratedImageUrl(null);

    try {
      // Extract the last word from input (in case user typed multiple words)
      const words = inputWord.trim().split(/\s+/);
      const targetWord = words[words.length - 1];
      
      
      // Step 1: Find the original sign for the input word using ASL similarity
      // Use the last word directly as a "sentence" - this is much cleaner!
      const storyDataResponse = await storyAPI.processStory(targetWord, {});
      
      if (storyDataResponse.entry_list && storyDataResponse.entry_list.length > 0) {
        const originalEntryId = storyDataResponse.entry_list[0];
        const originalLemmaId = storyDataResponse.lemma_list[0];
        
        // Get sign info for the original sign
        const signInfo = await signAPI.getSignInfo(originalEntryId);
        const newOriginalSign = {
          entryId: originalEntryId,
          lemmaId: originalLemmaId,
          signInfo: signInfo,
          videoPath: storyDataResponse.video_paths[0]
        };
        setOriginalSign(newOriginalSign);
        
        // Load related signs using the existing pattern, passing the new sign data directly
        await loadRelatedSigns(originalEntryId, aspect, numResults, newOriginalSign);
      }
    } catch (err) {
      console.error('Error processing word:', err);
      if (!abortControllerRef.current?.signal.aborted) {
        if (err.isAuthError) {
          sessionStorage.removeItem('auth_token');
          window.location.reload();
        } else {
          setError(err.authMessage || 'Failed to process word. Please try again.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const loadRelatedSigns = async (entryId, currentAspect = aspect, currentNumResults = numResults, originalSignData = null) => {
    if (loadingRelated) return; // Prevent multiple simultaneous calls
    
    setLoadingRelated(true);
    try {
      const relatedSignsData = await signAPI.getRelatedSigns(entryId, currentAspect, currentNumResults);
      setRelatedSigns(relatedSignsData);
      
      // Fetch sign information for each related sign
      const signInfoPromises = relatedSignsData.entry_ids.map(async (relatedEntryId) => {
        try {
          const info = await signAPI.getSignInfo(relatedEntryId);
          return { entryId: relatedEntryId, info };
        } catch (err) {
          console.error(`Error loading sign info for ${relatedEntryId}:`, err);
          return { entryId: relatedEntryId, info: null };
        }
      });
      
      const signInfoResults = await Promise.all(signInfoPromises);
      const signInfoMap = {};
      signInfoResults.forEach(({ entryId, info }) => {
        signInfoMap[entryId] = info;
      });
      setRelatedSignsInfo(signInfoMap);
      
      // Use provided originalSignData or fall back to state
      const currentOriginalSign = originalSignData || originalSign;
      
      // Generate story with related signs only when we have new related signs
      if (relatedSignsData.lemma_ids.length > 0) {
        // Include original sign's lemma_id in story generation
        const words = currentOriginalSign && currentOriginalSign.lemmaId 
          ? [currentOriginalSign.lemmaId, ...relatedSignsData.lemma_ids]
          : [...relatedSignsData.lemma_ids];
        console.log('Story generation words (including original):', words);
        const storyData = await storyAPI.generateStory(words);
        setGeneratedStory(storyData.story);
        
        // Process the generated story to get full story data
        const newRelatedSignsMapping = {};
        
        // Helper function to normalize lemma_id by removing _N suffix (e.g., 'same_1' -> 'same')
        const normalizeLemmaId = (lemmaId) => {
          if (!lemmaId) return lemmaId;
          // Remove suffix pattern like _1, _2, _3, etc.
          return lemmaId.replace(/_\d+$/, '');
        };
        
        // Add original sign to mapping if available
        if (currentOriginalSign && currentOriginalSign.lemmaId && currentOriginalSign.entryId) {
          const normalizedKey = normalizeLemmaId(currentOriginalSign.lemmaId);
          newRelatedSignsMapping[normalizedKey] = currentOriginalSign.entryId;
        }
        relatedSignsData.lemma_ids.forEach((lemma, index) => {
          if (relatedSignsData.entry_ids[index]) {
            const normalizedKey = normalizeLemmaId(lemma);
            newRelatedSignsMapping[normalizedKey] = relatedSignsData.entry_ids[index];
          }
        });
        
        // Store the mapping in state for later use (e.g., when editing story)
        setRelatedSignsMapping(newRelatedSignsMapping);
        
        const storyDataResponse = await storyAPI.processStory(storyData.story, newRelatedSignsMapping);
        setStoryData(storyDataResponse);
        
        // Generate image for the story
        try {
          const imageData = await storyAPI.generateImage(storyData.story);
          setGeneratedImageUrl(imageData.image_url);
        } catch (imageErr) {
          console.warn('Image generation failed:', imageErr);
        }
      }
    } catch (err) {
      console.error('Error loading related signs:', err);
      if (err.isAuthError) {
        sessionStorage.removeItem('auth_token');
        window.location.reload();
      }
    } finally {
      setLoadingRelated(false);
    }
  };

  // Load related signs when aspect or numResults change
  useEffect(() => {
    if (originalSign) {
      loadRelatedSigns(originalSign.entryId, aspect, numResults);
    }
  }, [aspect, numResults, originalSign]);

  const handleGlossClick = (gloss, index) => {
    if (storyData) {
      // In word mode, clicking a gloss should update the input word and process it
      setInputWord(gloss);
      
      // Extract only the mapping for the clicked word from the related_signs mapping
      // This ensures we use the same EntryID that was used for this word in the previous story
      const clickedWordMapping = {};
      if (relatedSignsMapping[gloss]) {
        clickedWordMapping[gloss] = relatedSignsMapping[gloss];
      }
      
      // Process the clicked word directly, passing only its mapping
      processSpecificWord(gloss, clickedWordMapping);
    }
  };

  const processSpecificWord = async (word, previousRelatedSignsMapping = {}) => {
    if (!word.trim()) return;

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);
    setOriginalSign(null);
    setRelatedSigns(null);
    setRelatedSignsMapping({});
    setGeneratedStory('');
    setStoryData(null);
    setGeneratedImageUrl(null);

    try {
      console.log('Processing specific word:', word);
      console.log('Using previous related_signs mapping:', previousRelatedSignsMapping);
      
      // Step 1: Find the original sign for the input word using ASL similarity
      // Pass the previous related_signs mapping so it uses the same EntryID from the previous story
      const storyDataResponse = await storyAPI.processStory(word, previousRelatedSignsMapping);
      
      if (storyDataResponse.entry_list && storyDataResponse.entry_list.length > 0) {
        const originalEntryId = storyDataResponse.entry_list[0];
        const originalLemmaId = storyDataResponse.lemma_list[0];
        
        // Get sign info for the original sign
        const signInfo = await signAPI.getSignInfo(originalEntryId);
        const newOriginalSign = {
          entryId: originalEntryId,
          lemmaId: originalLemmaId,
          signInfo: signInfo,
          videoPath: storyDataResponse.video_paths[0]
        };
        setOriginalSign(newOriginalSign);
        
        // Load related signs using the existing pattern, passing the new sign data directly
        await loadRelatedSigns(originalEntryId, aspect, numResults, newOriginalSign);
      }
    } catch (err) {
      console.error('Error processing word:', err);
      if (!abortControllerRef.current?.signal.aborted) {
        if (err.isAuthError) {
          sessionStorage.removeItem('auth_token');
          window.location.reload();
        } else {
          setError(err.authMessage || 'Failed to process word. Please try again.');
        }
      }
    } finally {
      setLoading(false);
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
    setEditedText(generatedStory);
    setEditingStory(true);
  };

  const handleSaveEdit = async () => {
    setGeneratedStory(editedText);
    setEditingStory(false);
    setEditedText('');
    
    // Reprocess the edited story to update image and gloss
    try {
      // Generate new image for the edited story
      const imageResponse = await storyAPI.generateImage(editedText);
      setGeneratedImageUrl(imageResponse.image_url);
      
      // Process the edited story to get new gloss data, using the stored related_signs mapping
      const storyDataResponse = await storyAPI.processStory(editedText, relatedSignsMapping);
      setStoryData(storyDataResponse);
      
      // Reset video playback
      setIsPlaying(false);
      setCurrentVideoIndex(0);
    } catch (err) {
      console.error('Error reprocessing edited story:', err);
      if (err.isAuthError) {
        sessionStorage.removeItem('auth_token');
        window.location.reload();
      }
      // Don't show other errors to user, just keep the text change
    }
  };

  const handleCancelEdit = () => {
    setEditingStory(false);
    setEditedText('');
  };

  const cleanGlossText = (gloss) => {
    // Remove only commas, periods, and semicolons from ASL gloss
    return gloss.replace(/[,\.;]/g, '');
  };

  const getStoryImage = () => {
    return "pig_cake.jpg"; // Default fallback image
  };

  // Cleanup effect to cancel requests when component unmounts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        console.log('SimpleWordMode unmounted, cancelled pending requests');
      }
    };
  }, []);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/')} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          🎯 Simple Word Mode
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={processWord}
          disabled={!inputWord.trim() || loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Word Input Section */}
      <Card elevation={3} sx={{ mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Enter a word to explore similar signs and generate a story:
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            <TextField
              fullWidth
              placeholder="Type a word (e.g., 'cat', 'happy', 'run') - last word will be used if multiple words entered..."
              value={inputWord}
              onChange={(e) => setInputWord(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !loading) {
                  processWord();
                }
              }}
              variant="outlined"
              disabled={loading}
            />
            <Button
              variant="contained"
              size="large"
              startIcon={loading ? <CircularProgress size={20} /> : <Search />}
              onClick={processWord}
              disabled={!inputWord.trim() || loading}
              sx={{ minWidth: 140 }}
            >
              {loading ? 'Processing...' : 'Explore'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ ml: 2 }}>
            Finding similar signs and generating story...
          </Typography>
        </Box>
      )}

      {/* Results Section */}
      {originalSign && (
        <Grid container spacing={4}>
          {/* Original Sign Information */}
          <Grid item xs={12} md={6}>
            <Card elevation={3} sx={{ mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h5" gutterBottom>
                  Original Sign: "{inputWord}"
                </Typography>
                <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontStyle: 'italic' }}>
                  ASL Gloss: {cleanSignText(originalSign.entryId)}
                </Typography>
                
                <Box>
                  <Box sx={{ 
                    width: '100%', 
                    height: '250px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: '#000',
                    borderRadius: '8px',
                    mb: 2,
                    overflow: 'hidden'
                  }}>
                    <video
                      src={mediaAPI.getVideoUrl(originalSign.videoPath)}
                      autoPlay
                      muted
                      loop
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'contain',
                        borderRadius: '8px'
                      }}
                    />
                  </Box>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Handshape
                      </Typography>
                      <Typography variant="body1">
                        {originalSign.signInfo.handshape}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Movement
                      </Typography>
                      <Typography variant="body1">
                        {originalSign.signInfo.movement}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Repeated Movement
                      </Typography>
                      <Typography variant="body1">
                        {originalSign.signInfo.repeated_movement}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Rotation
                      </Typography>
                      <Typography variant="body1">
                        {originalSign.signInfo.rotation}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Major Location
                      </Typography>
                      <Typography variant="body1">
                        {originalSign.signInfo.major_location}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Minor Location
                      </Typography>
                      <Typography variant="body1">
                        {originalSign.signInfo.minor_location}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Controls */}
          <Grid item xs={12} md={6}>
            <Card elevation={3} sx={{ mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h5" gutterBottom>
                  Phonological Analysis
                </Typography>
                
                {loadingRelated && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
                    <CircularProgress size={16} sx={{ mr: 1 }} />
                    Loading related signs...
                  </Typography>
                )}
                
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Choose phonological aspect</InputLabel>
                  <Select
                    value={aspect}
                    label="Choose phonological aspect"
                    onChange={(e) => setAspect(e.target.value)}
                    disabled={loadingRelated}
                  >
                    <MenuItem value="handshape">Handshape</MenuItem>
                    <MenuItem value="movement">Movement</MenuItem>
                    <MenuItem value="location">Location</MenuItem>
                    <MenuItem value="combined">Combined</MenuItem>
                  </Select>
                </FormControl>
                
                <Typography gutterBottom>
                  Number of related signs: {numResults}
                </Typography>
                
                <Slider
                  value={numResults}
                  onChange={(e, value) => setNumResults(value)}
                  min={1}
                  max={3}
                  step={1}
                  marks
                  valueLabelDisplay="auto"
                  disabled={loadingRelated}
                  sx={{ mb: 3 }}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Related Signs */}
          {relatedSigns && (
            <Grid item xs={12}>
              <Card elevation={3} sx={{ mb: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h5" gutterBottom>
                    Related Signs
                  </Typography>
                  
                  <Grid container spacing={2}>
                    {relatedSigns.entry_ids.map((relatedEntryId, index) => {
                      const relatedSignInfo = relatedSignsInfo[relatedEntryId];
                      return (
                        <Grid item xs={12} sm={6} key={index}>
                          <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <CardContent sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                              <Box sx={{ 
                                width: '100%', 
                                height: '250px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                backgroundColor: '#000',
                                borderRadius: '8px',
                                mb: 2,
                                overflow: 'hidden'
                              }}>
                                <video
                                  src={mediaAPI.getVideoUrl(relatedSigns.video_paths[index])}
                                  muted
                                  style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    objectFit: 'contain',
                                    borderRadius: '8px'
                                  }}
                                  controls
                                />
                              </Box>
                              <Typography variant="h6" sx={{ mb: 2, textAlign: 'center', minHeight: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {cleanSignText(relatedSigns.lemma_ids[index])}
                              </Typography>
                              
                              {relatedSignInfo && (
                                <Box sx={{ flexGrow: 1 }}>
                                  <Grid container spacing={1}>
                                    <Grid item xs={6}>
                                      <Typography variant="caption" color="text.secondary">
                                        Handshape
                                      </Typography>
                                      <Typography variant="body2" sx={{ 
                                        minHeight: '2.5rem', 
                                        maxHeight: '2.5rem',
                                        width: '100%',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        lineHeight: '1.25rem'
                                      }}>
                                        {relatedSignInfo.handshape}
                                      </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                      <Typography variant="caption" color="text.secondary">
                                        Movement
                                      </Typography>
                                      <Typography variant="body2" sx={{ 
                                        minHeight: '2.5rem', 
                                        maxHeight: '2.5rem',
                                        width: '100%',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        lineHeight: '1.25rem'
                                      }}>
                                        {relatedSignInfo.movement}
                                      </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                      <Typography variant="caption" color="text.secondary">
                                        Repeated Movement
                                      </Typography>
                                      <Typography variant="body2" sx={{ 
                                        minHeight: '2.5rem', 
                                        maxHeight: '2.5rem',
                                        width: '100%',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        lineHeight: '1.25rem'
                                      }}>
                                        {relatedSignInfo.repeated_movement}
                                      </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                      <Typography variant="caption" color="text.secondary">
                                        Rotation
                                      </Typography>
                                      <Typography variant="body2" sx={{ 
                                        minHeight: '2.5rem', 
                                        maxHeight: '2.5rem',
                                        width: '100%',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        lineHeight: '1.25rem'
                                      }}>
                                        {relatedSignInfo.rotation}
                                      </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                      <Typography variant="caption" color="text.secondary">
                                        Major Location
                                      </Typography>
                                      <Typography variant="body2" sx={{ 
                                        minHeight: '2.5rem', 
                                        maxHeight: '2.5rem',
                                        width: '100%',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        lineHeight: '1.25rem'
                                      }}>
                                        {relatedSignInfo.major_location}
                                      </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                      <Typography variant="caption" color="text.secondary">
                                        Minor Location
                                      </Typography>
                                      <Typography variant="body2" sx={{ 
                                        minHeight: '2.5rem', 
                                        maxHeight: '2.5rem',
                                        width: '100%',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        lineHeight: '1.25rem'
                                      }}>
                                        {relatedSignInfo.minor_location}
                                      </Typography>
                                    </Grid>
                                  </Grid>
                                </Box>
                              )}
                              
                              {!relatedSignInfo && (
                                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                                  Loading sign info...
                                </Typography>
                              )}
                            </CardContent>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Generated Story and Video Row */}
          {generatedStory && (
            <Grid item xs={12}>
              <Grid container spacing={3}>
                {/* Left side: Story, Gloss, and Image */}
                <Grid item xs={12} md={8}>
                  <Card elevation={3} sx={{ mb: 3 }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h5">
                          ✏️ Generated Story
                        </Typography>
                        <Button
                          variant="outlined"
                          startIcon={<Edit />}
                          onClick={handleEditStory}
                        >
                          Edit
                        </Button>
                      </Box>
                      <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                        {generatedStory}
                      </Typography>
                      
                      {/* ASL Gloss */}
                      {storyData && storyData.asl_list && storyData.asl_list.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="h6" gutterBottom>
                            ASL Gloss
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
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
                      )}
                      
                      {/* Smaller Image */}
                      <img
                        src={generatedImageUrl || mediaAPI.getImageUrl(getStoryImage())}
                        alt="Story illustration"
                        style={{ width: '60%', height: 'auto', borderRadius: '8px' }}
                      />
                    </CardContent>
                  </Card>
                </Grid>

                {/* Right side: Video Playback */}
                {storyData && storyData.video_paths && storyData.video_paths.length > 0 && (
                  <Grid item xs={12} md={4} ref={videoSectionRef}>
                    <Card elevation={3}>
                      <CardContent sx={{ p: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2 }}>
                          <Typography variant="h6">Video Playback</Typography>
                        </Box>
                  {isPlaying && currentVideoIndex < storyData.video_paths.length ? (
                  <Box>
                    <Box sx={{ 
                      width: '100%',
                      maxWidth: '100%',
                      aspectRatio: '16/9',
                      maxHeight: { xs: 200, sm: 250, md: 300 },
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
                        onEnded={() => { 
                          if (fallbackTimerRef.current) { 
                            clearTimeout(fallbackTimerRef.current); 
                            fallbackTimerRef.current = null; 
                          } 
                          advanceToNextClip(); 
                        }}
                        onError={() => { 
                          if (fallbackTimerRef.current) { 
                            clearTimeout(fallbackTimerRef.current); 
                            fallbackTimerRef.current = null; 
                          } 
                          advanceToNextClip(); 
                        }}
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
                          width: '100%',
                          maxWidth: '100%',
                          aspectRatio: '16/9',
                          maxHeight: { xs: 200, sm: 250, md: 300 },
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
                )}
              </Grid>
            </Grid>
          )}
        </Grid>
      )}

      {/* Edit Story Dialog */}
      <Dialog open={editingStory} onClose={handleCancelEdit} maxWidth="md" fullWidth>
        <DialogTitle>Edit Generated Story</DialogTitle>
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

export default SimpleWordMode;
