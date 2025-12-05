// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const featuredMoviesEl = document.getElementById('featuredMovies');
const latestMoviesEl = document.getElementById('latestMovies');
const latestSeriesEl = document.getElementById('latestSeries');

// Movie card template
function createMovieCard(movie) {
    return `
        <div class="movie-card" data-id="${movie.id}" data-type="${movie.type}">
            <a href="/${movie.type}.html?id=${movie.id}">
                <img src="${movie.poster || 'https://via.placeholder.com/300x450'}" 
                     alt="${movie.title}" 
                     class="movie-poster"
                     onerror="this.src='https://via.placeholder.com/300x450'">
                <div class="movie-info">
                    <h3 class="movie-title">${movie.title}</h3>
                    <div class="movie-meta">
                        <span class="movie-type">${movie.type === 'series' ? 'مسلسل' : 'فيلم'}</span>
                        ${movie.year ? `<span>${movie.year}</span>` : ''}
                    </div>
                </div>
            </a>
        </div>
    `;
}

// Load home content
async function loadHomeContent() {
    try {
        showLoading(featuredMoviesEl);
        showLoading(latestMoviesEl);
        showLoading(latestSeriesEl);

        const homeData = await akwamAPI.getHomeContent();
        
        if (homeData.featured && featuredMoviesEl) {
            featuredMoviesEl.innerHTML = homeData.featured
                .map(createMovieCard)
                .join('');
        }

        if (homeData.latestMovies && latestMoviesEl) {
            latestMoviesEl.innerHTML = homeData.latestMovies
                .map(createMovieCard)
                .join('');
        }

        if (homeData.latestSeries && latestSeriesEl) {
            latestSeriesEl.innerHTML = homeData.latestSeries
                .map(createMovieCard)
                .join('');
        }
    } catch (error) {
        console.error('Failed to load home content:', error);
        showError(featuredMoviesEl, 'فشل تحميل المحتوى');
        showError(latestMoviesEl, 'فشل تحميل المحتوى');
        showError(latestSeriesEl, 'فشل تحميل المحتوى');
    }
}

// Setup search functionality
function setupSearch() {
    if (!searchBtn || !searchInput) return;

    const performSearch = async () => {
        const query = searchInput.value.trim();
        if (!query) return;

        try {
            const results = await akwamAPI.search(query);
            displaySearchResults(results);
        } catch (error) {
            console.error('Search failed:', error);
            alert('فشل البحث، حاول مرة أخرى');
        }
    };

    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
}

// Display search results
function displaySearchResults(results) {
    // Create modal or redirect to search results page
    if (results.results && results.results.length > 0) {
        const searchPage = `/search.html?q=${encodeURIComponent(searchInput.value)}`;
        window.location.href = searchPage;
    } else {
        alert('لم يتم العثور على نتائج');
    }
}

// Show loading spinner
function showLoading(element) {
    if (!element) return;
    element.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>جاري التحميل...</p>
        </div>
    `;
}

// Show error message
function showError(element, message) {
    if (!element) return;
    element.innerHTML = `
        <div class="error-message" style="text-align: center; padding: 40px; color: var(--primary-color);">
            <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 20px;"></i>
            <p>${message}</p>
            <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 20px;">
                <i class="fas fa-redo"></i> إعادة المحاولة
            </button>
        </div>
    `;
}

// Mobile menu toggle
document.addEventListener('DOMContentLoaded', function() {
    const mobileToggle = document.querySelector('.mobile-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', function() {
            navMenu.style.display = navMenu.style.display === 'block' ? 'none' : 'block';
            mobileToggle.innerHTML = navMenu.style.display === 'block' ? 
                '<i class="fas fa-times"></i>' : 
                '<i class="fas fa-bars"></i>';
        });
    }

    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 992) {
            if (navMenu) navMenu.style.display = 'block';
        } else {
            if (navMenu) navMenu.style.display = 'none';
            if (mobileToggle) mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
        }
    });
});

// Initialize tooltips
function initTooltips() {
    const tooltips = document.querySelectorAll('[data-tooltip]');
    tooltips.forEach(element => {
        element.addEventListener('mouseenter', function() {
            const tooltipText = this.getAttribute('data-tooltip');
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = tooltipText;
            document.body.appendChild(tooltip);

            const rect = this.getBoundingClientRect();
            tooltip.style.position = 'fixed';
            tooltip.style.top = (rect.top - tooltip.offsetHeight - 10) + 'px';
            tooltip.style.left = (rect.left + (rect.width - tooltip.offsetWidth) / 2) + 'px';
            tooltip.style.zIndex = '10000';

            this._tooltip = tooltip;
        });

        element.addEventListener('mouseleave', function() {
            if (this._tooltip) {
                this._tooltip.remove();
                this._tooltip = null;
            }
        });
    });
}

// Add CSS for tooltips
const tooltipStyle = document.createElement('style');
tooltipStyle.textContent = `
    .tooltip {
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 5px 10px;
        border-radius: 4px;
        font-size: 12px;
        pointer-events: none;
        white-space: nowrap;
    }
`;
document.head.appendChild(tooltipStyle);

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    initTooltips();
});
