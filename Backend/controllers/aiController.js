const Conversation = require('../models/Conversation');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Safety filter keywords
const EMERGENCY_KEYWORDS = [
  'suicide', 'kill myself', 'end my life', 'want to die', 'self harm', 'hurt myself',
  'cut myself', 'overdose', 'jump off', 'hang myself', 'not worth living',
  'better off dead', 'end it all', 'can\'t go on', 'taking my life'
];

const HARMFUL_CONTENT = [
  'violence', 'self-medication', 'illegal drugs', 'alcohol abuse'
];

// Initialize Google Generative AI (Gemini)
let genAI = null;
let aiInitialized = false;

// Function to initialize AI service with better error handling
function initializeAI() {
  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    
    console.log('Checking Google AI API Key...');
    console.log('API Key exists:', !!apiKey);
    console.log('API Key length:', apiKey ? apiKey.length : 0);
    console.log('API Key preview:', apiKey ? `${apiKey.substring(0, 10)}...` : 'No key found');
    
    if (!apiKey) {
      console.warn('🚨 No Google AI API key provided. AI responses will use fallback mode.');
      return false;
    }
    
    if (apiKey.length < 30) {
      console.warn('🚨 Google AI API key seems too short. Please check your .env file.');
      return false;
    }
    
    genAI = new GoogleGenerativeAI(apiKey);
    console.log('✅ Google AI initialized successfully with API key');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Google AI:', error.message);
    return false;
  }
}

// Initialize on startup
aiInitialized = initializeAI();

// @desc    Generate AI chat response
// @route   POST /api/ai/chat
// @access  Private
const generateChatResponse = async (req, res) => {
  try {
    const { message, context, mood } = req.body;
    const userId = req.user.id;

    console.log('AI Chat Request:', { userId, message, mood: mood?.label });

    // Validate input
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    // Check for emergency keywords first
    if (checkEmergencyKeywords(message)) {
      const emergencyResponse = getEmergencyResponse();
      
      // Save conversation
      await saveConversation(userId, message, emergencyResponse, 'emergency');
      
      return res.status(200).json({
        success: true,
        response: emergencyResponse,
        type: 'emergency'
      });
    }

    // Prepare context for AI
    const aiContext = prepareAIContext(message, context, mood);
    
    // Generate response using Google Gemini AI
    let aiResponse;
    try {
      console.log('Generating AI response with Gemini...');
      aiResponse = await generateGeminiResponse(aiContext, message);
      console.log('AI response generated successfully');
    } catch (aiError) {
      console.error('Gemini API Error:', aiError);
      // Fallback to rule-based response if AI fails
      aiResponse = generateFallbackResponse(message, mood);
      console.log('Using fallback response due to AI error');
    }

    // Apply safety filters
    const safeResponse = applySafetyFilters(aiResponse);
    
    // Save conversation
    await saveConversation(userId, message, safeResponse, 'normal');
    
    res.status(200).json({
      success: true,
      response: safeResponse,
      type: 'normal',
      mood: mood?.label || null,
      aiGenerated: true
    });

  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate response',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get conversation history
// @route   GET /api/ai/conversation
// @access  Private
const getConversationHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    
    const conversations = await Conversation.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('userMessage aiResponse type createdAt');
    
    res.status(200).json({
      success: true,
      conversations: conversations.reverse() // Return in chronological order
    });

  } catch (error) {
    console.error('Get Conversation Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve conversation history'
    });
  }
};

// @desc    Clear conversation history
// @route   DELETE /api/ai/conversation
// @access  Private
const clearConversationHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    
    await Conversation.deleteMany({ user: userId });
    
    res.status(200).json({
      success: true,
      message: 'Conversation history cleared successfully'
    });

  } catch (error) {
    console.error('Clear Conversation Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear conversation history'
    });
  }
};

// Helper Functions

function checkEmergencyKeywords(message) {
  const lowerMessage = message.toLowerCase();
  return EMERGENCY_KEYWORDS.some(keyword => lowerMessage.includes(keyword));
}

function getEmergencyResponse() {
  return `I'm very concerned about what you've shared. Your life has value and there are people who want to help you right now.

**Immediate Support:**
• **Crisis Helpline: 9152987821** (Available 24/7)
• **Emergency Services: 100**
• **AASRA: 022-27546669** (24x7 Suicide Prevention)

Please reach out to someone you trust or use one of these resources immediately. You are not alone, and there are people who care about you and want to help.

If you're in immediate danger, please call emergency services or go to your nearest hospital emergency room.`;
}

