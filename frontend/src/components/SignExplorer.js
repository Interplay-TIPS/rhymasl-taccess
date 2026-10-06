import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Alert,
  CircularProgress,
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
  Edit,
  Check,
  Close,
  Refresh,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { signAPI, storyAPI, mediaAPI } from '../services/api';

const SignExplorer = ({ onStorySelect, onAddToHistory }) => {
  const { entryId } = useParams();
  const navigate = useNavigate();
  
  // Utility function to clean sign text by removing L_ prefix and _num suffixes
  const cleanSignText = (text) => {
    if (!text) return text;
    return text.replace(/^L_/, '').replace(/_\d+$/, '');
  };
  
  const [signInfo, setSignInfo] = useState(null);
  const [originalLemmaId, setOriginalLemmaId] = useState(null);
  const [relatedSigns, setRelatedSigns] = useState(null);
  const [relatedSignsInfo, setRelatedSignsInfo] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aspect, setAspect] = useState('handshape');
  const [numResults, setNumResults] = useState(1);
  const [generatedStory, setGeneratedStory] = useState('');
  const [editingStory, setEditingStory] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [loadingRelated, setLoadingRelated] = useState(false);

  useEffect(() => {
    if (entryId) {
      loadSignData();
    }
  }, [entryId]);

  useEffect(() => {
    if (entryId && signInfo) {
      loadRelatedSigns();
    }
  }, [entryId, aspect, numResults, signInfo]);

  const loadSignData = async () => {
    setLoading(true);
    setError(null);
    try {
      const signInfoData = await signAPI.getSignInfo(entryId);
      setSignInfo(signInfoData);
      
      // Get lemma_id for the original sign by processing it as a story
      try {
        const storyDataResponse = await storyAPI.processStory(entryId, {});
        if (storyDataResponse.lemma_list && storyDataResponse.lemma_list.length > 0) {
          setOriginalLemmaId(storyDataResponse.lemma_list[0]);
          console.log('Original sign lemma_id:', storyDataResponse.lemma_list[0]);
        }
      } catch (lemmaErr) {
        console.warn('Could not get lemma_id for original sign:', lemmaErr);
      }
    } catch (err) {
      if (err.isAuthError) {
        sessionStorage.removeItem('auth_token');
        window.location.reload();
      } else {
        setError(err.authMessage || 'Failed to load sign data. Please try again.');
        console.error('Error loading sign data:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadRelatedSigns = async () => {
    if (loadingRelated) return; // Prevent multiple simultaneous calls
    
    setLoadingRelated(true);
    try {
      const relatedSignsData = await signAPI.getRelatedSigns(entryId, aspect, numResults);
      setRelatedSigns(relatedSignsData);
      
      // Fetch sign information for each related sign
      const signInfoPromises = relatedSignsData.entry_ids.map(async (relatedEntryId) => {
        try {
          const info = await signAPI.getSignInfo(relatedEntryId);
          return { entryId: relatedEntryId, info };
        } catch (err) {
          if (err.isAuthError) {
            sessionStorage.removeItem('auth_token');
            window.location.reload();
            return { entryId: relatedEntryId, info: null };
          }
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
      
      // Generate story with related signs only when we have new related signs
      if (relatedSignsData.lemma_ids.length > 0) {
        // Include original sign's lemma_id in story generation
        const words = originalLemmaId 
          ? [originalLemmaId, ...relatedSignsData.lemma_ids]
          : [...relatedSignsData.lemma_ids];
        console.log('Story generation words (including original):', words);
        const storyData = await storyAPI.generateStory(words);
        setGeneratedStory(storyData.story);
      }
    } catch (err) {
      if (err.isAuthError) {
        sessionStorage.removeItem('auth_token');
        window.location.reload();
      } else {
        console.error('Error loading related signs:', err);
      }
    } finally {
      setLoadingRelated(false);
    }
  };

  const handleExploreNewStory = () => {
    if (generatedStory && relatedSigns) {
      // Create related signs mapping from the related signs
      const relatedSignsMapping = {};
      
      // Helper function to normalize lemma_id by removing _N suffix (e.g., 'same_1' -> 'same')
      const normalizeLemmaId = (lemmaId) => {
        if (!lemmaId) return lemmaId;
        // Remove suffix pattern like _1, _2, _3, etc.
        return lemmaId.replace(/_\d+$/, '');
      };
      
      relatedSigns.lemma_ids.forEach((lemma, index) => {
        if (relatedSigns.entry_ids[index]) {
          const normalizedKey = normalizeLemmaId(lemma);
          relatedSignsMapping[normalizedKey] = relatedSigns.entry_ids[index];
        }
      });
      
      onStorySelect(generatedStory, relatedSignsMapping);
      onAddToHistory(generatedStory);
      navigate('/story');
    }
  };

  const handleEditStory = () => {
    setEditedText(generatedStory);
    setEditingStory(true);
  };

  const handleSaveEdit = () => {
    setGeneratedStory(editedText);
    setEditingStory(false);
    setEditedText('');
  };

  const handleCancelEdit = () => {
    setEditingStory(false);
    setEditedText('');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading sign information...
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
        <Button variant="contained" onClick={loadSignData}>
          Try Again
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          🔍 Explore Sign: {cleanSignText(entryId)}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadSignData}
        >
          Refresh
        </Button>
      </Box>

      <Grid container spacing={4}>
        {/* Sign Information */}
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom>
                Sign Information
              </Typography>
              <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontStyle: 'italic' }}>
                ASL Gloss: {cleanSignText(entryId)}
              </Typography>
              
              {signInfo && (
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
                      src={mediaAPI.getVideoUrl(`ASL_LEX_MP4/L_${entryId}.mp4`)}
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
                        {signInfo.handshape}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Movement
                      </Typography>
                      <Typography variant="body1">
                        {signInfo.movement}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Repeated Movement
                      </Typography>
                      <Typography variant="body1">
                        {signInfo.repeated_movement}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Rotation
                      </Typography>
                      <Typography variant="body1">
                        {signInfo.rotation}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Major Location
                      </Typography>
                      <Typography variant="body1">
                        {signInfo.major_location}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Minor Location
                      </Typography>
                      <Typography variant="body1">
                        {signInfo.minor_location}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              )}
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
                
                <Grid container spacing={3}>
                  {relatedSigns.entry_ids.map((relatedEntryId, index) => {
                    const relatedSignInfo = relatedSignsInfo[relatedEntryId];
                    return (
                      <Grid item xs={12} sm={6} md={6} key={index}>
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

        {/* Generated Story */}
        {generatedStory && (
          <Grid item xs={12}>
            <Card elevation={3}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h5">
                    ✏️ Generated Story
                  </Typography>
                  <Box>
                    <Button
                      variant="outlined"
                      startIcon={<Edit />}
                      onClick={handleEditStory}
                      sx={{ mr: 1 }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<PlayArrow />}
                      onClick={handleExploreNewStory}
                    >
                      🔄 Explore New Story
                    </Button>
                  </Box>
                </Box>
                
                <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                  {generatedStory}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

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

export default SignExplorer;
