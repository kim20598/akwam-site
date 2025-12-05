// Video Player Controller
class VideoPlayer {
    constructor() {
        this.player = null;
        this.currentSource = null;
        this.currentQuality = 'auto';
        this.episodes = [];
        this.currentEpisodeIndex = 0;
        this.watchedEpisodes = new Set();
        this.qualitySources = {};
        
        // Initialize Plyr player
        this.initPlayer();
        this.bindEvents();
    }
    
    initPlayer() {
        // Default Plyr configuration
        const defaultOptions = {
            controls: [
                'play', 
                'progress', 
                'current-time', 
                'duration', 
                'mute', 
                'volume',
                'settings',
                'pip',
                'airplay',
                'fullscreen'
            ],
            settings: ['quality', 'speed'],
            speed: {
                selected: 1,
                options: [0.5, 0.75, 1, 1.25, 1.5, 2]
            },
            tooltips: {
                controls: true,
                seek: true
            },
            keyboard: {
                focused: true,
                global: true
            },
            storage: {
                enabled: true,
                key: 'akwam-player'
            }
        };
        
        this.player = new Plyr('#player', defaultOptions);
        
        // Add quality selector callback
        this.player.on('qualitychange', (event) => {
            this.onQualityChange(event.detail.quality);
        });
        
        // Add ended callback for auto-play next episode
        this.player.on('ended', () => {
            this.onVideoEnded();
        });
        
        // Add time update callback for tracking watched progress
        this.player.on('timeupdate', () => {
            this.trackWatchingProgress();
        });
    }
    
    bindEvents() {
        // Quality button clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('quality-btn')) {
                this.changeQuality(e.target.dataset.quality);
            }
            
            if (e.target.classList.contains('episode-btn')) {
                this.loadEpisode(e.target.dataset.episodeId);
            }
            
