document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    const authButtons = document.querySelector('.auth-buttons');
    
    if (hamburger) {
        hamburger.addEventListener('click', function() {
            this.classList.toggle('active');
            
            // Create mobile menu if it doesn't exist
            if (!document.querySelector('.mobile-menu')) {
                const mobileMenu = document.createElement('div');
                mobileMenu.classList.add('mobile-menu');
                
                // Clone nav links
                const navClone = navLinks.cloneNode(true);
                mobileMenu.appendChild(navClone);
                
                // Clone auth buttons
                const authClone = authButtons.cloneNode(true);
                mobileMenu.appendChild(authClone);
                
                // Append to header
                document.querySelector('header').appendChild(mobileMenu);
            }
            
            // Toggle mobile menu
            const mobileMenu = document.querySelector('.mobile-menu');
            if (mobileMenu) {
                mobileMenu.classList.toggle('active');
            }
        });
    }
    
    // Staggered animation for hero section
    const heroElements = document.querySelectorAll('.fade-in');
    heroElements.forEach((element, index) => {
        element.style.animationDelay = `${index * 0.2}s`;
    });
    
    // Scroll animations for service cards
    const serviceCards = document.querySelectorAll('.slide-up');
    
    // Function to check if element is in viewport
    function isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top <= (window.innerHeight || document.documentElement.clientHeight) * 0.8 &&
            rect.bottom >= 0
        );
    }
    
    // Function to animate elements when they're in viewport
    function animateOnScroll() {
        serviceCards.forEach((card, index) => {
            if (isInViewport(card)) {
                setTimeout(() => {
                    card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, index * 100);
            }
        });
    }
    
    // Run animation check on page load
    animateOnScroll();
    
    // Run animation check on scroll
    window.addEventListener('scroll', animateOnScroll);
    
    // Add smooth scrolling for anchor links - IMPROVED VERSION
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Get the target element
            const targetId = this.getAttribute('href');
            const target = document.querySelector(targetId);
            
            if (target) {
                // Get header height for offset
                const header = document.querySelector('header');
                const headerHeight = header ? header.offsetHeight : 0;
                
                // Scroll to target with header offset
                window.scrollTo({
                    top: target.offsetTop - headerHeight - 20, // Additional 20px for padding
                    behavior: 'smooth'
                });
                
                // For mobile menu, close it after clicking
                const mobileMenu = document.querySelector('.mobile-menu');
                const hamburger = document.querySelector('.hamburger');
                
                if (mobileMenu && mobileMenu.classList.contains('active')) {
                    mobileMenu.classList.remove('active');
                    if (hamburger) hamburger.classList.remove('active');
                }
            }
        });
    });
    
    // Add active class to current section in navigation - IMPROVED VERSION
    function setActiveNav() {
        // Get all sections with IDs
        const sections = document.querySelectorAll('section[id]');
        
        // Get all navigation links (both desktop and mobile)
        const allNavLinks = document.querySelectorAll('.nav-links a, .mobile-menu .nav-links a');
        
        // Get current scroll position with offset
        const scrollPosition = window.scrollY + 200; // Adding offset for better detection
        
        // Find the current section
        let currentSection = '';
        
        // Special case for when we're at the top of the page
        if (scrollPosition < 300) {
            currentSection = document.querySelector('section[id]')?.getAttribute('id');
        } else {
            // Find which section is currently in view
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.clientHeight;
                
                if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                    currentSection = section.getAttribute('id');
                }
            });
            
            // If we're at the bottom of the page, use the last section
            if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
                currentSection = sections[sections.length - 1]?.getAttribute('id');
            }
        }
        
        // Update active class on all navigation links
        allNavLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (href === `#${currentSection}`) {
                link.classList.add('active');
            }
        });
    }
    
    // Run setActiveNav on page load and scroll
    setActiveNav(); // Initialize active state
    window.addEventListener('scroll', setActiveNav);
});

