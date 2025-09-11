// MindSpace Chatbot - Website Assistant Bot
class MindSpaceChatbot {
    constructor() {
        this.isOpen = false;
        this.messages = [];
        this.init();
        this.setupEventListeners();
        this.addWelcomeMessage();
    }

    // Initialize chatbot elements
    init() {
        this.chatbotToggle = document.getElementById('chatbot-toggle');
        this.chatbotContainer = document.getElementById('chatbot-container');
        this.chatbotClose = document.getElementById('chatbot-close');
        this.chatbotInput = document.getElementById('chatbot-input');
        this.chatbotSend = document.getElementById('chatbot-send');
        this.chatbotMessages = document.getElementById('chatbot-messages');
        this.typingIndicator = document.getElementById('typing-indicator');
        this.notification = document.getElementById('chatbot-notification');
    }

    // Set up event listeners
    setupEventListeners() {
        // Toggle chatbot
        this.chatbotToggle.addEventListener('click', () => this.toggleChatbot());
        this.chatbotClose.addEventListener('click', () => this.closeChatbot());

        // Send message
        this.chatbotSend.addEventListener('click', () => this.sendMessage());
        this.chatbotInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // Hide notification when opened
        this.chatbotToggle.addEventListener('click', () => {
            this.notification.style.display = 'none';
        });
    }

    // Toggle chatbot visibility
    toggleChatbot() {
        this.isOpen = !this.isOpen;
        
        if (this.isOpen) {
            this.chatbotContainer.classList.add('active');
            this.chatbotInput.focus();
        } else {
            this.chatbotContainer.classList.remove('active');
        }
    }

    // Close chatbot
    closeChatbot() {
        this.isOpen = false;
        this.chatbotContainer.classList.remove('active');
    }

    // Add welcome message
    addWelcomeMessage() {
        setTimeout(() => {
            this.addBotMessage("👋 Hi! I'm your MindSpace assistant. I can help you navigate our website, find resources, or answer questions about mental wellness. How can I assist you today?", [
                "Show me mood tracking",
                "Mental health resources",
                "How to get started",
                "Contact support"
            ]);
            this.showNotification();
        }, 1000);
    }

    // Show notification badge
    showNotification() {
        this.notification.style.display = 'flex';
    }

    // Send user message
    sendMessage() {
        const message = this.chatbotInput.value.trim();
        if (!message) return;

        this.addUserMessage(message);
        this.chatbotInput.value = '';
        
        // Show typing indicator
        this.showTypingIndicator();
        
        // Process message after delay
        setTimeout(() => {
            this.hideTypingIndicator();
            this.processMessage(message);
        }, 1000 + Math.random() * 1000);
    }

