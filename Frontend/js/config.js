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
        mlServiceUrl: window.ENV_API_URL.replace('5001', '5000') + '/predict_emotion'
    };
})();