// Add CSS styles for mobile menu programmatically
const style = document.createElement('style');
style.textContent = `
    .hamburger.active span:nth-child(1) {
        transform: translateY(8px) rotate(45deg);
    }
    
    .hamburger.active span:nth-child(2) {
        opacity: 0;
    }
    
    .hamburger.active span:nth-child(3) {
        transform: translateY(-8px) rotate(-45deg);
    }
    
    .mobile-menu {
        position: fixed;
        top: 70px;
        left: 0;
        width: 100%;
        background-color: white;
        padding: 20px;
        box-shadow: 0 5px 10px rgba(0,0,0,0.1);
        display: flex;
        flex-direction: column;
        gap: 20px;
        transform: translateY(-100%);
        opacity: 0;
        transition: all 0.3s ease;
        z-index: 99;
    }
    
    .mobile-menu.active {
        transform: translateY(0);
        opacity: 1;
    }
    
    .mobile-menu .nav-links {
        display: flex;
        flex-direction: column;
        gap: 15px;
    }
    
    .mobile-menu .auth-buttons {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
`;
document.head.appendChild(style);

// India Map and Statistics functionality
document.addEventListener('DOMContentLoaded', function() {
    // State data (dummy data for demonstration)
    const stateData = {
        'JK': { students: '2.5 Lakh', stress: '40%', seeking: '15%', counselors: '1:8000' },
        'HP': { students: '1.8 Lakh', stress: '28%', seeking: '22%', counselors: '1:6000' },
        'PB': { students: '7.2 Lakh', stress: '32%', seeking: '18%', counselors: '1:4500' },
        'UK': { students: '2.3 Lakh', stress: '35%', seeking: '20%', counselors: '1:7000' },
        'HR': { students: '5.6 Lakh', stress: '30%', seeking: '25%', counselors: '1:4000' },
        'RJ': { students: '12.5 Lakh', stress: '33%', seeking: '17%', counselors: '1:6500' },
        'UP': { students: '32.8 Lakh', stress: '35%', seeking: '12%', counselors: '1:9000' },
        'BR': { students: '18.5 Lakh', stress: '38%', seeking: '10%', counselors: '1:12000' },
        'SK': { students: '0.3 Lakh', stress: '25%', seeking: '30%', counselors: '1:3000' },
        'AR': { students: '0.5 Lakh', stress: '22%', seeking: '18%', counselors: '1:8000' },
        'NL': { students: '0.4 Lakh', stress: '26%', seeking: '15%', counselors: '1:9000' },
        'MN': { students: '0.7 Lakh', stress: '28%', seeking: '16%', counselors: '1:7500' },
        'MZ': { students: '0.3 Lakh', stress: '24%', seeking: '19%', counselors: '1:6000' },
        'TR': { students: '0.5 Lakh', stress: '27%', seeking: '17%', counselors: '1:8000' },
        'AS': { students: '3.5 Lakh', stress: '29%', seeking: '14%', counselors: '1:7000' },
        'ML': { students: '0.4 Lakh', stress: '26%', seeking: '16%', counselors: '1:8500' },
        'WB': { students: '15.2 Lakh', stress: '32%', seeking: '22%', counselors: '1:5000' },
        'JH': { students: '7.8 Lakh', stress: '34%', seeking: '13%', counselors: '1:9500' },
        'OD': { students: '6.5 Lakh', stress: '31%', seeking: '14%', counselors: '1:8000' },
        'CG': { students: '5.2 Lakh', stress: '30%', seeking: '15%', counselors: '1:7500' },
        'MP': { students: '14.5 Lakh', stress: '33%', seeking: '16%', counselors: '1:7000' },
        'GJ': { students: '16.8 Lakh', stress: '28%', seeking: '24%', counselors: '1:4500' },
        'MH': { students: '28.5 Lakh', stress: '29%', seeking: '26%', counselors: '1:4000' },
        'TS': { students: '8.2 Lakh', stress: '31%', seeking: '23%', counselors: '1:4500' },
        'AP': { students: '12.5 Lakh', stress: '30%', seeking: '21%', counselors: '1:5000' },
        'KA': { students: '18.2 Lakh', stress: '27%', seeking: '28%', counselors: '1:3500' },
        'GA': { students: '0.8 Lakh', stress: '25%', seeking: '32%', counselors: '1:3000' },
        'KL': { students: '9.5 Lakh', stress: '24%', seeking: '35%', counselors: '1:2500' },
        'TN': { students: '22.8 Lakh', stress: '26%', seeking: '30%', counselors: '1:3000' },
        'ALL': { students: '3.85 Crore', stress: '30%', seeking: '20%', counselors: '1:5000' }
    };

    // Add state name mapping
    const stateNames = {
        'JK': 'Jammu and Kashmir',
        'HP': 'Himachal Pradesh',
        'PB': 'Punjab',
        'UK': 'Uttarakhand',
        'HR': 'Haryana',
        'RJ': 'Rajasthan',
        'UP': 'Uttar Pradesh',
        'BR': 'Bihar',
        'SK': 'Sikkim',
        'AR': 'Arunachal Pradesh',
        'NL': 'Nagaland',
        'MN': 'Manipur',
        'MZ': 'Mizoram',
        'TR': 'Tripura',
        'AS': 'Assam',
        'ML': 'Meghalaya',
        'WB': 'West Bengal',
        'JH': 'Jharkhand',
        'OD': 'Odisha',
        'CG': 'Chhattisgarh',
        'MP': 'Madhya Pradesh',
        'GJ': 'Gujarat',
        'MH': 'Maharashtra',
        'TS': 'Telangana',
        'AP': 'Andhra Pradesh',
        'KA': 'Karnataka',
        'GA': 'Goa',
        'KL': 'Kerala',
        'TN': 'Tamil Nadu',
        'ALL': 'All India'
    };

    // Mapping function for SVG IDs to state codes
    function mapSvgIdToStateCode(svgId) {
        // Map SVG IDs to stateData keys
        const stateMapping = {
            'IN-AN': 'AN', // Andaman and Nicobar Islands
            'IN-AP': 'AP', // Andhra Pradesh
            'IN-AR': 'AR', // Arunachal Pradesh
            'IN-AS': 'AS', // Assam
            'IN-BR': 'BR', // Bihar
            'IN-CH': 'CH', // Chandigarh
            'IN-CT': 'CG', // Chhattisgarh
            'IN-DD': 'DD', // Daman and Diu
            'IN-DL': 'DL', // Delhi
            'IN-DN': 'DN', // Dadra and Nagar Haveli
            'IN-GA': 'GA', // Goa
            'IN-GJ': 'GJ', // Gujarat
            'IN-HP': 'HP', // Himachal Pradesh
            'IN-HR': 'HR', // Haryana
            'IN-JH': 'JH', // Jharkhand
            'IN-JK': 'JK', // Jammu and Kashmir
            'IN-KA': 'KA', // Karnataka
            'IN-KL': 'KL', // Kerala
            'IN-LD': 'LD', // Lakshadweep
            'IN-MH': 'MH', // Maharashtra
            'IN-ML': 'ML', // Meghalaya
            'IN-MN': 'MN', // Manipur
            'IN-MP': 'MP', // Madhya Pradesh
            'IN-MZ': 'MZ', // Mizoram
            'IN-NL': 'NL', // Nagaland
            'IN-OR': 'OD', // Odisha
            'IN-PB': 'PB', // Punjab
            'IN-PY': 'PY', // Puducherry
            'IN-RJ': 'RJ', // Rajasthan
            'IN-SK': 'SK', // Sikkim
            'IN-TG': 'TS', // Telangana
            'IN-TN': 'TN', // Tamil Nadu
            'IN-TR': 'TR', // Tripura
            'IN-UP': 'UP', // Uttar Pradesh
            'IN-UT': 'UK', // Uttarakhand
            'IN-WB': 'WB'  // West Bengal
        };
        
        return stateMapping[svgId] || 'ALL'; // Return ALL as default if no mapping found
    }

    // Initialize chart
    let mentalHealthChart;
    function initChart(stateId = 'ALL') {
        const ctx = document.getElementById('mental-health-chart').getContext('2d');
        
        // Get percentage values for chart
        const stressPercentage = parseInt(stateData[stateId].stress);
        const seekingPercentage = parseInt(stateData[stateId].seeking);
        
        // Destroy existing chart if it exists
        if (mentalHealthChart) {
            mentalHealthChart.destroy();
        }
        
        // Create new chart
        mentalHealthChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Students Facing Stress', 'Students Seeking Help', 'Students Not Seeking Help'],
                datasets: [{
                    data: [seekingPercentage, stressPercentage - seekingPercentage, 100 - stressPercentage],
                    backgroundColor: [
                        '#ff2b2bff',
                        '#fbd604ff',
                        '#9be89cff'
                    ],
                    borderColor: '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: {
                                family: 'Poppins',
                                size: 12
                            },
                            padding: 15
                        }
                    }
                }
            }
        });
    }
    
    // Function to update statistics based on selected state
    function updateStatistics(stateId) {
        // Default to 'ALL' if stateId doesn't exist in data
        if (!stateData[stateId]) {
            stateId = 'ALL';
        }
        
        const data = stateData[stateId];
        // Use full state name instead of abbreviation
        const stateName = stateNames[stateId] || 'All India';
        
        // Update title
        document.getElementById('stats-title').textContent = `${stateName} Statistics`;
        
        // Add changing class for animation
        const statElements = [
            document.getElementById('education-stat'),
            document.getElementById('stress-stat'),
            document.getElementById('help-stat'),
            document.getElementById('counselor-stat')
        ];
        
        statElements.forEach(el => {
            if (el) el.classList.add('changing');
        });
        
        // Update statistics with animation
        setTimeout(() => {
            const elements = {
                'education-stat': data.students,
                'stress-stat': `${calculateValue(data.students, data.stress)} (${data.stress})`,
                'help-stat': `${calculateValue(data.students, data.seeking)} (${data.seeking})`,
                'counselor-stat': data.counselors
            };
            
            // Update each element if it exists
            Object.keys(elements).forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = elements[id];
                }
            });
            
            // Remove animation class
            statElements.forEach(el => {
                if (el) el.classList.remove('changing');
            });
            
            // Update chart
            initChart(stateId);
        }, 300);
    }
    
    // Helper function to calculate values based on percentages
    function calculateValue(baseValue, percentage) {
        // Extract numeric part and unit (Lakh or Crore)
        const match = baseValue.match(/^([\d.]+)\s+(Lakh|Crore)$/);
        if (!match) return '0';
        
        const value = parseFloat(match[1]);
        const unit = match[2];
        const percentValue = parseInt(percentage) / 100;
        
        const result = value * percentValue;
        
        // Format the result appropriately
        if (result < 1 && unit === 'Crore') {
            return `${(result * 100).toFixed(1)} Lakh`;
        } else {
            return `${result.toFixed(1)} ${unit}`;
        }
    }

    // Map initialization - consolidate both approaches
    const svgObject = document.getElementById('india-map-object');
    if (svgObject) {
        svgObject.addEventListener('load', function() {
            // Get access to the SVG document
            const svgDoc = svgObject.contentDocument;
            
            // Adjust the viewBox to prevent cutting
            const svg = svgDoc.querySelector('svg');
            if (svg) {
                // Set proper viewBox to prevent cutting
                svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                // Make sure the SVG has a proper viewBox attribute - this may need adjustment based on your SVG
                if (!svg.hasAttribute('viewBox')) {
                    svg.setAttribute('viewBox', '0 0 700 800');
                }
            }
            
            // Get all state paths from the SVG
            const paths = svgDoc.querySelectorAll('path');
            const tooltip = document.getElementById('map-tooltip');
            
            // Track the currently selected state to avoid redundant updates
            let selectedStateId = 'ALL';
            
            // Process each state path
            paths.forEach(path => {
                // Get state ID
                const stateId = path.getAttribute('id') || '';
                
                // Get state name
                const stateName = path.getAttribute('data-name') || path.getAttribute('name') || stateId;
                
                // Set initial styling
                path.style.fill = '#e4e9f2';
                path.style.stroke = '#8da2c6ff';
                path.style.strokeWidth = '0.5';
                path.style.transition = 'fill 0.3s ease';
                path.style.cursor = 'pointer';
                
                // Tooltip functionality
                path.addEventListener('mousemove', (e) => {
                    if (tooltip) {
                        tooltip.textContent = stateName;
                        tooltip.style.display = 'block';
                        
                        // Get position relative to the viewport
                        const rect = svgObject.getBoundingClientRect();
                        tooltip.style.left = `${e.clientX + 10}px`;
                        tooltip.style.top = `${e.clientY + 10}px`;
                    }
                });
                
                path.addEventListener('mouseout', () => {
                    if (tooltip) {
                        tooltip.style.display = 'none';
                    }
                });
                
                // State selection functionality
                path.addEventListener('click', () => {
                    // Get the SVG ID and map it to state code
                    const svgId = path.getAttribute('id') || '';
                    const stateId = mapSvgIdToStateCode(svgId);
                    
                    // Don't update if the same state is clicked again
                    if (selectedStateId === stateId) return;
                    
                    // Save the newly selected state ID
                    selectedStateId = stateId;
                    
                    // Reset all states
                    paths.forEach(p => {
                        // Skip the currently selected state
                        if (p.getAttribute('id') !== svgId) {
                            p.style.fill = '#e4e9f2';
                            p.style.stroke = '#9eb0cfff';
                            p.style.strokeWidth = '0.5';
                        }
                    });
                    
                    // Highlight selected state
                    path.style.fill = '#809bc4ff';
                    path.style.stroke = '#1e5ab6ff';
                    path.style.strokeWidth = '1';
                    
                    // Debug log to verify data
                    console.log('Selected state:', stateId, 'SVG ID:', svgId, 'Data:', stateData[stateId] || 'No data found');
                    
                    // Update statistics with the selected state ID
                    updateStatistics(stateId);
                });
                
                // Add hover effect
                path.addEventListener('mouseover', () => {
                    if (path.style.fill !== '#245bacff') {
                    }
                });
                
                path.addEventListener('mouseout', () => {
                    if (path.style.fill !== '#2d4a76') {
                    }
                });
            });
            
            // Initialize chart with default data
            updateStatistics('ALL');
        });
    }
    
    // Tab functionality for resources section
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(`${tabId}-content`).classList.add('active');
        });
    });
});

