# MindSpace Chatbot - Setup Guide

## Overview
This is a FREE, fully functional chatbot widget for the MindSpace website that appears in the bottom-right corner. The chatbot helps users navigate the website, find resources, and get information about mental health services.

## Features
✅ **Free to use** - No external API costs
✅ **Website Navigation** - Helps users find pages and sections
✅ **Resource Suggestions** - Recommends videos, audio, guides from the site
✅ **Mental Health Support** - Provides information about counseling and crisis resources
✅ **Interactive UI** - Animated typing indicators, quick action buttons
✅ **Mobile Responsive** - Works on all device sizes
✅ **Easy Customization** - Simple to modify responses and styling

## Files Added/Modified

### 1. CSS Styles (`css/styles.css`)
- Added comprehensive chatbot widget styles
- Responsive design for mobile and desktop
- Smooth animations and hover effects

### 2. JavaScript (`js/chatbot.js`)
- Complete chatbot functionality
- Message processing and responses
- Navigation helpers
- Crisis support detection

### 3. HTML Widget (`index.html`)
- Chatbot widget structure
- Uses `images/chatbot.gif` for avatar
- Includes notification badge

## Setup Instructions

### Step 1: File Structure
Make sure you have these files in your project:
```
Frontend/
├── css/styles.css (✅ Updated)
├── js/chatbot.js (✅ Created)
├── index.html (✅ Updated)
└── images/chatbot.gif (⚠️ Required)
```

### Step 2: Add Chatbot Image
Place your `chatbot.gif` file in the `images/` folder. The chatbot will use this image for:
- Toggle button in bottom-right corner
- Avatar in chat header
- Message avatars for bot responses

### Step 3: Customize Responses (Optional)
Edit `js/chatbot.js` to customize:

**Add new keywords and responses:**
```javascript
// In the processMessage() function, add new conditions:
else if (lowerMessage.includes('your-keyword')) {
    response = "Your custom response here";
    quickActions = ["Action 1", "Action 2", "Action 3"];
}
```

**Modify existing responses:**
```javascript
// Find existing conditions and update the response text
if (lowerMessage.includes('mood')) {
    response = "Your updated mood tracking response";
}
```

### Step 4: Test the Chatbot
1. Open your website in a browser
2. Look for the chatbot icon in the bottom-right corner
3. Click to open the chat widget
4. Try these test messages:
   - "How do I track my mood?"
   - "Show me resources"
   - "I need help"
   - "Contact support"

## Customization Options

### 1. Change Colors
In `css/styles.css`, modify the CSS variables:
```css
:root {
    --primary-color: #4073c0; /* Change this for different theme */
    --accent-color: #5e60ce;   /* Secondary color */
}
```

### 2. Add New Quick Actions
In `js/chatbot.js`, add buttons to any response:
```javascript
quickActions = ["New Action", "Another Action", "Third Action"];
```

### 3. Modify Welcome Message
In the `addWelcomeMessage()` function:
```javascript
this.addBotMessage("Your custom welcome message here!", [
    "Custom action 1",
    "Custom action 2"
]);
```

### 4. Add Page Navigation
Update the `pageMap` object in `navigateToPage()` function:
```javascript
const pageMap = {
    'New Page': 'new-page.html',
    'Custom Section': '#custom-section'
};
```

## Advanced Features

### 1. Crisis Detection
The chatbot automatically detects crisis-related keywords and provides emergency resources:
- `crisis`, `emergency`, `urgent`, `suicide`
- Responds with helpline numbers and resources

### 2. Smart Routing
- Detects page navigation requests
- Scrolls to sections on the same page
- Redirects to different pages when needed

### 3. Resource Recommendations
- Suggests videos, audio, guides based on user input
- Links to appropriate sections of the website

## Mobile Optimization
The chatbot is fully responsive:
- Adjusts size on smaller screens
- Touch-friendly buttons
- Maintains usability on mobile devices

## Browser Compatibility
✅ Chrome, Firefox, Safari, Edge (modern versions)
✅ Mobile browsers (iOS Safari, Chrome Mobile)
✅ No external dependencies except Font Awesome icons

## Troubleshooting

### Issue: Chatbot doesn't appear
- Check if `images/chatbot.gif` exists
- Verify `js/chatbot.js` is included in your HTML
- Check browser console for JavaScript errors

### Issue: Styling looks wrong
- Ensure `css/styles.css` includes the chatbot styles
- Check for CSS conflicts with existing styles
- Verify CSS variables are defined

### Issue: Messages not working
- Check browser console for errors
- Verify the chatbot initialization code runs
- Test with simple keywords first

## Cost Breakdown
🎉 **Total Cost: $0 (FREE)**
- No API subscriptions required
- No external service dependencies
- No monthly fees
- Host on your own server

## Future Enhancements
You can easily add:
- Integration with your backend for dynamic responses
- User session tracking
- Analytics tracking
- Multi-language support
- Voice input/output
- Integration with your customer support system

## Support
If you need help customizing the chatbot:
1. Check the browser console for errors
2. Review the code comments in `js/chatbot.js`
3. Test individual features step by step
4. Modify responses gradually to avoid breaking functionality

The chatbot is now ready to help your users navigate MindSpace and access mental health resources! 🚀