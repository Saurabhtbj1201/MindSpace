document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        window.location.href = 'index.html';
        return;
    }
    
    // Get user data from localStorage
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    
    // Update profile information
    updateProfileInfo(userData);
    
    // Set up authentication header for API requests
    const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
    };
    
    // API Configuration
    const apiConfig = window.ENV_CONFIG || {
        backendApiUrl: 'http://localhost:5001',
        mlServiceUrl: 'http://localhost:5000/predict_emotion'
    };
    
    // DOM Elements
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const charCount = document.getElementById('char-count');
    const typingIndicator = document.getElementById('typing-indicator');
    const aiStatus = document.getElementById('ai-status');
    const moodStatusMessage = document.getElementById('mood-status-message');
    const quickActionButtons = document.querySelectorAll('.quick-action-btn');
    const clearChatBtn = document.getElementById('clear-chat-btn');
    const toggleChatBtn = document.getElementById('toggle-chat-btn');
    const welcomeTime = document.getElementById('welcome-time');
    const voiceInputBtn = document.getElementById('voice-input-btn');
    const toggleSpeechBtn = document.getElementById('toggle-speech-btn');
    
    // Variables
    let currentMood = null;
    let conversationHistory = [];
    let isTyping = false;
    let resourcesData = null;
    let isSpeechEnabled = true; // Enable by default
    let recognition;
    let isListening = false;
    let autoSendTimer = null;
    
    // Initialize the page
    initializePage();
    
    // Set welcome message time
    if (welcomeTime) {
        welcomeTime.textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
    
    // Function to initialize the page
    async function initializePage() {
        // Check and update mood status
        await checkMoodStatus();
        
        // Set up event listeners
        setupEventListeners();
        
        // Load conversation history from localStorage
        loadConversationHistory();
        
        // Auto-resize textarea
        autoResizeTextarea();
        
        // Load resources
        await loadResources();
        
        // Setup resource tabs
        setupResourceTabs();

        // Setup speech features
        setupSpeechFeatures();
    }
    
    // Function to update profile information
    function updateProfileInfo(userData) {
        if (userData) {
            const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
            const initials = ((userData.firstName || '').charAt(0) + (userData.lastName || '').charAt(0)).toUpperCase();
            
            // Update header profile dropdown
            document.getElementById('header-username').textContent = userData.firstName || 'User';
            document.getElementById('header-avatar').textContent = initials || 'U';
            
            // Set up dropdown toggle
            setupProfileDropdown();
            
            // Handle logout
            document.getElementById('logout-btn').addEventListener('click', function(e) {
                e.preventDefault();
                localStorage.removeItem('authToken');
                localStorage.removeItem('userData');
                localStorage.removeItem('ai_conversation_history');
                showSuccess('Logged out successfully!');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            });
        }
    }
    
    // Function to check mood status
    async function checkMoodStatus() {
        try {
            const apiUrl = `${apiConfig.backendApiUrl}/api/mood/recent`;
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers
            });
            
            const data = await response.json();
            
            const moodStatusPill = document.getElementById('mood-status-pill');
            const aiStatus = document.getElementById('ai-status');
            
            if (data.success && data.isRecent) {
                // User has recent mood
                currentMood = data.data;
                
                // Update only the mood status pill
                if (aiStatus) {
                    aiStatus.textContent = `Ready to help with your ${data.data.label.toLowerCase()} mood`;
                }
                
                // Update pill styling based on mood
                if (moodStatusPill) {
                    moodStatusPill.classList.remove('warning', 'error');
                    
                    // Add appropriate styling based on mood
                    const moodLabel = data.data.label.toLowerCase();
                    if (['sad', 'angry', 'fear'].includes(moodLabel)) {
                        moodStatusPill.classList.add('warning');
                    } else if (['disgust'].includes(moodLabel)) {
                        moodStatusPill.classList.add('error');
                    }
                }
            } else {
                // No recent mood
                if (aiStatus) {
                    aiStatus.textContent = 'Please track your mood for better assistance';
                }
                
                if (moodStatusPill) {
                    moodStatusPill.classList.remove('warning', 'error');
                    moodStatusPill.classList.add('warning');
                }
                
                // Show mood tracking prompt
                setTimeout(() => {
                    if (confirm('For better personalized support, would you like to track your mood first?')) {
                        window.location.href = 'mood.html';
                    }
                }, 2000);
            }
        } catch (error) {
            console.error('Error checking mood status:', error);
            
            const aiStatus = document.getElementById('ai-status');
            const moodStatusPill = document.getElementById('mood-status-pill');
            
            if (aiStatus) {
                aiStatus.textContent = 'Unable to check mood status';
            }
            
            if (moodStatusPill) {
                moodStatusPill.classList.remove('warning');
                moodStatusPill.classList.add('error');
            }
        }
    }
    
    // Function to set up event listeners
    function setupEventListeners() {
        // Chat input events
        chatInput.addEventListener('input', function() {
            updateCharCount();
            updateSendButton();
            autoResizeTextarea();
        });
        
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        // Send button click
        sendBtn.addEventListener('click', sendMessage);
        
        // Quick action buttons
        quickActionButtons.forEach(button => {
            button.addEventListener('click', function() {
                const message = this.getAttribute('data-message');
                chatInput.value = message;
                updateCharCount();
                updateSendButton();
                sendMessage();
            });
        });
        
        // Clear chat button - Fixed
        if (clearChatBtn) {
            clearChatBtn.addEventListener('click', clearChat);
        }
        
        // Toggle chat button - Fixed
        if (toggleChatBtn) {
            toggleChatBtn.addEventListener('click', toggleChat);
        }
    }
    
    // Function to set up speech recognition and synthesis
    function setupSpeechFeatures() {
        // Check for Speech Recognition support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const speechSynthesis = window.speechSynthesis;

        // Setup Text-to-Speech Toggle - Enable by default
        if (toggleSpeechBtn && speechSynthesis) {
            // Set initial state to enabled
            isSpeechEnabled = true;
            toggleSpeechBtn.classList.add('active');
            
            // Update button icon to show it's enabled
            const icon = toggleSpeechBtn.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-volume-up';
            }
            
            toggleSpeechBtn.addEventListener('click', () => {
                isSpeechEnabled = !isSpeechEnabled;
                toggleSpeechBtn.classList.toggle('active', isSpeechEnabled);
                
                if (!isSpeechEnabled) {
                    speechSynthesis.cancel(); // Stop any ongoing speech
                    showInfo('Text-to-speech disabled');
                } else {
                    showInfo('Text-to-speech enabled - AI responses will be read aloud');
                }
                
                // Update button icon
                const icon = toggleSpeechBtn.querySelector('i');
                if (icon) {
                    icon.className = isSpeechEnabled ? 'fas fa-volume-up' : 'fas fa-volume-mute';
                }
            });
            
            // Show initial status
            showInfo('Text-to-speech enabled by default');
        }

        // Setup Voice Input - Don't test permission on load
        if (SpeechRecognition && voiceInputBtn) {
            recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.lang = 'en-US';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;

            voiceInputBtn.addEventListener('click', () => {
                if (isListening) {
                    stopListening();
                } else {
                    requestMicrophoneAndStartListening();
                }
            });

            recognition.onstart = () => {
                isListening = true;
                voiceInputBtn.classList.add('listening');
                voiceInputBtn.title = 'Stop listening';
                showInfo('Listening... Speak now');
                
                // Clear any existing auto-send timer
                if (autoSendTimer) {
                    clearTimeout(autoSendTimer);
                    autoSendTimer = null;
                }
                
                // Update AI status
                const aiStatus = document.getElementById('ai-status');
                if (aiStatus) {
                    aiStatus.textContent = 'Listening for your voice...';
                }
            };

            recognition.onend = () => {
                isListening = false;
                voiceInputBtn.classList.remove('listening');
                voiceInputBtn.title = 'Use voice input';
                
                // Restore AI status
                const aiStatus = document.getElementById('ai-status');
                if (aiStatus) {
                    if (currentMood) {
                        aiStatus.textContent = `Ready to help with your ${currentMood.label.toLowerCase()} mood`;
                    } else {
                        aiStatus.textContent = 'Ready to help you';
                    }
                }
                
                // Start auto-send timer if there's text in the input
                if (chatInput.value.trim().length > 0) {
                    startAutoSendTimer();
                }
            };

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                const confidence = event.results[0][0].confidence;
                
                // Add transcript to input field
                if (chatInput.value.trim()) {
                    chatInput.value += ' ' + transcript;
                } else {
                    chatInput.value = transcript;
                }
                
                updateCharCount();
                updateSendButton();
                autoResizeTextarea();
                
                showSuccess(`Voice captured: "${transcript}" (${Math.round(confidence * 100)}% confidence)`);
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                isListening = false;
                voiceInputBtn.classList.remove('listening');
                
                let errorMessage = 'Speech recognition error occurred.';
                
                switch (event.error) {
                    case 'not-allowed':
                    case 'service-not-allowed':
                        errorMessage = 'Microphone access denied. Please allow microphone access and try again.';
                        showMicrophonePermissionDialog();
                        break;
                    case 'no-speech':
                        errorMessage = 'No speech detected. Please speak clearly and try again.';
                        break;
                    case 'audio-capture':
                        errorMessage = 'No microphone found. Please check your microphone connection.';
                        break;
                    case 'network':
                        errorMessage = 'Network error occurred during speech recognition.';
                        break;
                    case 'aborted':
                        errorMessage = 'Speech recognition was aborted.';
                        break;
                    default:
                        errorMessage = `Speech recognition error: ${event.error}`;
                }
                
                showError(errorMessage);
            };

            // Don't test microphone permission on page load
        } else {
            // Hide voice input button if not supported
            if (voiceInputBtn) {
                voiceInputBtn.style.display = 'none';
                console.warn('Speech Recognition not supported in this browser.');
            }
        }

        // Hide speech toggle if not supported
        if (!speechSynthesis && toggleSpeechBtn) {
            toggleSpeechBtn.style.display = 'none';
            console.warn('Speech Synthesis not supported in this browser.');
        }
    }

    // Function to request microphone permission and start listening
    async function requestMicrophoneAndStartListening() {
        try {
            // Request microphone permission
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Permission granted, stop the stream and start speech recognition
            stream.getTracks().forEach(track => track.stop());
            
            // Update button appearance to show permission granted
            voiceInputBtn.style.opacity = '1';
            voiceInputBtn.title = 'Use voice input';
            
            // Start listening
            startListening();
            
        } catch (error) {
            console.error('Microphone permission denied:', error);
            showMicrophonePermissionDialog();
            
            // Update button to show permission needed
            voiceInputBtn.style.opacity = '0.5';
            voiceInputBtn.title = 'Microphone access required - click to grant permission';
        }
    }

    // Function to start auto-send timer
    function startAutoSendTimer() {
        // Clear any existing timer
        if (autoSendTimer) {
            clearTimeout(autoSendTimer);
        }
        
        // Show countdown
        showInfo('Message will auto-send in 3 seconds... Click send to send now');
        
        // Set 3-second timer
        autoSendTimer = setTimeout(() => {
            if (chatInput.value.trim().length > 0) {
                showInfo('Auto-sending message...');
                sendMessage();
            }
            autoSendTimer = null;
        }, 2000);
    }

    // Function to cancel auto-send timer
    function cancelAutoSendTimer() {
        if (autoSendTimer) {
            clearTimeout(autoSendTimer);
            autoSendTimer = null;
        }
    }

    // Function to start listening
    function startListening() {
        if (!recognition) {
            showError('Speech recognition not available');
            return;
        }

        try {
            recognition.start();
        } catch (error) {
            console.error('Error starting recognition:', error);
            showError('Failed to start voice recognition. Please try again.');
        }
    }

    // Function to stop listening
    function stopListening() {
        if (recognition && isListening) {
            recognition.stop();
        }
        
        // Cancel auto-send timer when manually stopping
        cancelAutoSendTimer();
    }

    // Remove the testMicrophonePermission function call and update the dialog
    // Function to show microphone permission dialog
    function showMicrophonePermissionDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'permission-dialog';
        dialog.innerHTML = `
            <div class="permission-dialog-content">
                <div class="permission-dialog-header">
                    <i class="fas fa-microphone-slash"></i>
                    <h3>Microphone Access Required</h3>
                </div>
                <div class="permission-dialog-body">
                    <p>To use voice input, please allow microphone access:</p>
                    <ol>
                        <li>Click "Allow" when your browser asks for microphone permission</li>
                        <li>Or click the microphone icon in your browser's address bar</li>
                        <li>Select "Allow" for microphone access</li>
                        <li>Try the voice input button again</li>
                    </ol>
                    <p><strong>Your voice data is processed locally and not stored.</strong></p>
                </div>
                <div class="permission-dialog-actions">
                    <button class="permission-btn primary" onclick="this.closest('.permission-dialog').remove()">
                        Got it
                    </button>
                    <button class="permission-btn secondary" onclick="window.location.reload()">
                        Refresh Page
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Auto-remove after 15 seconds
        setTimeout(() => {
            if (dialog.parentNode) {
                dialog.remove();
            }
        }, 15000);
    }
    
    // Function to update character count
    function updateCharCount() {
        const count = chatInput.value.length;
        charCount.textContent = `${count}/500`;
        
        if (count > 450) {
            charCount.style.color = '#ef4444';
        } else if (count > 350) {
            charCount.style.color = '#f59e0b';
        } else {
            charCount.style.color = '#9ca3af';
        }
    }
    
    // Function to update send button state
    function updateSendButton() {
        const hasText = chatInput.value.trim().length > 0;
        sendBtn.disabled = !hasText || isTyping;
    }
    
    // Function to auto-resize textarea
    function autoResizeTextarea() {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    }
    
    // Function to send message
    async function sendMessage() {
        const message = chatInput.value.trim();
        if (!message || isTyping) return;
        
        // Cancel auto-send timer since we're manually sending
        cancelAutoSendTimer();
        
        // Add user message to chat
        addMessage(message, 'user');
        
        // Clear input
        chatInput.value = '';
        updateCharCount();
        updateSendButton();
        autoResizeTextarea();
        
        // Show typing indicator
        showTypingIndicator();
        
        // Check for emergency keywords
        if (checkEmergencyKeywords(message)) {
            hideTypingIndicator();
            addEmergencyResponse();
            return;
        }
        
        // Generate AI response
        try {
            console.log('Generating AI response for message:', message);
            const response = await generateAIResponse(message);
            hideTypingIndicator();
            addMessage(response, 'ai');
            
            // Load recommendations if mood is available
            if (currentMood) {
                await loadRecommendations(currentMood.label);
            }
        } catch (error) {
            hideTypingIndicator();
            console.error('Error in sendMessage:', error);
            addMessage('I apologize, but I\'m having trouble responding right now. Please try again in a moment, or contact our support team if the issue persists.', 'ai');
        }
    }
    
    // Function to add message to chat with improved formatting
    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const timestamp = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        // Format AI responses for better readability
        let formattedText = text;
        if (sender === 'ai') {
            formattedText = formatAIResponse(text);
            // Speak the AI response if TTS is enabled (now enabled by default)
            if (isSpeechEnabled && window.speechSynthesis) {
                speakText(text);
            }
        } else {
            // Escape HTML for user messages
            formattedText = escapeHtml(text);
        }
        
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas ${sender === 'user' ? 'fa-user' : 'fa-robot'}"></i>
            </div>
            <div class="message-content">
                <div class="message-text">${formattedText}</div>
                <div class="message-time">${timestamp}</div>
            </div>
        `;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Save to conversation history
        conversationHistory.push({
            text: text, // Store original text
            sender,
            timestamp: new Date().toISOString()
        });
        
        // Save to localStorage
        saveConversationHistory();
    }
    
    // Function to speak text using SpeechSynthesis
    function speakText(text) {
        if (!window.speechSynthesis || !isSpeechEnabled) return;
        
        // Clean the text for better speech
        let cleanText = text
            .replace(/[*#\[\](){}]/g, '') // Remove markdown symbols
            .replace(/\n+/g, '. ') // Replace line breaks with periods
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
            .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown
            .replace(/`(.*?)`/g, '$1') // Remove code markdown
            .trim();
        
        // Don't speak if text is too short or just punctuation
        if (cleanText.length < 3 || /^[^\w\s]*$/.test(cleanText)) {
            return;
        }
        
        // Cancel any previous speech
        window.speechSynthesis.cancel();
        
        // Create speech utterance
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'en-US';
        utterance.rate = 0.9; // Slightly slower for better comprehension
        utterance.pitch = 1;
        utterance.volume = 0.8;
        
        // Find a good voice (prefer female voice for mental health context)
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(voice => 
            voice.lang.startsWith('en') && 
            (voice.name.includes('Female') || voice.name.includes('Woman') || voice.name.includes('Google'))
        ) || voices.find(voice => voice.lang.startsWith('en'));
        
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }
        
        // Add event listeners
        utterance.onstart = () => {
            console.log('Started speaking:', cleanText.substring(0, 50) + '...');
            // Enhanced visual feedback that speech is active
            if (toggleSpeechBtn) {
                toggleSpeechBtn.classList.add('speaking');
                toggleSpeechBtn.style.animation = 'pulse-speech 1.5s infinite';
            }
        };
        
        utterance.onend = () => {
            console.log('Finished speaking');
            if (toggleSpeechBtn) {
                toggleSpeechBtn.classList.remove('speaking');
                toggleSpeechBtn.style.animation = '';
            }
        };
        
        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            if (toggleSpeechBtn) {
                toggleSpeechBtn.classList.remove('speaking');
                toggleSpeechBtn.style.animation = '';
            }
        };
        
        // Speak the text
        window.speechSynthesis.speak(utterance);
    }

    // Function to format AI responses with proper styling
    function formatAIResponse(text) {
        // First escape any existing HTML
        let formatted = escapeHtml(text);
        
        // Split into paragraphs and process each one
        const paragraphs = formatted.split('\n\n').filter(p => p.trim() !== '');
        
        let result = '';
        
        paragraphs.forEach((paragraph, index) => {
            const trimmed = paragraph.trim();
            if (!trimmed) return;
            
            // Check for different content types
            if (isHeading(trimmed)) {
                result += formatHeading(trimmed);
            } else if (isBulletList(trimmed)) {
                result += formatBulletList(trimmed);
            } else if (isNumberedList(trimmed)) {
                result += formatNumberedList(trimmed);
            } else if (isEmergencyContent(trimmed)) {
                result += formatEmergencyContent(trimmed);
            } else {
                // Regular paragraph
                result += formatParagraph(trimmed);
            }
        });
        
        return result;
    }
    
    // Helper function to escape HTML
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Helper function to check if text is a heading
    function isHeading(text) {
        return /^#+\s/.test(text) || 
               /^[A-Z][^.!?]*:?\s*$/.test(text.split('\n')[0]) ||
               text.startsWith('**') && text.endsWith('**');
    }
    
    // Helper function to check if text is a bullet list
    function isBulletList(text) {
        const lines = text.split('\n');
        return lines.some(line => /^[•\-\*]\s/.test(line.trim()));
    }
    
    // Helper function to check if text is a numbered list
    function isNumberedList(text) {
        const lines = text.split('\n');
        return lines.some(line => /^\d+\.\s/.test(line.trim()));
    }
    
    // Helper function to check if text contains emergency content
    function isEmergencyContent(text) {
        const emergencyKeywords = ['crisis', 'helpline', 'emergency', 'immediate support', 'call'];
        return emergencyKeywords.some(keyword => text.toLowerCase().includes(keyword));
    }
    
    // Function to format headings
    function formatHeading(text) {
        let content = text;
        let level = 3; // Default heading level
        
        // Remove markdown heading syntax if present
        if (text.startsWith('#')) {
            const match = text.match(/^(#+)\s*(.*)$/);
            if (match) {
                level = Math.min(match[1].length + 2, 6); // Adjust level for message context
                content = match[2];
            }
        }
        
        // Remove bold markdown if present
        content = content.replace(/^\*\*(.*)\*\*$/, '$1');
        
        return `<h${level} class="ai-heading">${content}</h${level}>`;
    }
    
    // Function to format bullet lists
    function formatBulletList(text) {
        const lines = text.split('\n');
        let listItems = [];
        let currentItem = '';
        
        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (/^[•\-\*]\s/.test(trimmedLine)) {
                // New bullet point
                if (currentItem) {
                    listItems.push(currentItem.trim());
                }
                currentItem = trimmedLine.replace(/^[•\-\*]\s/, '');
            } else if (trimmedLine && currentItem) {
                // Continuation of current bullet point
                currentItem += ' ' + trimmedLine;
            } else if (trimmedLine && !currentItem) {
                // Standalone text, treat as bullet point
                currentItem = trimmedLine;
            }
        });
        
        // Add the last item
        if (currentItem) {
            listItems.push(currentItem.trim());
        }
        
        if (listItems.length === 0) {
            return `<p class="ai-paragraph">${text}</p>`;
        }
        
        const formattedItems = listItems.map(item => {
            // Format bold text within list items
            const formatted = item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            return `<li class="ai-list-item">${formatted}</li>`;
        }).join('');
        
        return `<ul class="ai-bullet-list">${formattedItems}</ul>`;
    }
    
    // Function to format numbered lists
    function formatNumberedList(text) {
        const lines = text.split('\n');
        let listItems = [];
        let currentItem = '';
        
        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (/^\d+\.\s/.test(trimmedLine)) {
                // New numbered point
                if (currentItem) {
                    listItems.push(currentItem.trim());
                }
                currentItem = trimmedLine.replace(/^\d+\.\s/, '');
            } else if (trimmedLine && currentItem) {
                // Continuation of current point
                currentItem += ' ' + trimmedLine;
            }
        });
        
        // Add the last item
        if (currentItem) {
            listItems.push(currentItem.trim());
        }
        
        if (listItems.length === 0) {
            return `<p class="ai-paragraph">${text}</p>`;
        }
        
        const formattedItems = listItems.map(item => {
            // Format bold text within list items
            const formatted = item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            return `<li class="ai-list-item">${formatted}</li>`;
        }).join('');
        
        return `<ol class="ai-numbered-list">${formattedItems}</ol>`;
    }
    
    // Function to format emergency content
    function formatEmergencyContent(text) {
        const formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong class="emergency-highlight">$1</strong>');
        return `<div class="ai-emergency-content">${formatted}</div>`;
    }
    
    // Function to format regular paragraphs
    function formatParagraph(text) {
        // Format bold text
        let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong class="ai-emphasis">$1</strong>');
        
        // Format italic text
        formatted = formatted.replace(/\*(.*?)\*/g, '<em class="ai-italic">$1</em>');
        
        // Handle line breaks within paragraphs
        formatted = formatted.replace(/\n/g, '<br>');
        
        return `<p class="ai-paragraph">${formatted}</p>`;
    }

    // Function to create resource item element with in-panel viewing
    function createResourceItem(resource, type) {
        const item = document.createElement('div');
        item.className = 'resource-item';
        
        let mediaContent = '';
        
        // Create media content based on type
        if (type === 'videos' && resource.file) {
            mediaContent = `
                <div class="media-thumbnail" onclick="playVideoInPanel(this, '${resource.file}', '${escapeHtml(resource.title)}')">
                    <div class="play-button">
                        <i class="fas fa-play"></i>
                    </div>
                    <div class="media-overlay">
                        <span class="media-type-badge">VIDEO</span>
                    </div>
                </div>
            `;
        } else if (type === 'audio' && resource.file) {
            mediaContent = `
                <div class="media-thumbnail audio-thumbnail" onclick="playAudioInPanel(this, '${resource.file}', '${escapeHtml(resource.title)}')">
                    <div class="play-button">
                        <i class="fas fa-volume-up"></i>
                    </div>
                    <div class="media-overlay">
                        <span class="media-type-badge">AUDIO</span>
                    </div>
                </div>
            `;
        } else if (type === 'guides' && resource.file) {
            mediaContent = `
                <div class="media-thumbnail guide-thumbnail" onclick="openGuide('${resource.file}', '${escapeHtml(resource.title)}')">
                    <div class="play-button">
                        <i class="fas fa-book-open"></i>
                    </div>
                    <div class="media-overlay">
                        <span class="media-type-badge">GUIDE</span>
                    </div>
                </div>
            `;
        }
        
        item.innerHTML = `
            ${mediaContent}
            <div class="resource-details">
                <h4>${escapeHtml(resource.title)}</h4>
                <p>${escapeHtml(resource.description)}</p>
                <div class="resource-meta">
                    <span class="resource-type">${type.slice(0, -1)}</span>
                    ${resource.duration ? `<span class="resource-duration">${escapeHtml(resource.duration)}</span>` : ''}
                </div>
            </div>
        `;
        
        return item;
    }
    
    // Function to show typing indicator
    function showTypingIndicator() {
        isTyping = true;
        typingIndicator.classList.add('show');
        updateSendButton();
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Function to hide typing indicator
    function hideTypingIndicator() {
        isTyping = false;
        typingIndicator.classList.remove('show');
        updateSendButton();
    }
    
    // Function to check for emergency keywords
    function checkEmergencyKeywords(message) {
        const emergencyKeywords = [
            'suicide', 'kill myself', 'end my life', 'want to die', 'self harm', 'hurt myself',
            'cut myself', 'overdose', 'jump off', 'hang myself', 'not worth living',
            'better off dead', 'end it all', 'can\'t go on'
        ];
        
        const lowerMessage = message.toLowerCase();
        return emergencyKeywords.some(keyword => lowerMessage.includes(keyword));
    }
    
    // Function to add emergency response
    function addEmergencyResponse() {
        const emergencyHTML = `
            <div class="emergency-response">
                <h4><i class="fas fa-exclamation-triangle"></i> Immediate Support Available</h4>
                <p>I'm concerned about what you've shared. Your life has value and there are people who want to help you right now.</p>
                <div class="emergency-actions">
                    <a href="tel:9152987821" class="emergency-btn">
                        <i class="fas fa-phone"></i> Call Crisis Helpline: 9152987821
                    </a>
                    <a href="tel:100" class="emergency-btn">
                        <i class="fas fa-ambulance"></i> Emergency Services: 100
                    </a>
                    <a href="https://www.suicide.org/international-suicide-hotlines.html" target="_blank" class="emergency-btn">
                        <i class="fas fa-globe"></i> Find Local Support
                    </a>
                </div>
                <p style="margin-top: 15px; font-size: 14px;">You are not alone. Please reach out to someone you trust or use one of these resources immediately.</p>
            </div>
        `;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ai-message';
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                ${emergencyHTML}
                <div class="message-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            </div>
        `;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Function to load resources from JSON file
    async function loadResources() {
        try {
            const response = await fetch('resource/resources.json');
            resourcesData = await response.json();
            
            // Load default resources based on current mood or general resources
            const moodLabel = currentMood?.label?.toLowerCase() || 'general';
            displayResources(moodLabel);
            
        } catch (error) {
            console.error('Error loading resources:', error);
            displayDefaultResources();
        }
    }
    
    // Function to setup resource tabs
    function setupResourceTabs() {
        const resourceTabs = document.querySelectorAll('.resource-tab');
        const resourceContents = document.querySelectorAll('.resource-content');
        
        resourceTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs and contents
                resourceTabs.forEach(t => t.classList.remove('active'));
                resourceContents.forEach(c => c.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding content
                tab.classList.add('active');
                const tabType = tab.getAttribute('data-tab');
                const content = document.getElementById(`${tabType}-content`);
                if (content) {
                    content.classList.add('active');
                }
                
                // Load resources for this tab
                const moodLabel = currentMood?.label?.toLowerCase() || 'general';
                displayResourcesByType(tabType, moodLabel);
            });
        });
    }
    
    // Function to display resources by type and mood
    function displayResourcesByType(type, moodLabel) {
        if (!resourcesData) return;
        
        const container = document.getElementById(`${type}-content`);
        if (!container) return;
        
        let resources = [];
        
        // Get resources of the specified type
        if (resourcesData[type]) {
            resources = resourcesData[type].filter(resource => {
                // Filter by mood tags or show general resources
                return !resource.tags || resource.tags.length === 0 || 
                       resource.tags.includes(moodLabel) || 
                       resource.tags.includes('general');
            });
        }
        
        // Limit to 5 resources
        resources = resources.slice(0, 5);
        
        // Clear container
        container.innerHTML = '';
        
        if (resources.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #6b7280; font-size: 14px; padding: 20px;">No resources available for this category.</p>';
            return;
        }
        
        // Display resources
        resources.forEach(resource => {
            const resourceItem = createResourceItem(resource, type);
            container.appendChild(resourceItem);
        });
    }
    
    // Function to create resource item element
    function createResourceItem(resource, type) {
        const item = document.createElement('div');
        item.className = 'resource-item';
        
        let mediaContent = '';
        
        // Create media content based on type
        if (type === 'videos' && resource.file) {
            mediaContent = `
                <div class="media-thumbnail" onclick="playVideoInPanel(this, '${resource.file}', '${escapeHtml(resource.title)}')">
                    <div class="play-button">
                        <i class="fas fa-play"></i>
                    </div>
                    <div class="media-overlay">
                        <span class="media-type-badge">VIDEO</span>
                    </div>
                </div>
            `;
        } else if (type === 'audio' && resource.file) {
            mediaContent = `
                <div class="media-thumbnail audio-thumbnail" onclick="playAudioInPanel(this, '${resource.file}', '${escapeHtml(resource.title)}')">
                    <div class="play-button">
                        <i class="fas fa-volume-up"></i>
                    </div>
                    <div class="media-overlay">
                        <span class="media-type-badge">AUDIO</span>
                    </div>
                </div>
            `;
        } else if (type === 'guides' && resource.file) {
            mediaContent = `
                <div class="media-thumbnail guide-thumbnail" onclick="openGuide('${resource.file}', '${escapeHtml(resource.title)}')">
                    <div class="play-button">
                        <i class="fas fa-book-open"></i>
                    </div>
                    <div class="media-overlay">
                        <span class="media-type-badge">GUIDE</span>
                    </div>
                </div>
            `;
        }
        
        item.innerHTML = `
            ${mediaContent}
            <div class="resource-details">
                <h4>${escapeHtml(resource.title)}</h4>
                <p>${escapeHtml(resource.description)}</p>
                <div class="resource-meta">
                    <span class="resource-type">${type.slice(0, -1)}</span>
                    ${resource.duration ? `<span class="resource-duration">${escapeHtml(resource.duration)}</span>` : ''}
                </div>
            </div>
        `;
        
        return item;
    }
    
    // Function to display resources by type and mood
    function displayResourcesByType(type, moodLabel) {
        if (!resourcesData) return;
        
        const container = document.getElementById(`${type}-content`);
        if (!container) return;
        
        let resources = [];
        
        // Get resources of the specified type
        if (resourcesData[type]) {
            resources = resourcesData[type].filter(resource => {
                // Filter by mood tags or show general resources
                return !resource.tags || resource.tags.length === 0 || 
                       resource.tags.includes(moodLabel) || 
                       resource.tags.includes('general');
            });
        }
        
        // Limit to 5 resources
        resources = resources.slice(0, 5);
        
        // Clear container
        container.innerHTML = '';
        
        if (resources.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #6b7280; font-size: 14px; padding: 20px;">No resources available for this category.</p>';
            return;
        }
        
        // Display resources
        resources.forEach(resource => {
            const resourceItem = createResourceItem(resource, type);
            container.appendChild(resourceItem);
        });
    }
    
    // Function to create resource item element
    function createResourceItem(resource, type) {
        const item = document.createElement('div');
        item.className = 'resource-item';
        
        let mediaContent = '';
        
        // Create media content based on type
        if (type === 'videos' && resource.file) {
            mediaContent = `
                <div class="media-thumbnail" onclick="playVideoInPanel(this, '${resource.file}', '${escapeHtml(resource.title)}')">
                    <div class="play-button">
                        <i class="fas fa-play"></i>
                    </div>
                    <div class="media-overlay">
                        <span class="media-type-badge">VIDEO</span>
                    </div>
                </div>
            `;
        } else if (type === 'audio' && resource.file) {
            mediaContent = `
                <div class="media-thumbnail audio-thumbnail" onclick="playAudioInPanel(this, '${resource.file}', '${escapeHtml(resource.title)}')">
                    <div class="play-button">
                        <i class="fas fa-volume-up"></i>
                    </div>
                    <div class="media-overlay">
                        <span class="media-type-badge">AUDIO</span>
                    </div>
                </div>
            `;
        } else if (type === 'guides' && resource.file) {
            mediaContent = `
                <div class="media-thumbnail guide-thumbnail" onclick="openGuide('${resource.file}', '${escapeHtml(resource.title)}')">
                    <div class="play-button">
                        <i class="fas fa-book-open"></i>
                    </div>
                    <div class="media-overlay">
                        <span class="media-type-badge">GUIDE</span>
                    </div>
                </div>
            `;
        }
        
        item.innerHTML = `
            ${mediaContent}
            <div class="resource-details">
                <h4>${escapeHtml(resource.title)}</h4>
                <p>${escapeHtml(resource.description)}</p>
                <div class="resource-meta">
                    <span class="resource-type">${type.slice(0, -1)}</span>
                    ${resource.duration ? `<span class="resource-duration">${escapeHtml(resource.duration)}</span>` : ''}
                </div>
            </div>
        `;
        
        return item;
    }
    
    // Function to display default resources on page load
    function displayResources(moodLabel) {
        displayResourcesByType('videos', moodLabel);
        displayResourcesByType('audio', moodLabel);
        displayResourcesByType('guides', moodLabel);
    }
    
    // Function to display default resources if loading fails
    function displayDefaultResources() {
        const defaultResources = {
            videos: [
                {
                    title: "Breathing Exercise for Anxiety",
                    description: "A 5-minute guided breathing exercise to help reduce anxiety.",
                    file: "resource/videos/breathing-exercise.mp4",
                    duration: "5 min"
                }
            ],
            audio: [
                {
                    title: "Relaxing Nature Sounds",
                    description: "Calming sounds to help you relax and focus.",
                    file: "resource/audio/nature-sounds.mp3",
                    duration: "10 min"
                }
            ],
            guides: [
                {
                    title: "Stress Management Guide",
                    description: "Practical tips for managing stress in daily life.",
                    file: "resource/guides/stress-management.pdf"
                }
            ]
        };
        
        Object.keys(defaultResources).forEach(type => {
            const container = document.getElementById(`${type}-content`);
            if (container) {
                container.innerHTML = '';
                defaultResources[type].forEach(resource => {
                    const resourceItem = createResourceItem(resource, type);
                    container.appendChild(resourceItem);
                });
            }
        });
    }
    
    // Function to prepare context for AI
    function prepareContext(userMessage) {
        let context = '';
        
        // Add mood context
        if (currentMood) {
            context += `User's current mood: ${currentMood.label}. `;
        }
        
        // Add conversation history context (last 3 messages)
        const recentHistory = conversationHistory.slice(-6); // Last 3 exchanges
        if (recentHistory.length > 0) {
            context += 'Recent conversation: ';
            recentHistory.forEach(msg => {
                context += `${msg.sender}: ${msg.text} `;
            });
        }
        
        // Add guidelines
        context += `
        Guidelines: 
        - Be empathetic and supportive
        - Provide practical advice and motivation
        - Suggest healthy coping strategies
        - Do not provide medical diagnosis or treatment
        - Keep responses conversational and under 150 words
        - If user seems distressed, encourage professional help
        `;
        
        return context;
    }
    
    // Function to generate AI response
    async function generateAIResponse(userMessage) {
        try {
            console.log('Sending request to AI service...');
            
            // Prepare context for AI
            const context = prepareContext(userMessage);
            
            // Send to backend AI service
            const response = await fetch(`${apiConfig.backendApiUrl}/api/ai/chat`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    message: userMessage,
                    context: context,
                    mood: currentMood
                })
            });
            
            console.log('AI service response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('AI service error response:', errorText);
                throw new Error(`Server responded with status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('AI service response data:', data);
            
            if (data.success) {
                return data.response;
            } else {
                throw new Error(data.message || 'Failed to generate response');
            }
        } catch (error) {
            console.error('Error generating AI response:', error);
            
            // Fallback response based on mood and message content
            return generateLocalFallbackResponse(userMessage);
        }
    }
    
    // Function to generate local fallback response
    function generateLocalFallbackResponse(userMessage) {
        const lowerMessage = userMessage.toLowerCase();
        
        // Handle anxiety and overwhelm specifically
        if (lowerMessage.includes('anxious') || lowerMessage.includes('anxiety')) {
            return "I hear that you're feeling anxious, and I want you to know that these feelings are completely valid. Try some deep breathing exercises - breathe in for 4 counts, hold for 4, and exhale for 4. Grounding techniques can also help: name 5 things you can see, 4 you can touch, 3 you can hear. What's been contributing to your anxiety lately?";
        }
        
        if (lowerMessage.includes('overwhelm') || lowerMessage.includes('stressed')) {
            return "Feeling overwhelmed is really tough, and I'm glad you're reaching out. When everything feels like too much, try breaking things down into smaller, manageable pieces. Focus on just the next small step you can take. Remember to breathe deeply and give yourself permission to take breaks. What's been the biggest source of stress for you?";
        }
        
        // Mood-based responses
        if (currentMood) {
            switch (currentMood.label.toLowerCase()) {
                case 'sad':
                    return "I understand you're going through a difficult time. Your feelings are valid and it's okay to feel this way. Consider talking to someone you trust, doing something that brings you comfort, or engaging in gentle physical activity. Remember, difficult feelings are temporary. What usually helps you feel better?";
                
                case 'angry':
                    return "I can sense you're feeling frustrated or angry. These are natural emotions. Try taking some deep breaths, going for a walk, or writing down your thoughts. Physical exercise can help release that energy. What's causing you to feel this way?";
                
                case 'fear':
                case 'anxious':
                    return "Anxiety can feel overwhelming, but you're not alone. Try the 4-7-8 breathing technique: breathe in for 4, hold for 7, exhale for 8. Ground yourself by naming 5 things you can see around you. What's making you feel anxious right now?";
                
                case 'happy':
                    return "I notice you mentioned feeling anxious despite being in a happy mood - that's completely normal! We can feel multiple emotions at once. Try some deep breathing exercises or grounding techniques. Would you like to share what's causing the anxiety?";
                
                default:
                    return "Thank you for sharing with me. I'm here to listen and support you. Whatever you're experiencing, your feelings are valid. Sometimes talking about our feelings can help us process them better. What would you like to talk about?";
            }
        }
        
        // General supportive responses
        const supportiveResponses = [
            "I hear you, and I'm here to support you. Your feelings are valid, and reaching out shows strength. When we're feeling anxious and overwhelmed, it can help to focus on what we can control right now. What's been weighing on your mind?",
            "Thank you for trusting me with your thoughts. Feeling anxious and overwhelmed is challenging, but you're taking a positive step by talking about it. What would be most helpful for you right now?",
            "I understand this might be difficult. You're not alone in these feelings. Consider practicing some mindfulness or reaching out to someone you trust. What's been the main source of these feelings?",
            "Your wellbeing matters, and I'm glad you're here to talk. When anxiety hits, remember to be gentle with yourself and focus on your breathing. These intense feelings will pass. What specific situation is making you feel this way?"
        ];
        
        return supportiveResponses[Math.floor(Math.random() * supportiveResponses.length)];
    }
    
    // Function to clear chat
    function clearChat() {
        if (confirm('Are you sure you want to clear the chat history?')) {
            // Keep only the welcome message
            const welcomeMessage = chatMessages.firstElementChild;
            chatMessages.innerHTML = '';
            if (welcomeMessage) {
                chatMessages.appendChild(welcomeMessage);
            }
            
            // Clear history
            conversationHistory = [];
            saveConversationHistory();
            
            showInfo('Chat cleared successfully.');
        }
    }
    
    // Function to toggle chat - Fixed
    function toggleChat() {
        const chatContainer = document.getElementById('chat-container');
        if (!chatContainer) return;
        
        const isMinimized = chatContainer.classList.contains('minimized');
        
        if (isMinimized) {
            chatContainer.classList.remove('minimized');
            if (toggleChatBtn) {
                toggleChatBtn.innerHTML = '<i class="fas fa-compress"></i>';
                toggleChatBtn.title = 'Minimize Chat';
            }
        } else {
            chatContainer.classList.add('minimized');
            if (toggleChatBtn) {
                toggleChatBtn.innerHTML = '<i class="fas fa-expand"></i>';
                toggleChatBtn.title = 'Expand Chat';
            }
        }
    }
    
    // Function to save conversation history
    function saveConversationHistory() {
        localStorage.setItem('ai_conversation_history', JSON.stringify(conversationHistory));
    }
    
    // Function to load conversation history
    function loadConversationHistory() {
        const saved = localStorage.getItem('ai_conversation_history');
        if (saved) {
            conversationHistory = JSON.parse(saved);
            
            // Restore messages (limit to last 10 exchanges)
            const recentHistory = conversationHistory.slice(-20);
            recentHistory.forEach(msg => {
                if (msg.sender && msg.text) {
                    const messageDiv = document.createElement('div');
                    messageDiv.className = `message ${msg.sender}-message`;
                    
                    const time = new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    
                    messageDiv.innerHTML = `
                        <div class="message-avatar">
                            <i class="fas ${msg.sender === 'user' ? 'fa-user' : 'fa-robot'}"></i>
                        </div>
                        <div class="message-content">
                            <div class="message-text">${msg.text}</div>
                            <div class="message-time">${time}</div>
                        </div>
                    `;
                    
                    chatMessages.appendChild(messageDiv);
                }
            });
            
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }
    
    // Function to load recommendations
    async function loadRecommendations(moodLabel) {
        try {
            const response = await fetch('resource/resources.json');
            const resources = await response.json();
            
            // Filter resources by mood
            const filtered = filterResourcesByMood(resources, moodLabel.toLowerCase());
            
            // Display recommendations only if we have resources
            if (filtered.length > 0) {
                displayRecommendations(filtered);
            }
            
        } catch (error) {
            console.error('Error loading recommendations:', error);
        }
    }
    
    // Function to filter resources by mood
    function filterResourcesByMood(resources, mood) {
        const filtered = [];
        
        Object.keys(resources).forEach(resourceType => {
            if (Array.isArray(resources[resourceType])) {
                resources[resourceType].forEach(resource => {
                    if (resource.tags && resource.tags.includes(mood)) {
                        filtered.push({
                            ...resource,
                            type: resourceType.slice(0, -1) // Remove 's' from type name
                        });
                    }
                });
            }
        });
        
        // Limit to 6 resources
        return filtered.slice(0, 6);
    }
    
    // Function to display recommendations - Fixed
    function displayRecommendations(resources) {
        if (resources.length === 0) return;
        
        // Try to find the recommendations container - multiple possible IDs
        let container = document.getElementById('recommendations-content');
        if (!container) {
            container = document.getElementById('videos-content');
        }
        
        // If still no container, create a temporary display in the active resource tab
        if (!container) {
            const activeContent = document.querySelector('.resource-content.active');
            if (activeContent) {
                container = activeContent;
            }
        }
        
        // If we still don't have a container, don't proceed
        if (!container) {
            console.warn('No container found for recommendations');
            return;
        }
        
        // Clear existing content if it's the main recommendations container
        if (container.id === 'recommendations-content') {
            container.innerHTML = '';
        } else {
            // For resource tabs, just add the recommendations at the top
            const existingRecommendations = container.querySelector('.mood-recommendations');
            if (existingRecommendations) {
                existingRecommendations.remove();
            }
        }
        
        // Create recommendations section
        const recommendationsSection = document.createElement('div');
        recommendationsSection.className = 'mood-recommendations';
        recommendationsSection.innerHTML = `
            <div class="recommendations-header">
                <h4><i class="fas fa-magic"></i> Recommended for your current mood</h4>
            </div>
            <div class="recommendations-grid"></div>
        `;
        
        const recommendationsGrid = recommendationsSection.querySelector('.recommendations-grid');
        
        resources.forEach(resource => {
            const card = document.createElement('div');
            card.className = 'resource-item recommendation-item';
            
            let mediaContent = '';
            if (resource.type === 'video' && resource.file) {
                mediaContent = `
                    <div class="media-thumbnail" onclick="playVideoInPanel(this, '${resource.file}', '${escapeHtml(resource.title)}')">
                        <div class="play-button">
                            <i class="fas fa-play"></i>
                        </div>
                        <div class="media-overlay">
                            <span class="media-type-badge">VIDEO</span>
                        </div>
                    </div>
                `;
            } else if (resource.type === 'audio' && resource.file) {
                mediaContent = `
                    <div class="media-thumbnail audio-thumbnail" onclick="playAudioInPanel(this, '${resource.file}', '${escapeHtml(resource.title)}')">
                        <div class="play-button">
                            <i class="fas fa-volume-up"></i>
                        </div>
                        <div class="media-overlay">
                            <span class="media-type-badge">AUDIO</span>
                        </div>
                    </div>
                `;
            } else if (resource.type === 'guide' && resource.file) {
                mediaContent = `
                    <div class="media-thumbnail guide-thumbnail" onclick="openGuide('${resource.file}', '${escapeHtml(resource.title)}')">
                        <div class="play-button">
                            <i class="fas fa-book-open"></i>
                        </div>
                        <div class="media-overlay">
                            <span class="media-type-badge">GUIDE</span>
                        </div>
                    </div>
                `;
            }
            
            card.innerHTML = `
                ${mediaContent}
                <div class="resource-details">
                    <h4>${escapeHtml(resource.title)}</h4>
                    <p>${escapeHtml(resource.description)}</p>
                    <div class="resource-meta">
                        <span class="resource-type">${resource.type}</span>
                        ${resource.duration ? `<span class="resource-duration">${escapeHtml(resource.duration)}</span>` : ''}
                    </div>
                </div>
            `;
            
            recommendationsGrid.appendChild(card);
        });
        
        // Add to container
        if (container.id === 'recommendations-content') {
            container.appendChild(recommendationsSection);
        } else {
            container.insertBefore(recommendationsSection, container.firstChild);
        }
        
        // Show recommendations section if it exists
        const resourcesSection = document.getElementById('resources-recommendations');
        if (resourcesSection) {
            resourcesSection.classList.add('show');
        }
    }
    
    // Helper functions for opening different media types
    function openMedia(file, type) {
        window.open(file, '_blank');
    }
    
    function openImage(file) {
        window.open(file, '_blank');
    }
    
    function openPDF(file) {
        window.open(file, '_blank');
    }
    
    function showQuote(resource) {
        if (resource.quotes && resource.quotes.length > 0) {
            const randomQuote = resource.quotes[Math.floor(Math.random() * resource.quotes.length)];
            addMessage(`Here's an inspiring quote for you: "${randomQuote}"`, 'ai');
        }
    }
    
    // Helper function to format time ago
    function formatTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffInMinutes = Math.floor((now - time) / (1000 * 60));
        
        if (diffInMinutes < 1) {
            return 'just now';
        } else if (diffInMinutes < 60) {
            return `${diffInMinutes} minutes ago`;
        } else if (diffInMinutes < 120) {
            return '1 hour ago';
        } else {
            return '2+ hours ago';
        }
    }
    
    // Setup profile dropdown
    function setupProfileDropdown() {
        const profileTrigger = document.getElementById('profile-trigger');
        const profileDropdown = document.getElementById('profile-dropdown');
        
        if (!profileTrigger || !profileDropdown) return;
        
        profileTrigger.addEventListener('click', function(e) {
            e.stopPropagation();
            profileDropdown.classList.toggle('active');
        });
        
        document.addEventListener('click', function(event) {
            if (!profileTrigger.contains(event.target) && !profileDropdown.contains(event.target)) {
                profileDropdown.classList.remove('active');
            }
        });
    }
    
    // Check recent mood and update mood tracker button
    async function checkAndUpdateMoodButton() {
        if (!authToken) return;
        
        try {
            const apiUrl = `${apiConfig.backendApiUrl}/api/mood/recent`;
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers
            });
            
            const data = await response.json();
            
            if (data.success && data.isRecent) {
                const moodTrackerBtn = document.querySelector('.mood-tracker-btn');
                if (moodTrackerBtn) {
                    const moodData = data.data;
                    const moodEmojis = {
                        'Angry': '😠',
                        'Disgust': '🤢',
                        'Fear': '😨',
                        'Happy': '😄',
                        'Neutral': '😐',
                        'Sad': '😢',
                        'Surprise': '😲'
                    };
                    
                    const emoji = moodEmojis[moodData.label] || '📊';
                    moodTrackerBtn.innerHTML = `
                        <span style="font-size: 16px;">${emoji}</span> ${moodData.label}
                    `;
                    moodTrackerBtn.classList.add('current-mood');
                }
            }
        } catch (error) {
            console.error('Error checking recent mood:', error);
        }
    }
    
    // Check and update mood button
    checkAndUpdateMoodButton();
});