    // Add user message to chat
    addUserMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message user';
        messageElement.innerHTML = `
            <div class="message-content">${message}</div>
        `;
        this.chatbotMessages.appendChild(messageElement);
        this.scrollToBottom();
    }

    // Add bot message to chat
    addBotMessage(message, quickActions = []) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message bot';
        
        let quickActionsHtml = '';
        if (quickActions.length > 0) {
            quickActionsHtml = `
                <div class="quick-actions">
                    ${quickActions.map(action => `<button class="quick-action" onclick="mindspaceChatbot.handleQuickAction('${action}')">${action}</button>`).join('')}
                </div>
            `;
        }
        
        messageElement.innerHTML = `
            <img src="images/chatbot.gif" alt="Assistant" class="message-avatar">
            <div class="message-content">
                ${message}
                ${quickActionsHtml}
            </div>
        `;
        
        this.chatbotMessages.appendChild(messageElement);
        this.scrollToBottom();
    }

    // Handle quick action clicks
    handleQuickAction(action) {
        this.addUserMessage(action);
        
        // Show typing indicator
        this.showTypingIndicator();
        
        setTimeout(() => {
            this.hideTypingIndicator();
            this.processMessage(action);
        }, 800);
    }

    // Process user message and generate response
    processMessage(message) {
        const lowerMessage = message.toLowerCase();
        let response = '';
        let quickActions = [];

        // Mood tracking related
        if (lowerMessage.includes('mood') || lowerMessage.includes('track') || lowerMessage.includes('emotion')) {
            response = "🎯 Great! Mood tracking is one of our key features. You can track your daily emotions, see patterns, and get insights. Would you like me to take you to the mood tracker?";
            quickActions = ["Take me to mood tracker", "How does mood tracking work?", "What are the benefits?"];
        }
        
        // Mental health resources
        else if (lowerMessage.includes('resource') || lowerMessage.includes('video') || lowerMessage.includes('audio') || lowerMessage.includes('guide')) {
            response = "📚 We have comprehensive mental health resources including videos, calming audio, self-help guides, books, and inspirational quotes. What type of resource interests you most?";
            quickActions = ["Show videos", "Calming audio", "Self-help guides", "View all resources"];
        }
        
        // Getting started
        else if (lowerMessage.includes('start') || lowerMessage.includes('begin') || lowerMessage.includes('new') || lowerMessage.includes('how')) {
            response = "🚀 Welcome to MindSpace! Here's how to get started:<br><br>1. Create an account or log in<br>2. Complete your profile<br>3. Start tracking your mood<br>4. Explore our resources<br><br>Ready to begin your wellness journey?";
            quickActions = ["Sign up now", "Learn more", "View features"];
        }
        
        // Contact and support
        else if (lowerMessage.includes('contact') || lowerMessage.includes('support') || lowerMessage.includes('help') || lowerMessage.includes('talk')) {
            response = "📞 I'm here to help! For additional support, you can:<br><br>• Email: support@mindspace.edu<br>• Helpline: 1800-123-4567<br>• Or continue chatting with me<br><br>What specific help do you need?";
            quickActions = ["Technical issue", "Mental health emergency", "General question"];
        }
        
        // About MindSpace
        else if (lowerMessage.includes('about') || lowerMessage.includes('mindspace') || lowerMessage.includes('what is')) {
            response = "🧠 MindSpace is a comprehensive mental health platform for students. We provide mood tracking, counseling resources, peer support, and educational content to support your mental wellness journey.";
            quickActions = ["Learn more about us", "View our services", "See statistics"];
        }
        
        // Navigation help
        else if (lowerMessage.includes('navigate') || lowerMessage.includes('find') || lowerMessage.includes('where')) {
            response = "🧭 I can help you navigate our website! Here are the main sections:";
            quickActions = ["Home", "About", "Services", "Resources", "Statistics", "Dashboard"];
        }
        
        // Counseling and therapy
        else if (lowerMessage.includes('counsel') || lowerMessage.includes('therapy') || lowerMessage.includes('therapist') || lowerMessage.includes('session')) {
            response = "👨‍⚕️ We offer confidential counseling services. You can book appointments with campus counselors or mental health professionals through our platform. All sessions are private and secure.";
            quickActions = ["Book counseling", "Learn about counselors", "View appointment types"];
        }
        
        // Crisis or emergency
        else if (lowerMessage.includes('crisis') || lowerMessage.includes('emergency') || lowerMessage.includes('urgent') || lowerMessage.includes('suicide')) {
            response = "🚨 If you're experiencing a mental health crisis, please reach out for immediate help:<br><br>• National Suicide Prevention: 988<br>• Crisis Text Line: Text HOME to 741741<br>• Emergency Services: 911<br><br>You're not alone, and help is available 24/7.";
            quickActions = ["More crisis resources", "Find local help", "Talk to someone now"];
        }
        
        // Statistics and data
        else if (lowerMessage.includes('statistic') || lowerMessage.includes('data') || lowerMessage.includes('number')) {
            response = "📊 Our statistics show mental health trends across India. We serve 500+ institutions, have conducted 10K+ counseling sessions, and work with 200+ volunteers across 28 states.";
            quickActions = ["View full statistics", "State-wise data", "Learn more"];
        }
        
        // Default response
        else {
            response = "🤔 I understand you're looking for information. I can help you with:<br><br>• Mood tracking and wellness tools<br>• Mental health resources<br>• Website navigation<br>• Counseling services<br>• Contact information<br><br>What would you like to know more about?";
            quickActions = ["Mood tracking", "Resources", "Counseling", "Contact us"];
        }

        this.addBotMessage(response, quickActions);
    }

    // Show typing indicator
    showTypingIndicator() {
        this.typingIndicator.style.display = 'flex';
        this.scrollToBottom();
    }

    // Hide typing indicator
    hideTypingIndicator() {
        this.typingIndicator.style.display = 'none';
    }

    // Scroll to bottom of messages
    scrollToBottom() {
        setTimeout(() => {
            this.chatbotMessages.scrollTop = this.chatbotMessages.scrollHeight;
        }, 100);
    }

    // Handle page navigation
    navigateToPage(page) {
        const pageMap = {
            'Home': 'index.html',
            'About': '#about',
            'Services': '#services', 
            'Resources': 'resources.html',
            'Statistics': '#statistics',
            'Dashboard': 'dashboard.html',
            'Mood Tracker': 'mood.html',
            'Profile': 'profile.html',
            'Contact': '#contact'
        };

        const url = pageMap[page];
        if (url) {
            if (url.startsWith('#')) {
                // Scroll to section on current page
                const element = document.querySelector(url);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                    this.closeChatbot();
                }
            } else {
                // Navigate to different page
                window.location.href = url;
            }
        }
    }
}

// Initialize chatbot when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if chatbot elements exist
    if (document.getElementById('chatbot-toggle')) {
        window.mindspaceChatbot = new MindSpaceChatbot();
    }
});

// Handle quick actions for navigation
window.handleChatbotNavigation = function(page) {
    window.mindspaceChatbot.navigateToPage(page);
};