            if (e.target.classList.contains('speed-btn')) {
                this.changePlaybackSpeed(parseFloat(e.target.dataset.speed));
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (document.activeElement.tagName === 'INPUT') return;
            
            switch(e.key.toLowerCase()) {
                case ' ':
                case 'k':
                    e.preventDefault();
                    this.player.togglePlay();
                    break;
                case 'f':
                    e.preventDefault();
                    this.player.fullscreen.toggle();
                    break;
                case 'm':
                    e.preventDefault();
                    this.player.muted = !this.player.muted;
                    break;
                case 'arrowright':
                    e.preventDefault();
                    this.player.forward(10);
                    break;
                case 'arrowleft':
                    e.preventDefault();
                    this.player.rewind(10);
                    break;
                case 'arrowup':
                    e.preventDefault();
                    this.player.increaseVolume(0.1);
                    break;
                case 'arrowdown':
                    e.preventDefault();
                    this.player.decreaseVolume(0.1);
                    break;
                case 'n':
                    e.preventDefault();
                    this.playNextEpisode();
                    break;
                case 'p':
                    e.preventDefault();
                    this.playPreviousEpisode();
                    break;
            }
        });
    }
    
    async loadVideoContent(contentId, contentType = 'movie') {
        try {
            this.showLoading();
            
            let contentData;
            if (contentType === 'series' || contentType === 'show') {
                contentData = await akwamAPI.getSeriesDetails(contentId);
                if (contentData && contentData.episodes) {
                    this.episodes = contentData.episodes;
                    this.renderEpisodes();
                }
            } else {
                contentData = await akwamAPI.getMovieDetails(contentId);
            }
            
            if (contentData) {
                this.updateVideoInfo(contentData);
                await this.loadVideoSources(contentId);
            }
        } catch (error) {
            console.error('Failed to load video content:', error);
            this.showError('فشل تحميل الفيديو');
        }
    }
    
    async loadVideoSources(contentId) {
        try {
            const sources = await akwamAPI.getVideoSources(contentId);
            
            if (!sources || sources.length === 0) {
                throw new Error('No video sources found');
            }
            
            // Group sources by quality
            this.qualitySources = this.groupSourcesByQuality(sources);
            
            // Set default source (highest quality)
            const defaultQuality = this.getDefaultQuality();
            this.changeQuality(defaultQuality);
            
            this.hideLoading();
        } catch (error) {
            console.error('Failed to load video sources:', error);
            this.showError('فشل تحميل مصادر الفيديو');
        }
    }
    
    groupSourcesByQuality(sources) {
        const grouped = {};
        
        sources.forEach(source => {
            const quality = source.quality || 'SD';
            if (!grouped[quality]) {
                grouped[quality] = [];
            }
            grouped[quality].push(source);
        });
        
        // Sort qualities from highest to lowest
        const qualityOrder = ['4K', '2160p', 'FHD', '1080p', 'HD', '720p', 'SD', '480p', '360p'];
        const sorted = {};
        
        qualityOrder.forEach(quality => {
            if (grouped[quality]) {
                sorted[quality] = grouped[quality];
            }
        });
        
        // Add any remaining qualities
        Object.keys(grouped).forEach(quality => {
            if (!sorted[quality]) {
                sorted[quality] = grouped[quality];
            }
        });
        
        return sorted;
    }
    
    getDefaultQuality() {
        const availableQualities = Object.keys(this.qualitySources);
        
        // Try to get user's preferred quality from localStorage
        const savedQuality = localStorage.getItem('preferred-quality');
        if (savedQuality && availableQualities.includes(savedQuality)) {
            return savedQuality;
        }
        
        // Auto-detect based on network speed
        if (this.estimateNetworkSpeed() > 5) { // Mbps
            return availableQualities[0] || 'auto';
        } else {
            return 'SD' in availableQualities ? 'SD' : availableQualities[availableQualities.length - 1] || 'auto';
        }
    }
    
    estimateNetworkSpeed() {
        // Simple network speed estimation
        if (navigator.connection) {
            const connection = navigator.connection;
            if (connection.downlink) {
                return connection.downlink;
            }
        }
        return 10; // Default to 10 Mbps
    }
    
    changeQuality(quality) {
        if (!this.qualitySources[quality] || quality === this.currentQuality) {
            return;
        }
        
        this.currentQuality = quality;
        
        // Save preference
        localStorage.setItem('preferred-quality', quality);
        
        // Update active button
        document.querySelectorAll('.quality-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.quality === quality) {
                btn.classList.add('active');
            }
        });
        
        // Update Plyr quality
        const source = this.qualitySources[quality][0];
        this.loadSource(source.url, quality);
    }
    
    loadSource(url, quality) {
        this.currentSource = url;
        
        // Update video source
        const video = document.querySelector('#player');
        video.src = url;
        
        // Add source element for Plyr
        const source = document.createElement('source');
        source.src = url;
        source.type = 'video/mp4';
        source.size = quality;
        
        // Clear previous sources
        while (video.firstChild) {
            video.removeChild(video.firstChild);
        }
        
        video.appendChild(source);
        
        // Reload Plyr player
        this.player.source = {
            type: 'video',
            sources: [{
                src: url,
                type: 'video/mp4',
                size: quality
            }]
        };
    }
    
    updateVideoInfo(data) {
        // Update title
        const titleElement = document.getElementById('videoTitle');
        if (titleElement && data.title) {
            titleElement.textContent = data.title;
        }
        
        // Update year
        const yearElement = document.getElementById('videoYear');
        if (yearElement && data.year) {
            yearElement.innerHTML = `<i class="fas fa-calendar"></i> ${data.year}`;
        }
        
        // Update description
        const descElement = document.getElementById('videoDescription');
        if (descElement && data.description) {
            descElement.textContent = data.description;
        }
        
        // Update document title
        document.title = `${data.title} - أكوام`;
    }
    
    renderEpisodes() {
        const episodesGrid = document.getElementById('episodesGrid');
        const episodeSelector = document.getElementById('episodeSelector');
        
        if (!episodesGrid || !this.episodes.length) {
            return;
        }
        
        episodeSelector.style.display = 'block';
        
        episodesGrid.innerHTML = this.episodes.map((episode, index) => {
            const isWatched = this.watchedEpisodes.has(episode.id);
            const isCurrent = index === this.currentEpisodeIndex;
            
            return `
                <button class="episode-btn ${isCurrent ? 'active' : ''} ${isWatched ? 'watched' : ''}"
                        data-episode-id="${episode.id}"
                        title="${episode.title}">
                    ${episode.episode_number || index + 1}
                </button>
            `;
        }).join('');
    }
    
    async loadEpisode(episodeId) {
        const episodeIndex = this.episodes.findIndex(ep => ep.id === episodeId);
        
        if (episodeIndex === -1) {
            console.error('Episode not found:', episodeId);
            return;
        }
        
        this.currentEpisodeIndex = episodeIndex;
        const episode = this.episodes[episodeIndex];
        
        // Update UI
        document.querySelectorAll('.episode-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.episodeId === episodeId) {
                btn.classList.add('active');
            }
        });
        
        // Update video info
        this.updateVideoInfo(episode);
        
        // Load video sources for this episode
        await this.loadVideoSources(episodeId);
        
        // Mark as watching
        this.watchedEpisodes.add(episodeId);
        
        // Save to history
        this.saveToHistory(episode);
    }
    
    playNextEpisode() {
        if (this.currentEpisodeIndex < this.episodes.length - 1) {
            const nextEpisode = this.episodes[this.currentEpisodeIndex + 1];
            this.loadEpisode(nextEpisode.id);
        }
    }
    
    playPreviousEpisode() {
        if (this.currentEpisodeIndex > 0) {
            const prevEpisode = this.episodes[this.currentEpisodeIndex - 1];
            this.loadEpisode(prevEpisode.id);
        }
    }
    
    onVideoEnded() {
        // Auto-play next episode for series
        if (this.episodes.length > 0) {
            this.playNextEpisode();
        }
    }
    
    trackWatchingProgress() {
        if (!this.player || !this.player.playing) return;
        
        const currentTime = this.player.currentTime;
        const duration = this.player.duration;
        
        if (duration > 0) {
            const progress = (currentTime / duration) * 100;
            
            // Mark as watched if 90% completed
            if (progress >= 90 && this.episodes.length > 0) {
                const currentEpisode = this.episodes[this.currentEpisodeIndex];
                if (currentEpisode) {
                    this.watchedEpisodes.add(currentEpisode.id);
                    this.updateEpisodeUI(currentEpisode.id);
                }
            }
            
            // Save progress to localStorage
            this.saveProgress(currentTime);
        }
    }
    
    saveProgress(currentTime) {
        if (!this.currentSource) return;
        
        const progress = {
            url: this.currentSource,
            time: currentTime,
            timestamp: Date.now()
        };
        
        localStorage.setItem(`progress_${this.currentSource}`, JSON.stringify(progress));
    }
    
    loadProgress() {
        if (!this.currentSource) return 0;
        
        const progressData = localStorage.getItem(`progress_${this.currentSource}`);
        if (progressData) {
            try {
                const progress = JSON.parse(progressData);
                
                // Only resume if progress was saved less than 7 days ago
                if (Date.now() - progress.timestamp < 7 * 24 * 60 * 60 * 1000) {
                    return progress.time;
                }
            } catch (e) {
                console.error('Failed to parse progress data:', e);
            }
        }
        
        return 0;
    }
    
    saveToHistory(episode) {
        const history = this.getHistory();
        
        // Add to history
        history.unshift({
            id: episode.id,
            title: episode.title,
            type: 'episode',
            timestamp: Date.now(),
            thumbnail: episode.thumbnail_url
        });
        
        // Keep only last 50 items
        const limitedHistory = history.slice(0, 50);
        
        localStorage.setItem('watch-history', JSON.stringify(limitedHistory));
    }
    
    getHistory() {
        try {
            return JSON.parse(localStorage.getItem('watch-history')) || [];
        } catch (e) {
            return [];
        }
    }
    
    changePlaybackSpeed(speed) {
        this.player.speed = speed;
        
        // Update UI
        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.classList.remove('active');
            if (parseFloat(btn.dataset.speed) === speed) {
                btn.classList.add('active');
            }
        });
    }
    
    onQualityChange(quality) {
        if (quality !== this.currentQuality) {
            this.changeQuality(quality);
        }
    }
    
    updateEpisodeUI(episodeId) {
        const episodeBtn = document.querySelector(`.episode-btn[data-episode-id="${episodeId}"]`);
        if (episodeBtn) {
            episodeBtn.classList.add('watched');
        }
    }
    
    showLoading() {
        const videoContainer = document.querySelector('.video-container');
        if (videoContainer) {
            videoContainer.innerHTML = `
                <div class="player-loading">
                    <div class="spinner"></div>
                    <p>جاري تحميل الفيديو...</p>
                </div>
            `;
        }
    }
    
    hideLoading() {
        const videoContainer = document.querySelector('.video-container');
        if (videoContainer) {
            // Loading state will be removed when Plyr loads
        }
    }
    
    showError(message) {
        const videoContainer = document.querySelector('.video-container');
        if (videoContainer) {
            videoContainer.innerHTML = `
                <div class="player-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>حدث خطأ</h3>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="btn btn-primary">
                        <i class="fas fa-redo"></i> إعادة المحاولة
                    </button>
                </div>
            `;
        }
    }
}

