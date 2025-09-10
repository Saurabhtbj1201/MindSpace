document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Resources page initializing...');
    
    // Check if essential DOM elements exist first
    const resourcesGrid = document.getElementById('resources-grid');
    const loadingIndicator = document.getElementById('loading-indicator');
    const noResults = document.getElementById('no-results');
    const typeFilter = document.getElementById('type-filter');
    const moodFilter = document.getElementById('mood-filter');
    const searchFilter = document.getElementById('search-filter');
    const clearFiltersBtn = document.getElementById('clear-filters');
    const resourceModal = document.getElementById('resource-modal');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-content');
    
    if (!resourcesGrid || !loadingIndicator || !noResults || !resourceModal || !modalOverlay || !modalContent) {
        console.error('One or more essential DOM elements are missing. Cannot initialize script.');
        return;
    }
    
    // Resource data structure
    let allResources = [];
    let filteredResources = [];
    
    // Load resources from JSON file
    const loadResources = async () => {
        try {
            showLoading(true);
            const response = await fetch('resource/resources.json');
            if (!response.ok) {
                throw new Error('Failed to load resources');
            }
            const data = await response.json();
            
            // Flatten all resource types into single array
            allResources = [
                ...data.videos,
                ...data.audio,
                ...data.posters,
                ...data.guides,
                ...data.books,
                ...data.quotes
            ];
            
            filteredResources = [...allResources];
            showLoading(false);
            renderResources();
        } catch (error) {
            console.error('Error loading resources:', error);
            showLoading(false);
            showNoResults(true);
        }
    };

    // Helper functions
    const showLoading = (show) => {
        loadingIndicator.style.display = show ? 'block' : 'none';
        resourcesGrid.style.display = show ? 'none' : 'grid';
    };

    const showNoResults = (show) => {
        noResults.style.display = show ? 'block' : 'none';
        resourcesGrid.style.display = show ? 'none' : 'grid';
    };

    const getTypeIcon = (type) => {
        const icons = {
            videos: 'fas fa-play-circle',
            audio: 'fas fa-headphones',
            posters: 'fas fa-image',
            guides: 'fas fa-book-open',
            books: 'fas fa-book',
            quotes: 'fas fa-quote-left'
        };
        return icons[type] || 'fas fa-file';
    };

    const getPlayIcon = (type) => {
        const icons = {
            videos: 'play',
            audio: 'play',
            posters: 'eye',
            guides: 'eye',
            books: 'eye',
            quotes: 'eye'
        };
        return icons[type] || 'eye';
    };

    const getActionText = (type) => {
        const texts = {
            videos: 'Watch',
            audio: 'Listen',
            posters: 'View',
            guides: 'Read',
            books: 'Read',
            quotes: 'View'
        };
        return texts[type] || 'Open';
    };

    const debounce = (func, wait) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    };

    // Main functions

    const createResourceCard = (resource) => {
        const card = document.createElement('div');
        card.className = `resource-card ${resource.type}-card`;
        card.dataset.id = resource.id;

        const typeIcon = getTypeIcon(resource.type);
        const tags = resource.tags.map(tag => `<span class="mood-tag ${tag}">${tag.charAt(0).toUpperCase() + tag.slice(1)}</span>`).join('');

        switch(resource.type) {
            case 'videos':
                card.innerHTML = createVideoCard(resource, typeIcon, tags);
                setupVideoEvents(card, resource);
                break;
            case 'audio':
                card.innerHTML = createAudioCard(resource, typeIcon, tags);
                setupAudioEvents(card, resource);
                break;
            case 'posters':
                card.innerHTML = createPosterCard(resource, typeIcon, tags);
                break;
            case 'guides':
            case 'books':
                card.innerHTML = createPDFCard(resource, typeIcon, tags);
                setupPDFEvents(card, resource);
                break;
            case 'quotes':
                card.innerHTML = createQuotesCard(resource, typeIcon, tags);
                setupQuotesEvents(card, resource);
                break;
        }

        return card;
    };

    const renderResources = () => {
        showLoading(true);
        // Clear grid efficiently
        while (resourcesGrid.firstChild) {
            resourcesGrid.removeChild(resourcesGrid.firstChild);
        }
        
        if (filteredResources.length === 0) {
            showNoResults(true);
            showLoading(false);
            return;
        }
        
        showNoResults(false);
        const fragment = document.createDocumentFragment();
        filteredResources.forEach(resource => {
            fragment.appendChild(createResourceCard(resource));
        });
        resourcesGrid.appendChild(fragment);
        showLoading(false);
    };

    const applyFilters = () => {
        const typeValue = typeFilter.value;
        const moodValue = moodFilter.value;
        const searchValue = searchFilter.value.toLowerCase().trim();
        
        filteredResources = allResources.filter(resource => {
            if (typeValue !== 'all' && resource.type !== typeValue) return false;
            if (moodValue !== 'all' && !resource.tags.includes(moodValue)) return false;
            if (searchValue && !resource.title.toLowerCase().includes(searchValue) && !resource.description.toLowerCase().includes(searchValue)) return false;
            return true;
        });
        
        renderResources();
    };

    const clearFilters = () => {
        typeFilter.value = 'all';
        moodFilter.value = 'all';
        searchFilter.value = '';
        filteredResources = [...allResources];
        renderResources();
    };
    
    // Initial setup
    const initializePage = () => {
        updateUserProfile();
        setupEventListeners();
        setupMoodTrackerButton();
    };
    
    // Update user profile information
    const updateUserProfile = () => {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const headerUsername = document.getElementById('header-username');
        const headerAvatar = document.getElementById('header-avatar');
        
        if (userData && headerUsername && headerAvatar) {
            const firstName = userData.firstName || '';
            const lastName = userData.lastName || '';
            const fullName = `${firstName} ${lastName}`.trim();
            const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
            
            headerUsername.textContent = firstName || 'User';
            headerAvatar.textContent = initials || 'U';
        }
    };
    
    const setupEventListeners = () => {
        if (typeFilter) typeFilter.addEventListener('change', applyFilters);
        if (moodFilter) moodFilter.addEventListener('change', applyFilters);
        if (searchFilter) searchFilter.addEventListener('input', debounce(applyFilters, 300));
        if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', clearFilters);
        
        setupProfileDropdown();
    };

    const setupProfileDropdown = () => {
        const profileTrigger = document.getElementById('profile-trigger');
        const profileDropdown = document.getElementById('profile-dropdown');
        const logoutBtn = document.getElementById('logout-btn');
        
        if (profileTrigger) {
            profileTrigger.addEventListener('click', () => {
                profileDropdown.classList.toggle('active');
            });
        }
        
        document.addEventListener('click', (event) => {
            if (profileTrigger && profileDropdown && !profileTrigger.contains(event.target) && !profileDropdown.contains(event.target)) {
                profileDropdown.classList.remove('active');
            }
        });
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('authToken');
                localStorage.removeItem('userData');
                console.log('Logged out successfully!');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            });
        }
    };
    
    const setupMoodTrackerButton = () => {
        const moodTrackerBtn = document.querySelector('.mood-tracker-btn');
        if (moodTrackerBtn) {
            moodTrackerBtn.addEventListener('click', () => {
                window.location.href = 'mood.html';
            });
        }
    };
    
    // Public function for recommendations
    window.getRecommendedResources = (moodTags) => {
        if (!Array.isArray(moodTags)) {
            moodTags = [moodTags];
        }
        
        return allResources.filter(resource => {
            return resource.tags.some(tag => moodTags.includes(tag));
        }).slice(0, 6);
    };
    
    const createVideoCard = (resource, typeIcon, tags) => {
        return `
            <div class="resource-container video-container">
                <div class="video-wrapper">
                    <video class="resource-video" poster="">
                        <source src="${resource.file}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                    <div class="video-progress"></div>
                    <div class="content-overlay">
                        <h3 class="overlay-title">${resource.title}</h3>
                        <p class="overlay-description">${resource.description}</p>
                        <div class="overlay-tags">${tags}</div>
                    </div>
                    <div class="resource-type-badge">
                        <i class="${typeIcon}"></i> Video
                    </div>
                </div>
            </div>
        `;
    };

    const createAudioCard = (resource, typeIcon, tags) => {
        return `
            <div class="resource-container audio-container">
                <div class="audio-wrapper">
                    <div class="audio-thumbnail" style="background-image: url('${resource.thumbnail}')">
                        <div class="audio-overlay">
                            <div class="audio-wave-container">
                                <div class="audio-wave-bar"></div>
                                <div class="audio-wave-bar"></div>
                                <div class="audio-wave-bar"></div>
                                <div class="audio-wave-bar"></div>
                                <div class="audio-wave-bar"></div>
                            </div>
                        </div>
                    </div>
                    <audio class="resource-audio" preload="metadata">
                        <source src="${resource.file}" type="audio/mpeg">
                        Your browser does not support the audio tag.
                    </audio>
                    <div class="content-overlay">
                        <h3 class="overlay-title">${resource.title}</h3>
                        <p class="overlay-description">${resource.description}</p>
                        <div class="overlay-tags">${tags}</div>
                    </div>
                    <div class="resource-type-badge">
                        <i class="${typeIcon}"></i> Audio
                    </div>
                </div>
            </div>
        `;
    };

    const createPosterCard = (resource, typeIcon, tags) => {
        return `
            <div class="resource-container poster-container">
                <div class="poster-wrapper">
                    <img src="${resource.file}" alt="${resource.title}" class="poster-image">
                    <div class="content-overlay">
                        <h3 class="overlay-title">${resource.title}</h3>
                        <p class="overlay-description">${resource.description}</p>
                        <div class="overlay-tags">${tags}</div>
                    </div>
                    <div class="resource-type-badge">
                        <i class="${typeIcon}"></i> Poster
                    </div>
                </div>
            </div>
        `;
    };

    const createPDFCard = (resource, typeIcon, tags) => {
        return `
            <div class="resource-container pdf-container">
                <div class="pdf-wrapper">
                    <iframe class="pdf-viewer" src="${resource.file}#toolbar=0&navpanes=0&scrollbar=0" frameborder="0"></iframe>
                    <div class="content-overlay">
                        <h3 class="overlay-title">${resource.title}</h3>
                        <p class="overlay-description">${resource.description}</p>
                        <div class="overlay-tags">${tags}</div>
                    </div>
                    <div class="resource-type-badge">
                        <i class="${typeIcon}"></i> ${resource.type === 'guides' ? 'Guide' : 'Book'}
                    </div>
                </div>
            </div>
        `;
    };

    const createQuotesCard = (resource, typeIcon, tags) => {
        const quotes = resource.quotes || [];
        return `
            <div class="resource-container quotes-container">
                <div class="quotes-wrapper">
                    <div class="quotes-display">
                        ${quotes.map((quote, index) => `
                            <div class="quote-item ${index === 0 ? 'active' : ''}" data-index="${index}">
                                <div class="quote-content">
                                    <i class="fas fa-quote-left quote-icon"></i>
                                    <p class="quote-text">${quote}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="quotes-dots">
                        ${quotes.map((_, index) => `
                            <div class="quote-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></div>
                        `).join('')}
                    </div>
                    <div class="resource-type-badge">
                        <i class="${typeIcon}"></i> Quotes
                    </div>
                </div>
            </div>
        `;
    };

    const setupVideoEvents = (card, resource) => {
        const video = card.querySelector('.resource-video');
        const container = card.querySelector('.video-container');
        const progressBar = card.querySelector('.video-progress');
        
        if (video && container && progressBar) {
            let canAutoplay = false;
            
            // Try to enable autoplay after user interaction
            document.addEventListener('click', function enableAutoplay() {
                canAutoplay = true;
                document.removeEventListener('click', enableAutoplay);
            }, { once: true });
            
            // Update progress bar
            video.addEventListener('timeupdate', () => {
                if (video.duration) {
                    const progress = (video.currentTime / video.duration) * 100;
                    progressBar.style.width = `${progress}%`;
                }
            });
            
            container.addEventListener('mouseenter', () => {
                if (canAutoplay) {
                    const playPromise = video.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(e => {
                            // Silently fail if autoplay is blocked
                            console.log('Video autoplay blocked by browser policy');
                        });
                    }
                }
            });
            
            container.addEventListener('mouseleave', () => {
                if (!video.paused) {
                    video.pause();
                    video.currentTime = 0;
                }
                progressBar.style.width = '0%';
            });
        }
    };

    const setupAudioEvents = (card, resource) => {
        const audio = card.querySelector('.resource-audio');
        const container = card.querySelector('.audio-container');
        const waveBars = card.querySelectorAll('.audio-wave-bar');
        
        if (audio && container) {
            let canAutoplay = false;
            
            // Try to enable autoplay after user interaction
            document.addEventListener('click', function enableAutoplay() {
                canAutoplay = true;
                document.removeEventListener('click', enableAutoplay);
            }, { once: true });
            
            container.addEventListener('mouseenter', () => {
                // Always show wave animation on hover
                waveBars.forEach(bar => bar.classList.add('animated'));
                
                if (canAutoplay) {
                    const playPromise = audio.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(e => {
                            // Silently fail if autoplay is blocked
                            console.log('Audio autoplay blocked by browser policy');
                        });
                    }
                }
            });
            
            container.addEventListener('mouseleave', () => {
                if (!audio.paused) {
                    audio.pause();
                    audio.currentTime = 0;
                }
                waveBars.forEach(bar => bar.classList.remove('animated'));
            });
        }
    };

    const setupPDFEvents = (card, resource) => {
        const iframe = card.querySelector('.pdf-viewer');
        const container = card.querySelector('.pdf-container');
        
        if (iframe && container) {
            let pageInterval;
            let currentPage = 1;
            
            container.addEventListener('mouseenter', () => {
                pageInterval = setInterval(() => {
                    currentPage = currentPage === 1 ? 2 : 1;
                    iframe.src = `${resource.file}#page=${currentPage}&toolbar=0&navpanes=0&scrollbar=0`;
                }, 3000);
            });
            
            container.addEventListener('mouseleave', () => {
                clearInterval(pageInterval);
                currentPage = 1;
                iframe.src = `${resource.file}#page=1&toolbar=0&navpanes=0&scrollbar=0`;
            });
        }
    };

    const setupQuotesEvents = (card, resource) => {
        const quotes = card.querySelectorAll('.quote-item');
        const dots = card.querySelectorAll('.quote-dot');
        
        if (quotes.length > 1) {
            let currentIndex = 0;
            let quoteInterval;
            
            // Auto-slide functionality
            const startSlideshow = () => {
                quoteInterval = setInterval(() => {
                    quotes[currentIndex].classList.remove('active');
                    dots[currentIndex].classList.remove('active');
                    currentIndex = (currentIndex + 1) % quotes.length;
                    quotes[currentIndex].classList.add('active');
                    dots[currentIndex].classList.add('active');
                }, 2500);
            };
            
            // Reset to first quote
            const resetToFirst = () => {
                quotes.forEach(quote => quote.classList.remove('active'));
                dots.forEach(dot => dot.classList.remove('active'));
                currentIndex = 0;
                quotes[0].classList.add('active');
                dots[0].classList.add('active');
            };
            
            // Start slideshow on hover
            card.addEventListener('mouseenter', () => {
                startSlideshow();
            });
            
            // Stop on mouse leave and reset
            card.addEventListener('mouseleave', () => {
                clearInterval(quoteInterval);
                resetToFirst();
            });
        }
    };

    // Initialize page and then load resources
    initializePage();
    loadResources();
});