// Global functions for in-panel media playback
function playVideoInPanel(thumbnail, videoSrc, title) {
    // Remove any existing media player in this resource item
    const resourceItem = thumbnail.closest('.resource-item');
    const existingPlayer = resourceItem.querySelector('.media-player');
    if (existingPlayer) {
        existingPlayer.remove();
        thumbnail.style.display = 'block';
        return;
    }
    
    // Create video player
    const mediaPlayer = document.createElement('div');
    mediaPlayer.className = 'media-player';
    mediaPlayer.innerHTML = `
        <div class="media-player-header">
            <span class="media-title">${title}</span>
            <button class="media-close" onclick="closeInPanelMedia(this)">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <video controls autoplay>
            <source src="${videoSrc}" type="video/mp4">
            Your browser does not support the video tag.
        </video>
    `;
    
    // Insert after thumbnail
    thumbnail.parentNode.insertBefore(mediaPlayer, thumbnail.nextSibling);
    
    // Hide thumbnail
    thumbnail.style.display = 'none';
}

function playAudioInPanel(thumbnail, audioSrc, title) {
    // Remove any existing media player in this resource item
    const resourceItem = thumbnail.closest('.resource-item');
    const existingPlayer = resourceItem.querySelector('.media-player');
    if (existingPlayer) {
        existingPlayer.remove();
        thumbnail.style.display = 'block';
        return;
    }
    
    // Create audio player
    const mediaPlayer = document.createElement('div');
    mediaPlayer.className = 'media-player audio-player';
    mediaPlayer.innerHTML = `
        <div class="media-player-header">
            <span class="media-title">${title}</span>
            <button class="media-close" onclick="closeInPanelMedia(this)">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="audio-player-content">
            <div class="audio-icon">
                <i class="fas fa-music"></i>
            </div>
            <audio controls>
                <source src="${audioSrc}" type="audio/mpeg">
                <source src="${audioSrc}" type="audio/wav">
                <source src="${audioSrc}" type="audio/ogg">
                Your browser does not support the audio element.
            </audio>
        </div>
    `;
    
    // Insert after thumbnail
    thumbnail.parentNode.insertBefore(mediaPlayer, thumbnail.nextSibling);
    
    // Hide thumbnail
    thumbnail.style.display = 'none';
}