// Initialize player when page loads
let videoPlayer;

function loadVideoContent(contentId, type) {
    if (!videoPlayer) {
        videoPlayer = new VideoPlayer();
    }
    videoPlayer.loadVideoContent(contentId, type);
}

// Keyboard shortcuts help
function showKeyboardShortcuts() {
    const shortcuts = [
        { key: 'Space/K', action: 'تشغيل/إيقاف مؤقت' },
        { key: 'F', action: 'ملء الشاشة' },
        { key: 'M', action: 'كتم/إلغاء كتم الصوت' },
        { key: '→', action: 'تقديم 10 ثواني' },
        { key: '←', action: 'رجوع 10 ثواني' },
        { key: '↑', action: 'زيادة الصوت' },
        { key: '↓', action: 'خفض الصوت' },
        { key: 'N', action: 'الحلقة التالية' },
        { key: 'P', action: 'الحلقة السابقة' }
    ];
    
    let message = 'اختصارات لوحة المفاتيح:\n\n';
    shortcuts.forEach(shortcut => {
        message += `${shortcut.key}: ${shortcut.action}\n`;
    });
    
    alert(message);
}

// Add keyboard shortcuts help button
document.addEventListener('DOMContentLoaded', function() {
    const helpBtn = document.createElement('button');
    helpBtn.className = 'btn btn-secondary';
    helpBtn.innerHTML = '<i class="fas fa-keyboard"></i> اختصارات';
    helpBtn.style.position = 'fixed';
    helpBtn.style.bottom = '20px';
    helpBtn.style.left = '20px';
    helpBtn.style.zIndex = '1000';
    helpBtn.onclick = showKeyboardShortcuts;
    
    document.body.appendChild(helpBtn);
});