function prepareAIContext(message, context, mood) {
  let aiContext = `You are MindSpace AI Assistant, a supportive mental health companion specifically designed for students. Your role is to provide empathetic, non-judgmental, and helpful support.

CORE GUIDELINES:
- Be warm, empathetic, understanding, and genuinely caring
- Use a conversational, friendly tone like talking to a friend
- Provide practical coping strategies and emotional support
- Keep responses between 80-150 words for better readability
- Be encouraging and motivational while remaining realistic
- Acknowledge the user's feelings as valid and important

IMPORTANT RESTRICTIONS:
- Never diagnose mental health conditions
- Don't prescribe medications or provide medical advice
- Avoid clinical terminology - keep it conversational
- Don't make promises you can't keep
- If someone seems in crisis, gently encourage professional help

RESPONSE STYLE:
- Start with empathy and acknowledgment
- Provide 1-2 practical suggestions or coping strategies
- End with encouragement or a supportive question
- Use inclusive, supportive language
- Be natural and human-like in your responses

`;

  // Add mood context if available
  if (mood && mood.label) {
    const moodContexts = {
      'Happy': 'The user is currently feeling happy. Help them maintain this positive state and build on it.',
      'Sad': 'The user is feeling sad. Be especially gentle, validating, and offer comfort along with gentle suggestions.',
      'Angry': 'The user is feeling angry. Help them process these feelings constructively and find healthy outlets.',
      'Fear': 'The user is experiencing fear or anxiety. Focus on grounding techniques and reassurance.',
      'Surprise': 'The user is feeling surprised. Help them process unexpected emotions or situations.',
      'Disgust': 'The user may be feeling overwhelmed or frustrated. Offer understanding and coping strategies.',
      'Neutral': 'The user seems to be in a balanced emotional state. Provide supportive guidance as needed.'
    };
    
    aiContext += `\nCURRENT EMOTIONAL STATE: ${mood.label}\n`;
    aiContext += `Context: ${moodContexts[mood.label] || 'Provide appropriate emotional support based on their current state.'}\n`;
    aiContext += `Detected: ${new Date(mood.createdAt).toLocaleString()}\n`;
  }

  // Add conversation context if provided
  if (context && context.trim()) {
    aiContext += `\nPREVIOUS CONTEXT: ${context}\n`;
  }

  aiContext += `\nUSER'S MESSAGE: "${message}"\n\nProvide a supportive, empathetic response that helps the user feel heard and supported:`;
  
  return aiContext;
}

async function generateGeminiResponse(context, message) {
  // Check if AI is properly initialized
  if (!aiInitialized || !genAI) {
    throw new Error('Google AI service not available - invalid or missing API key');
  }

  try {
    console.log('Initializing Gemini model...');
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash", // Updated model name
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.8,
        maxOutputTokens: 200,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    });
    
    console.log('Sending request to Gemini API...');
    const result = await model.generateContent(context);
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Gemini API response received, length:', text?.length);
    
    if (text && text.trim()) {
      return text.trim();
    } else {
      throw new Error('Empty response from Gemini API');
    }
  } catch (error) {
    console.error('❌ Gemini API Error Details:', {
      message: error.message,
      status: error.status,
      statusText: error.statusText
    });
    
    // Check for specific API key errors
    if (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID')) {
      console.error('🔑 INVALID API KEY: Please check your Google AI API key in .env file');
      console.error('💡 Get a new API key from: https://makersuite.google.com/app/apikey');
    }
    
    // Check for model availability errors
    if (error.message.includes('not found') || error.message.includes('not supported')) {
      console.error('🤖 MODEL ERROR: Trying alternative model...');
      
      // Try with gemini-1.5-pro as fallback
      try {
        console.log('Trying gemini-1.5-pro model...');
        const fallbackModel = genAI.getGenerativeModel({ 
          model: "gemini-1.5-pro",
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.8,
            maxOutputTokens: 200,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        });
        
        const fallbackResult = await fallbackModel.generateContent(context);
        const fallbackResponse = await fallbackResult.response;
        const fallbackText = fallbackResponse.text();
        
        if (fallbackText && fallbackText.trim()) {
          console.log('✅ Fallback model response received');
          return fallbackText.trim();
        }
      } catch (fallbackError) {
        console.error('❌ Fallback model also failed:', fallbackError.message);
      }
    }
    
    throw error;
  }
}