function openGuide(guideSrc, title) {
    // Open guide in new tab/window
    window.open(guideSrc, '_blank');
}

function closeInPanelMedia(closeButton) {
    const mediaPlayer = closeButton.closest('.media-player');
    const resourceItem = closeButton.closest('.resource-item');
    const thumbnail = resourceItem.querySelector('.media-thumbnail');
    
    if (mediaPlayer) {
        // Stop any playing media
        const video = mediaPlayer.querySelector('video');
        const audio = mediaPlayer.querySelector('audio');
        
        if (video) {
            video.pause();
            video.currentTime = 0;
        }
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
        }
        
        mediaPlayer.remove();
        if (thumbnail) {
            thumbnail.style.display = 'block';
        }
    }
}

// Add CSS for media modal
const mediaModalCSS = `
<style>
.media-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    opacity: 0;
    transition: opacity 0.3s ease;
}

.media-modal.active {
    opacity: 1;
}

.media-modal-content {
    background: white;
    border-radius: 16px;
    max-width: 800px;
    max-height: 600px;
    width: 90%;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.media-modal-content.audio-modal {
    max-width: 400px;
    max-height: 300px;
}

.media-modal-header {
    padding: 20px 25px;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f8fafc;
}

.media-modal-header h3 {
    margin: 0;
    color: #1f2937;
    font-size: 18px;
    font-weight: 600;
}

.modal-close {
    background: none;
    border: none;
    font-size: 18px;
    color: #6b7280;
    cursor: pointer;
    padding: 5px;
    border-radius: 50%;
    transition: all 0.3s ease;
}

.modal-close:hover {
    background: #e5e7eb;
    color: #374151;
}

.media-container {
    padding: 0;
}

.media-container video {
    width: 100%;
    height: auto;
    display: block;
}

.audio-player {
    padding: 40px;
    text-align: center;
}

.audio-icon {
    font-size: 48px;
    color: #3b82f6;
    margin-bottom: 20px;
}

.audio-player audio {
    width: 100%;
    margin-top: 20px;
}

.resource-action-btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    margin-top: 12px;
    width: 100%;
}

.resource-action-btn:hover {
    background: #1e40af;
    transform: translateY(-1px);
}

@media (max-width: 768px) {
    .media-modal-content {
        width: 95%;
        max-height: 80vh;
    }
    
    .media-modal-header {
        padding: 15px 20px;
    }
    
    .audio-player {
        padding: 30px 20px;
    }
}
</style>
`;

// Inject CSS for media modal
document.head.insertAdjacentHTML('beforeend', mediaModalCSS);
