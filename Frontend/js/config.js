// Configuration for API URLs
(function() {
    // Set environment configuration based on hostname
    const isProduction = window.location.hostname !== 'localhost' && 
                         !window.location.hostname.includes('127.0.0.1') &&
                         !window.location.hostname.includes('file://');
    
    if (isProduction) {
        // Production environment
        window.ENV_API_URL = 'https://mindspace-9a0l.onrender.com';
        console.log('Running in production mode');
    } else {
        // Development environment
        window.ENV_API_URL = 'http://localhost:5001';
        console.log('Running in development mode');
    }
    
    console.log('API URL configured:', window.ENV_API_URL);
    
    // Set up global configuration object
    window.ENV_CONFIG = {
        // API URLs
        backendApiUrl: window.ENV_API_URL,
        mlServiceUrl: window.ENV_API_URL.replace('5001', '5000') + '/predict_emotion',
        
        // Environment
        environment: import.meta?.env?.VITE_ENVIRONMENT || 'development',
        
        // Feature Flags
        features: {
            aiChat: import.meta?.env?.VITE_ENABLE_AI_CHAT === 'true' || true,
            moodTracking: import.meta?.env?.VITE_ENABLE_MOOD_TRACKING === 'true' || true,
            resources: import.meta?.env?.VITE_ENABLE_RESOURCES === 'true' || true
        },
        
        // App Settings
        app: {
            name: 'MindSpace',
            version: '1.0.0',
            description: 'Student Mental Health Support Platform'
        },
        
        // Chat Configuration
        chat: {
            maxMessageLength: 500,
            typingDelay: 1000,
            autoSave: true,
            historyLimit: 100,
            safetyMode: true
        },
        
        // Mood Tracking
        mood: {
            recentThreshold: 2 * 60 * 60 * 1000, // 2 hours in milliseconds
            reminderInterval: 24 * 60 * 60 * 1000, // 24 hours
            maxHistoryDays: 30
        },
        
        // UI Settings
        ui: {
            theme: 'light',
            animations: true,
            notifications: true,
            autoRefresh: 300000 // 5 minutes
        }
    };
})();

// Development mode helper
window.isDev = () => window.ENV_CONFIG.environment === 'development';

// API helper function
window.getApiUrl = (endpoint = '') => {
    const baseUrl = window.ENV_CONFIG.backendApiUrl;
    return endpoint ? `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}` : baseUrl;
};

// ML Service helper function
window.getMLServiceUrl = (endpoint = '') => {
    const baseUrl = window.ENV_CONFIG.mlServiceUrl;
    return endpoint ? `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}` : baseUrl;
};

// Feature check helper
window.isFeatureEnabled = (feature) => {
    return window.ENV_CONFIG.features[feature] === true;
};

// Console log config in development
if (window.isDev()) {
    console.log('🔧 MindSpace Config:', window.ENV_CONFIG);
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.ENV_CONFIG;
}