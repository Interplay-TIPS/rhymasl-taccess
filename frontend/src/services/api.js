import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Get stored token
const getStoredToken = () => {
  return sessionStorage.getItem('auth_token');
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add auth interceptor to use stored token
api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses - show clear error messages instead of browser popup
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear stored token
      sessionStorage.removeItem('auth_token');
      // Don't reload immediately - let the component handle the error
      // This prevents browser popup and allows showing error messages
      error.isAuthError = true;
      error.authMessage = error.response?.data?.detail || 'Session expired. Please login again.';
    }
    return Promise.reject(error);
  }
);

// Request deduplication cache
const requestCache = new Map();
const pendingRequests = new Map();

// Helper function for request deduplication
const makeRequest = async (key, requestFn) => {
  // Check if request is already cached
  if (requestCache.has(key)) {
    console.log(`API: Using cached response for ${key}`);
    return requestCache.get(key);
  }
  
  // Check if request is already pending
  if (pendingRequests.has(key)) {
    console.log(`API: Waiting for pending request ${key}`);
    return pendingRequests.get(key);
  }
  
  // Make new request
  const requestPromise = requestFn();
  pendingRequests.set(key, requestPromise);
  
  try {
    const result = await requestPromise;
    requestCache.set(key, result);
    console.log(`API: Cached response for ${key}`);
    return result;
  } finally {
    pendingRequests.delete(key);
  }
};

export const storyAPI = {
  processStory: async (text, relatedSigns = {}) => {
    console.log(`API: Processing story (${text.length} chars) with ${Object.keys(relatedSigns).length} related signs`);
    const startTime = performance.now();
    
    const cacheKey = `processStory:${text}:${JSON.stringify(relatedSigns)}`;
    
    const result = await makeRequest(cacheKey, async () => {
      const response = await api.post('/api/story/process', {
        text,
        related_signs: relatedSigns,
      });
      return response.data;
    });
    
    const duration = performance.now() - startTime;
    console.log(`API: Story processing completed in ${duration.toFixed(2)}ms`);
    return result;
  },

  generateStory: async (words, numSentences = 1, numWords = 7) => {
    const response = await api.post('/api/story/generate', {
      words,
      num_sentences: numSentences,
      num_words: numWords,
    });
    return response.data;
  },

  generateImage: async (prompt) => {
    console.log(`API: Generating image for prompt (${prompt.length} chars)`);
    const startTime = performance.now();
    
    const cacheKey = `generateImage:${prompt}`;
    
    const result = await makeRequest(cacheKey, async () => {
      const response = await api.post('/api/image/generate', {
        prompt,
      });
      return response.data;
    });
    
    const duration = performance.now() - startTime;
    console.log(`API: Image generation completed in ${duration.toFixed(2)}ms`);
    return result;
  },
};

export const signAPI = {
  getSignInfo: async (entryId) => {
    console.log(`API: Getting sign info for ${entryId}`);
    const startTime = performance.now();
    
    const cacheKey = `getSignInfo:${entryId}`;
    
    const result = await makeRequest(cacheKey, async () => {
      const response = await api.get(`/api/sign/info/${entryId}`);
      return response.data;
    });
    
    const duration = performance.now() - startTime;
    console.log(`API: Sign info retrieved in ${duration.toFixed(2)}ms`);
    return result;
  },

  getRelatedSigns: async (entryId, aspect = 'handshape', numResults = 2) => {
    console.log(`API: Getting ${numResults} related signs for ${entryId} (${aspect})`);
    const startTime = performance.now();
    
    const cacheKey = `getRelatedSigns:${entryId}:${aspect}:${numResults}`;
    
    const result = await makeRequest(cacheKey, async () => {
      const response = await api.post('/api/sign/related', {
        entry_id: entryId,
        aspect,
        num_results: numResults,
      });
      return response.data;
    });
    
    const duration = performance.now() - startTime;
    console.log(`API: Related signs retrieved in ${duration.toFixed(2)}ms`);
    return result;
  },
};

export const mediaAPI = {
  getVideoUrl: (videoPath) => {
    const token = getStoredToken();
    const url = `${API_BASE_URL}/api/video/${videoPath}`;
    return token ? `${url}?token=${encodeURIComponent(token)}` : url;
  },
  getImageUrl: (imagePath) => {
    const token = getStoredToken();
    const url = `${API_BASE_URL}/api/image/${imagePath}`;
    return token ? `${url}?token=${encodeURIComponent(token)}` : url;
  },
};

export default api;
