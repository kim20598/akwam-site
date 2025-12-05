const API_BASE_URL = 'http://localhost:8000/api';

class AkwamAPI {
    constructor() {
        this.cache = new Map();
    }

    async request(endpoint, options = {}) {
        const cacheKey = `${endpoint}_${JSON.stringify(options)}`;
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < 300000) { // 5 minutes cache
                return cached.data;
            }
        }

        try {
            const url = `${API_BASE_URL}${endpoint}`;
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            
            // Cache the response
            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    async getHomeContent(page = 1) {
        return this.request(`/home?page=${page}`);
    }

    async search(query, page = 1) {
        return this.request(`/search`, {
            method: 'POST',
            body: JSON.stringify({ query, page })
        });
    }

    async getMovieDetails(movieId) {
        return this.request(`/movie/${movieId}`);
    }

    async getSeriesDetails(seriesId) {
        return this.request(`/series/${seriesId}`);
    }

    async getVideoSources(contentId) {
        return this.request(`/watch/${contentId}`);
    }

    async getCategory(category, page = 1) {
        return this.request(`/category/${category}?page=${page}`);
    }

    clearCache() {
        this.cache.clear();
    }
}

// Create global API instance

window.akwamAPI = new AkwamAPI();