function generateFallbackResponse(message, mood) {
  const lowerMessage = message.toLowerCase();
  
  // Mood-based responses
  if (mood && mood.label) {
    switch (mood.label.toLowerCase()) {
      case 'sad':
        return "I understand you're feeling sad right now. These feelings are valid and temporary. Consider talking to someone you trust, doing something that brings you comfort, or engaging in gentle physical activity. Remember, this feeling will pass. What usually helps you feel better when you're sad?";
      
      case 'angry':
        return "I can sense you're feeling angry. That's a natural emotion. Try taking deep breaths, going for a walk, or writing down your thoughts. Physical exercise can help release that energy. What's causing you to feel this way?";
      
      case 'fear':
      case 'anxious':
        return "Anxiety can feel overwhelming, but you're not alone. Try the 4-7-8 breathing technique: breathe in for 4, hold for 7, exhale for 8. Ground yourself by naming 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste. What's making you feel anxious?";
      
      case 'happy':
        return "It's wonderful that you're feeling good! I notice you mentioned feeling anxious despite being in a happy mood - sometimes we can feel multiple emotions at once, and that's completely normal. Try some deep breathing exercises or grounding techniques. Would you like to share what's causing the anxiety?";
      
      default:
        return "Thank you for sharing with me. I'm here to listen and support you. Whatever you're going through, your feelings are valid. Sometimes talking helps us process our emotions better. What would you like to talk about?";
    }
  }

  // Keyword-based responses for anxiety and overwhelm
  if (lowerMessage.includes('anxious') || lowerMessage.includes('anxiety')) {
    return "I hear that you're feeling anxious, and I want you to know that these feelings are completely valid. Anxiety can be overwhelming, but there are effective ways to manage it. Try some deep breathing exercises - breathe in for 4 counts, hold for 4, and exhale for 4. Grounding techniques can also help: name 5 things you can see, 4 you can touch, 3 you can hear. What's been contributing to your anxiety lately?";
  }

  if (lowerMessage.includes('overwhelm') || lowerMessage.includes('stressed')) {
    return "Feeling overwhelmed is really tough, and I'm glad you're reaching out. When everything feels like too much, try breaking things down into smaller, manageable pieces. Focus on just the next small step you can take. Remember to breathe deeply and give yourself permission to take breaks. You don't have to handle everything at once. What's been the biggest source of stress for you recently?";
  }

  if (lowerMessage.includes('lonely') || lowerMessage.includes('alone')) {
    return "Feeling lonely is difficult, but you're not alone in experiencing this. Consider reaching out to friends, family, or joining activities that interest you. Sometimes even small social interactions can help. Is there someone you feel comfortable talking to?";
  }

  if (lowerMessage.includes('study') || lowerMessage.includes('exam') || lowerMessage.includes('academic')) {
    return "Academic pressure is real and challenging. Try creating a study schedule, taking regular breaks, and using techniques like the Pomodoro method. Remember, your worth isn't defined by grades. What specific academic challenge are you facing?";
  }

  // General supportive response
  const supportiveResponses = [
    "I hear you, and I'm here to support you. Your feelings are valid, and reaching out shows strength. When we're feeling anxious and overwhelmed, it can help to focus on what we can control right now. What's been weighing on your mind the most?",
    "Thank you for trusting me with your thoughts. Feeling anxious and overwhelmed is really challenging, but you're taking a positive step by talking about it. Sometimes just expressing these feelings can provide some relief. What would be most helpful for you right now?",
    "I understand this might be a difficult time for you. Anxiety and feeling overwhelmed are common experiences, especially for students. You're not alone in this. Consider practicing some mindfulness or reaching out to someone you trust. What's been the main source of these feelings?",
    "Your wellbeing matters, and I'm glad you're here to talk. When anxiety and overwhelm hit, it's important to be gentle with yourself. Try to focus on your breathing and remember that these intense feelings will pass. What specific situation is making you feel this way?"
  ];
  
  return supportiveResponses[Math.floor(Math.random() * supportiveResponses.length)];
}

function applySafetyFilters(response) {
  // Check for harmful content
  const lowerResponse = response.toLowerCase();
  
  // Filter out medical diagnoses
  const medicalTerms = ['diagnose', 'diagnosis', 'disorder', 'medication', 'prescription', 'cure', 'treatment'];
  const containsMedical = medicalTerms.some(term => lowerResponse.includes(term));
  
  if (containsMedical) {
    return "I understand you're looking for help, but I can't provide medical advice or diagnoses. I encourage you to speak with a healthcare professional, counselor, or trusted adult who can provide proper guidance. In the meantime, I'm here to listen and offer emotional support.";
  }

  // Filter harmful content
  const containsHarmful = HARMFUL_CONTENT.some(term => lowerResponse.includes(term));
  
  if (containsHarmful) {
    return "I want to make sure I'm providing you with safe and helpful support. Sometimes it's best to talk with a trained counselor who can provide more specific guidance. I'm here to listen and offer emotional support in the meantime.";
  }

  return response;
}

async function saveConversation(userId, userMessage, aiResponse, type = 'normal') {
  try {
    const conversation = new Conversation({
      user: userId,
      userMessage,
      aiResponse,
      type,
      metadata: {
        timestamp: new Date(),
        responseLength: aiResponse.length
      }
    });
    
    await conversation.save();
    console.log('Conversation saved successfully');
  } catch (error) {
    console.error('Save Conversation Error:', error);
  }
}

module.exports = {
  generateChatResponse,
  getConversationHistory,
  clearConversationHistory
};