// Auth Dialog Functions
function toggleDialog(dialogId, show) {
    const dialog = document.getElementById(dialogId);
    if (show) {
        dialog.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling
        
        // Generate captcha if needed
        if (dialogId === 'login-dialog') {
            generateCaptcha('login-captcha-display');
        } else if (dialogId === 'register-dialog') {
            generateCaptcha('register-captcha-display');
        }
    } else {
        dialog.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
    }
}

function switchDialog(currentDialogId, newDialogId) {
    toggleDialog(currentDialogId, false);
    setTimeout(() => {
        toggleDialog(newDialogId, true);
    }, 300); // Short delay for smooth transition
}

function showForgotPassword() {
    switchDialog('login-dialog', 'forgot-password-dialog');
}

// Captcha generation and validation
function generateCaptcha(displayId) {
    const captchaDisplay = document.getElementById(displayId);
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let captchaText = '';
    
    // Generate random 6-character string
    for (let i = 0; i < 6; i++) {
        captchaText += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    captchaDisplay.textContent = captchaText;
    captchaDisplay.dataset.value = captchaText; // Store for validation
}

function validateCaptcha(displayId, inputId) {
    const captchaDisplay = document.getElementById(displayId);
    const captchaInput = document.getElementById(inputId);
    
    // Check if the entered captcha matches the generated one
    return captchaDisplay.dataset.value === captchaInput.value;
}

// Form Validation Functions
function validateLoginForm(event) {
    event.preventDefault();
    
    // Validate captcha
    if (!validateCaptcha('login-captcha-display', 'login-captcha-input')) {
        alert('Invalid captcha! Please try again.');
        generateCaptcha('login-captcha-display');
        document.getElementById('login-captcha-input').value = '';
        return false;
    }
    
    // Simulate login check (to be replaced with actual backend call)
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    // For demonstration purposes, accept any non-empty values
    if (email && password) {
        alert('Login successful! Redirecting to dashboard...');
        toggleDialog('login-dialog', false);
        // Redirect to dashboard (placeholder)
        // window.location.href = 'dashboard.html';
        return true;
    } else {
        alert('Invalid credentials! Please try again.');
        return false;
    }
}

function validateRegisterForm(event) {
    event.preventDefault();
    
    // Validate captcha
    if (!validateCaptcha('register-captcha-display', 'register-captcha-input')) {
        alert('Invalid captcha! Please try again.');
        generateCaptcha('register-captcha-display');
        document.getElementById('register-captcha-input').value = '';
        return false;
    }
    
    // Validate password match
    const password = document.getElementById('create-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (password !== confirmPassword) {
        alert('Passwords do not match! Please try again.');
        return false;
    }
    
    // Validate form data (more validations can be added)
    const firstName = document.getElementById('first-name').value;
    const lastName = document.getElementById('last-name').value;
    const email = document.getElementById('register-email').value;
    const mobile = document.getElementById('mobile').value;
    const dob = document.getElementById('dob').value;
    
    if (!firstName || !lastName || !email || !mobile || !dob || !password) {
        alert('Please fill in all required fields!');
        return false;
    }
    
    // If all validations pass, show OTP verification dialog
    switchDialog('register-dialog', 'otp-dialog');
    startOTPTimer();
    return false; // Prevent form submission as we're handling it ourselves
}

function handleForgotPassword(event) {
    event.preventDefault();
    const email = document.getElementById('reset-email').value;
    
    if (email) {
        alert(`Password reset link has been sent to ${email}. Please check your email.`);
        toggleDialog('forgot-password-dialog', false);
    } else {
        alert('Please enter a valid email address.');
    }
    
    return false;
}

// OTP Verification Functions
function startOTPTimer() {
    let seconds = 60;
    const timerElement = document.getElementById('timer');
    const resendButton = document.getElementById('resend-otp');
    const timerContainer = document.getElementById('resend-timer');
    
    resendButton.style.display = 'none';
    timerContainer.style.display = 'block';
    
    const interval = setInterval(() => {
        seconds--;
        timerElement.textContent = seconds;
        
        if (seconds <= 0) {
            clearInterval(interval);
            resendButton.style.display = 'inline';
            timerContainer.style.display = 'none';
        }
    }, 1000);
    
    // Set up OTP input auto-focus
    setupOTPInputs();
}

function setupOTPInputs() {
    const otpInputs = document.querySelectorAll('.otp-input');
    
    otpInputs.forEach((input, index) => {
        input.addEventListener('keyup', (e) => {
            // If a digit is entered, move to the next input
            if (e.key >= '0' && e.key <= '9') {
                input.value = e.key;
                if (index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
            }
            // Handle backspace
            else if (e.key === 'Backspace') {
                input.value = '';
                if (index > 0) {
                    otpInputs[index - 1].focus();
                }
            }
        });
        
        // Clear on focus to make entry easier
        input.addEventListener('focus', () => {
            input.select();
        });
    });
    
    // Focus the first input by default
    otpInputs[0].focus();
}

function handleOTPVerification(event) {
    event.preventDefault();
    
    // Get all OTP digits
    const otpInputs = document.querySelectorAll('.otp-input');
    let otp = '';
    
    otpInputs.forEach(input => {
        otp += input.value;
    });
    
    // Check if OTP is complete
    if (otp.length === 6) {
        // For demonstration, accept any 6-digit OTP
        alert('Account created successfully! You can now login.');
        toggleDialog('otp-dialog', false);
    } else {
        alert('Please enter a valid 6-digit OTP.');
    }
    
    return false;
}

// Connect login and register buttons to dialogs
document.addEventListener('DOMContentLoaded', function() {
    // Set up event listeners for login and register buttons
    const loginButtons = document.querySelectorAll('.btn-secondary');
    const registerButtons = document.querySelectorAll('.btn-primary');
    
    loginButtons.forEach(button => {
        if (button.textContent.trim() === 'Login') {
            button.addEventListener('click', () => toggleDialog('login-dialog', true));
        }
    });
    
    registerButtons.forEach(button => {
        if (button.textContent.trim() === 'Register') {
            button.addEventListener('click', () => toggleDialog('register-dialog', true));
        }
    });
    
    // Set up OTP resend button
    const resendOTP = document.getElementById('resend-otp');
    if (resendOTP) {
        resendOTP.addEventListener('click', (e) => {
            e.preventDefault();
            alert('New OTP has been sent!');
            startOTPTimer();
        });
    }
});
