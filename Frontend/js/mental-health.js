document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        window.location.href = 'index.html';
        return;
    }

    // Initialize variables
    let currentStep = 1;
    let totalSteps = 4;
    let formData = {
        vitals: {},
        lifestyle: {},
        dass21: {},
        gad7: {},
        phq9: {}
    };

    // Add module progress state
    let moduleProgress = {
        vitals: null,
        dass21: null,
        gad7: null,
        phq9: null
    };

    // DOM elements
    const prerequisitesCheck = document.getElementById('prerequisites-check');
    const analysisForm = document.getElementById('analysis-form');
    const reportContainer = document.getElementById('report-container');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-btn');

    // API configuration
    const apiConfig = {
        backendApiUrl: window.ENV_CONFIG?.backendApiUrl || 'http://localhost:5001'
    };

    // Headers for API requests
    const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
    };

    // Initialize page
    initializePage();

    async function initializePage() {
        updateUserProfile();
        setupEventListeners();
        await checkPrerequisites();
        await loadModuleProgress();
        loadQuestionnaires();
    }

    function updateUserProfile() {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        if (userData) {
            const initials = ((userData.firstName || '').charAt(0) + (userData.lastName || '').charAt(0)).toUpperCase();
            document.getElementById('header-username').textContent = userData.firstName || 'User';
            document.getElementById('header-avatar').textContent = initials || 'U';
        }
        setupProfileDropdown();
    }

    function setupProfileDropdown() {
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
                showSuccess('Logged out successfully!');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            });
        }
    }

    function setupEventListeners() {
        // Mood tracker button
        const moodTrackerBtn = document.querySelector('.mood-tracker-btn');
        if (moodTrackerBtn) {
            moodTrackerBtn.addEventListener('click', () => {
                window.location.href = 'mood.html';
            });
        }

        // Navigation buttons
        prevBtn.addEventListener('click', () => navigateStep(-1));
        nextBtn.addEventListener('click', () => navigateStep(1));
        submitBtn.addEventListener('click', handleSubmit);
    }

    async function checkPrerequisites() {
        const content = document.getElementById('prerequisites-content');
        
        // Add prerequisites-content div if it doesn't exist
        if (!content) {
            prerequisitesCheck.innerHTML = '<div id="prerequisites-content"></div>';
        }
        
        const contentDiv = document.getElementById('prerequisites-content') || prerequisitesCheck;
        contentDiv.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Checking requirements...</div>';

        let allChecksPassed = true;
        let checksHtml = '';

        try {
            // Check profile completion
            console.log('Checking profile completion...');
            const profileResponse = await fetch(`${apiConfig.backendApiUrl}/api/user/profile/completion`, {
                method: 'GET',
                headers
            });

            console.log('Profile response status:', profileResponse.status);

            if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                console.log('Profile completion data:', profileData);
                
                if (profileData.success) {
                    if (profileData.isComplete) {
                        checksHtml += `<div class="prerequisite success">
                            <i class="fas fa-check-circle"></i>
                            <span>Profile is complete (${profileData.completionPercentage}%)</span>
                        </div>`;
                    } else {
                        allChecksPassed = false;
                        const percentage = profileData.completionPercentage || 0;
                        const missingCount = profileData.totalFields - profileData.completedFields || 0;
                        
                        checksHtml += `<div class="prerequisite error">
                            <i class="fas fa-exclamation-circle"></i>
                            <span>Profile is incomplete (${percentage}% complete, ${missingCount} fields missing). 
                            <button class="prerequisite-action-btn" onclick="window.location.href='profile.html'">
                                <i class="fas fa-user-edit"></i> Complete Profile
                            </button></span>
                        </div>`;
                    }
                } else {
                    allChecksPassed = false;
                    checksHtml += `<div class="prerequisite error">
                        <i class="fas fa-times-circle"></i>
                        <span>Unable to check profile status: ${profileData.message || 'Unknown error'}</span>
                    </div>`;
                }
            } else {
                allChecksPassed = false;
                const errorText = await profileResponse.text();
                console.error('Profile check failed:', errorText);
                checksHtml += `<div class="prerequisite error">
                    <i class="fas fa-times-circle"></i>
                    <span>Unable to check profile status (${profileResponse.status}). Please try again.</span>
                </div>`;
            }

            // Check recent mood
            console.log('Checking recent mood...');
            const moodResponse = await fetch(`${apiConfig.backendApiUrl}/api/mood/recent`, {
                method: 'GET',
                headers
            });

            console.log('Mood response status:', moodResponse.status);

            if (moodResponse.ok) {
                const moodData = await moodResponse.json();
                console.log('Mood data:', moodData);
                
                if (moodData.success) {
                    if (moodData.isRecent) {
                        checksHtml += `<div class="prerequisite success">
                            <i class="fas fa-check-circle"></i>
                            <span>Recent mood tracked: ${moodData.data.label}</span>
                        </div>`;
                    } else {
                        allChecksPassed = false;
                        checksHtml += `<div class="prerequisite error">
                            <i class="fas fa-exclamation-circle"></i>
                            <span>No recent mood tracked (within 2 hours). 
                            <button class="prerequisite-action-btn" onclick="window.location.href='mood.html'">
                                <i class="fas fa-chart-line"></i> Track Your Mood
                            </button></span>
                        </div>`;
                    }
                } else {
                    allChecksPassed = false;
                    checksHtml += `<div class="prerequisite error">
                        <i class="fas fa-times-circle"></i>
                        <span>Unable to check mood status: ${moodData.message || 'Unknown error'}</span>
                    </div>`;
                }
            } else {
                allChecksPassed = false;
                const errorText = await moodResponse.text();
                console.error('Mood check failed:', errorText);
                checksHtml += `<div class="prerequisite error">
                    <i class="fas fa-times-circle"></i>
                    <span>Unable to check mood status (${moodResponse.status}). Please try again.</span>
                </div>`;
            }

        } catch (error) {
            console.error('Error checking prerequisites:', error);
            allChecksPassed = false;
            checksHtml += `<div class="prerequisite error">
                <i class="fas fa-times-circle"></i>
                <span>Network error: ${error.message}. Please check your connection and try again.</span>
            </div>`;
        }

        contentDiv.innerHTML = checksHtml;

        if (allChecksPassed) {
            setTimeout(() => {
                prerequisitesCheck.style.display = 'none';
                analysisForm.style.display = 'block';
                // Initialize the first step
                loadVitalsForm();
            }, 2000);
        } else {
            // Add retry button for failed checks
            setTimeout(() => {
                const retryBtn = document.createElement('button');
                retryBtn.className = 'btn-primary';
                retryBtn.innerHTML = '<i class="fas fa-redo"></i> Retry Check';
                retryBtn.style.marginTop = '20px';
                retryBtn.onclick = () => checkPrerequisites();
                contentDiv.appendChild(retryBtn);
            }, 1000);
        }
    }

    function loadVitalsForm() {
        const step1Container = document.querySelector('.analysis-step[data-step="1"]');
        step1Container.innerHTML = `
            <h2><i class="fas fa-heartbeat"></i> Step 1: Health Vitals & Lifestyle</h2>
            <p class="step-description">Please provide your current health information for a comprehensive analysis.</p>
            
            <div class="form-grid">
                <div class="form-group">
                    <label for="systolic"><i class="fas fa-heart"></i> Systolic Blood Pressure (mmHg)</label>
                    <input type="number" id="systolic" class="form-input" placeholder="e.g., 120" min="70" max="200" required>
                </div>
                
                <div class="form-group">
                    <label for="diastolic"><i class="fas fa-heart"></i> Diastolic Blood Pressure (mmHg)</label>
                    <input type="number" id="diastolic" class="form-input" placeholder="e.g., 80" min="40" max="120" required>
                </div>
                
                <div class="form-group">
                    <label for="heart-rate"><i class="fas fa-heartbeat"></i> Heart Rate (BPM)</label>
                    <input type="number" id="heart-rate" class="form-input" placeholder="e.g., 72" min="40" max="200" required>
                </div>
                
                <div class="form-group">
                    <label for="sleep-duration"><i class="fas fa-bed"></i> Average Sleep Duration (hours)</label>
                    <input type="number" id="sleep-duration" class="form-input" placeholder="e.g., 7" min="0" max="24" step="0.5" required>
                </div>
                
                <div class="form-group">
                    <label for="temperature"><i class="fas fa-thermometer-half"></i> Body Temperature (°F) - Optional</label>
                    <input type="number" id="temperature" class="form-input" placeholder="e.g., 98.6" min="95" max="110" step="0.1">
                </div>
                
                <div class="form-group">
                    <label for="exercise-frequency"><i class="fas fa-running"></i> Exercise Frequency</label>
                    <select id="exercise-frequency" class="form-input" required>
                        <option value="">Select frequency</option>
                        <option value="never">Never</option>
                        <option value="rarely">Rarely (1-2 times/month)</option>
                        <option value="sometimes">Sometimes (1-2 times/week)</option>
                        <option value="often">Often (3-4 times/week)</option>
                        <option value="daily">Daily</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="smoking-status"><i class="fas fa-smoking-ban"></i> Smoking Status</label>
                    <select id="smoking-status" class="form-input" required>
                        <option value="">Select status</option>
                        <option value="never">Never smoked</option>
                        <option value="former">Former smoker</option>
                        <option value="current">Current smoker</option>
                        <option value="occasional">Occasional smoker</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="alcohol-consumption"><i class="fas fa-wine-glass"></i> Alcohol Consumption</label>
                    <select id="alcohol-consumption" class="form-input" required>
                        <option value="">Select frequency</option>
                        <option value="never">Never</option>
                        <option value="rarely">Rarely</option>
                        <option value="occasionally">Occasionally</option>
                        <option value="regularly">Regularly</option>
                        <option value="daily">Daily</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="screen-time"><i class="fas fa-mobile-alt"></i> Daily Screen Time (hours) - Optional</label>
                    <input type="number" id="screen-time" class="form-input" placeholder="e.g., 8" min="0" max="24" step="0.5">
                </div>
                
                <div class="form-group">
                    <label for="chronic-conditions"><i class="fas fa-notes-medical"></i> Chronic Health Conditions</label>
                    <textarea id="chronic-conditions" class="form-input" placeholder="List any chronic conditions or 'None'" rows="3"></textarea>
                </div>
                
                <div class="form-group">
                    <label for="medications"><i class="fas fa-pills"></i> Current Medications</label>
                    <textarea id="medications" class="form-input" placeholder="List current medications or 'None'" rows="3"></textarea>
                </div>
            </div>
        `;
    }

    function loadQuestionnaires() {
        loadDASS21Questions();
        loadGAD7Questions();
        loadPHQ9Questions();
    }

    function loadDASS21Questions() {
        const questions = [
            "I found it hard to wind down",
            "I was aware of dryness of my mouth",
            "I couldn't seem to experience any positive feeling at all",
            "I experienced breathing difficulty",
            "I found it difficult to work up the initiative to do things",
            "I tended to over-react to situations",
            "I experienced trembling (eg, in the hands)",
            "I felt that I was using a lot of nervous energy",
            "I was worried about situations in which I might panic",
            "I felt that I had nothing to look forward to",
            "I found myself getting agitated",
            "I found it difficult to relax",
            "I felt down-hearted and blue",
            "I was intolerant of anything that kept me from getting on with what I was doing",
            "I felt I was close to panic",
            "I was unable to become enthusiastic about anything",
            "I felt I wasn't worth much as a person",
            "I felt that I was rather touchy",
            "I was aware of the action of my heart in the absence of physical exertion",
            "I felt scared without any good reason",
            "I felt that life was meaningless"
        ];

        const container = document.getElementById('dass21-questions');
        container.innerHTML = questions.map((question, index) => `
            <div class="question-group">
                <p>${index + 1}. ${question}</p>
                <div class="options-group">
                    ${[0, 1, 2, 3].map(value => `
                        <div class="option-item">
                            <input type="radio" id="dass21_${index}_${value}" name="dass21_${index}" value="${value}">
                            <label for="dass21_${index}_${value}">
                                <span class="option-text">${value}</span>
                            </label>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    function loadGAD7Questions() {
        const questions = [
            "Feeling nervous, anxious, or on edge",
            "Not being able to stop or control worrying",
            "Worrying too much about different things",
            "Trouble relaxing",
            "Being so restless that it is hard to sit still",
            "Becoming easily annoyed or irritable",
            "Feeling afraid, as if something awful might happen"
        ];

        const container = document.getElementById('gad7-questions');
        container.innerHTML = questions.map((question, index) => `
            <div class="question-group">
                <p>${index + 1}. ${question}</p>
                <div class="options-group">
                    ${[0, 1, 2, 3].map(value => `
                        <div class="option-item">
                            <input type="radio" id="gad7_${index}_${value}" name="gad7_${index}" value="${value}">
                            <label for="gad7_${index}_${value}">
                                <span class="option-text">${value}</span>
                            </label>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    function loadPHQ9Questions() {
        const questions = [
            "Little interest or pleasure in doing things",
            "Feeling down, depressed, or hopeless",
            "Trouble falling or staying asleep, or sleeping too much",
            "Feeling tired or having little energy",
            "Poor appetite or overeating",
            "Feeling bad about yourself or that you are a failure or have let yourself or your family down",
            "Trouble concentrating on things, such as reading the newspaper or watching television",
            "Moving or speaking so slowly that other people could have noticed. Or the opposite being so fidgety or restless that you have been moving around a lot more than usual",
            "Thoughts that you would be better off dead, or of hurting yourself"
        ];

        const container = document.getElementById('phq9-questions');
        container.innerHTML = questions.map((question, index) => `
            <div class="question-group">
                <p>${index + 1}. ${question}</p>
                <div class="options-group">
                    ${[0, 1, 2, 3].map(value => `
                        <div class="option-item">
                            <input type="radio" id="phq9_${index}_${value}" name="phq9_${index}" value="${value}">
                            <label for="phq9_${index}_${value}">
                                <span class="option-text">${value}</span>
                            </label>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    // Load saved progress for each module
    async function loadModuleProgress() {
        try {
            const response = await fetch(`${apiConfig.backendApiUrl}/api/mental-health/progress`, {
                method: 'GET',
                headers
            });
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.progress) {
                    moduleProgress = data.progress;
                    // Optionally pre-fill forms with saved data
                    prefillModuleForms();
                }
            }
        } catch (error) {
            console.error('Error loading module progress:', error);
        }
    }

    // Prefill forms with saved progress (if any)
    function prefillModuleForms() {
        // Prefill vitals
        if (moduleProgress.vitals) {
            document.getElementById('systolic').value = moduleProgress.vitals.systolic || '';
            document.getElementById('diastolic').value = moduleProgress.vitals.diastolic || '';
            document.getElementById('heart-rate').value = moduleProgress.vitals.heartRate || '';
            document.getElementById('sleep-duration').value = moduleProgress.vitals.sleepDuration || '';
            document.getElementById('temperature').value = moduleProgress.vitals.temperature || '';
            document.getElementById('exercise-frequency').value = moduleProgress.lifestyle?.exerciseFrequency || '';
            document.getElementById('smoking-status').value = moduleProgress.lifestyle?.smokingStatus || '';
            document.getElementById('alcohol-consumption').value = moduleProgress.lifestyle?.alcoholConsumption || '';
            document.getElementById('screen-time').value = moduleProgress.lifestyle?.screenTime || '';
            document.getElementById('chronic-conditions').value = moduleProgress.lifestyle?.chronicConditions || '';
            document.getElementById('medications').value = moduleProgress.lifestyle?.medications || '';
        }
        // Prefill DASS-21
        if (moduleProgress.dass21) {
            for (let i = 0; i < 21; i++) {
                const val = moduleProgress.dass21[i];
                if (typeof val !== 'undefined') {
                    document.getElementById(`dass21_${i}_${val}`).checked = true;
                }
            }
        }
        // Prefill GAD-7
        if (moduleProgress.gad7) {
            for (let i = 0; i < 7; i++) {
                const val = moduleProgress.gad7[i];
                if (typeof val !== 'undefined') {
                    document.getElementById(`gad7_${i}_${val}`).checked = true;
                }
            }
        }
        // Prefill PHQ-9
        if (moduleProgress.phq9) {
            for (let i = 0; i < 9; i++) {
                const val = moduleProgress.phq9[i];
                if (typeof val !== 'undefined') {
                    document.getElementById(`phq9_${i}_${val}`).checked = true;
                }
            }
        }
    }

    // Save progress for a module
    async function saveModuleProgress(moduleName, data) {
        try {
            const response = await fetch(`${apiConfig.backendApiUrl}/api/mental-health/progress`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ module: moduleName, data })
            });
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    showSuccess(`${moduleName} progress saved!`);
                }
            }
        } catch (error) {
            console.error(`Error saving ${moduleName} progress:`, error);
        }
    }

    function navigateStep(direction) {
        if (direction === 1 && !validateCurrentStep()) {
            return;
        }

        // Save progress for the current module before moving forward
        if (direction === 1) {
            switch (currentStep) {
                case 1:
                    // Save vitals and lifestyle
                    const vitalsData = {
                        systolic: document.getElementById('systolic').value,
                        diastolic: document.getElementById('diastolic').value,
                        heartRate: document.getElementById('heart-rate').value,
                        sleepDuration: document.getElementById('sleep-duration').value,
                        temperature: document.getElementById('temperature').value
                    };
                    const lifestyleData = {
                        exerciseFrequency: document.getElementById('exercise-frequency').value,
                        smokingStatus: document.getElementById('smoking-status').value,
                        alcoholConsumption: document.getElementById('alcohol-consumption').value,
                        screenTime: document.getElementById('screen-time').value,
                        chronicConditions: document.getElementById('chronic-conditions').value,
                        medications: document.getElementById('medications').value
                    };
                    saveModuleProgress('vitals', { vitals: vitalsData, lifestyle: lifestyleData });
                    break;
                case 2:
                    // Save DASS-21 answers
                    const dass21Answers = [];
                    for (let i = 0; i < 21; i++) {
                        const checked = document.querySelector(`input[name="dass21_${i}"]:checked`);
                        dass21Answers.push(checked ? parseInt(checked.value) : null);
                    }
                    saveModuleProgress('dass21', dass21Answers);
                    break;
                case 3:
                    // Save GAD-7 answers
                    const gad7Answers = [];
                    for (let i = 0; i < 7; i++) {
                        const checked = document.querySelector(`input[name="gad7_${i}"]:checked`);
                        gad7Answers.push(checked ? parseInt(checked.value) : null);
                    }
                    saveModuleProgress('gad7', gad7Answers);
                    break;
                case 4:
                    // Save PHQ-9 answers
                    const phq9Answers = [];
                    for (let i = 0; i < 9; i++) {
                        const checked = document.querySelector(`input[name="phq9_${i}"]:checked`);
                        phq9Answers.push(checked ? parseInt(checked.value) : null);
                    }
                    saveModuleProgress('phq9', phq9Answers);
                    break;
            }
        }

        // Hide current step
        document.querySelector(`.analysis-step[data-step="${currentStep}"]`).classList.remove('active');
        document.querySelector(`.step-indicator[data-step="${currentStep}"]`).classList.remove('active');

        // Update step
        currentStep += direction;

        // Show new step
        document.querySelector(`.analysis-step[data-step="${currentStep}"]`).classList.add('active');
        document.querySelector(`.step-indicator[data-step="${currentStep}"]`).classList.add('active');

        // Update buttons
        updateNavigationButtons();
    }

    function updateNavigationButtons() {
        prevBtn.style.display = currentStep === 1 ? 'none' : 'flex';
        nextBtn.style.display = currentStep === totalSteps ? 'none' : 'flex';
        submitBtn.style.display = currentStep === totalSteps ? 'flex' : 'none';
    }

    function validateCurrentStep() {
        switch (currentStep) {
            case 1:
                return validateVitalsStep();
            case 2:
                return validateDASS21();
            case 3:
                return validateGAD7();
            case 4:
                return validatePHQ9();
            default:
                return false;
        }
    }

    function validateVitalsStep() {
        const systolic = document.getElementById('systolic').value;
        const diastolic = document.getElementById('diastolic').value;
        const heartRate = document.getElementById('heart-rate').value;
        const sleepDuration = document.getElementById('sleep-duration').value;

        if (!systolic || !diastolic || !heartRate || !sleepDuration) {
            showWarning('Please fill in all required vital signs.');
            return false;
        }

        return true;
    }

    function validateDASS21() {
        for (let i = 0; i < 21; i++) {
            const checked = document.querySelector(`input[name="dass21_${i}"]:checked`);
            if (!checked) {
                showWarning('Please answer all DASS-21 questions.');
                return false;
            }
        }
        return true;
    }

    function validateGAD7() {
        for (let i = 0; i < 7; i++) {
            const checked = document.querySelector(`input[name="gad7_${i}"]:checked`);
            if (!checked) {
                showWarning('Please answer all GAD-7 questions.');
                return false;
            }
        }
        return true;
    }

    function validatePHQ9() {
        for (let i = 0; i < 9; i++) {
            const checked = document.querySelector(`input[name="phq9_${i}"]:checked`);
            if (!checked) {
                showWarning('Please answer all PHQ-9 questions.');
                return false;
            }
        }
        return true;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        
        if (!validateCurrentStep()) {
            return;
        }

        // Show loading
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating Report...';
        submitBtn.disabled = true;

        try {
            // Collect all form data
            collectFormData();
            
            // Send to backend
            const response = await fetch(`${apiConfig.backendApiUrl}/api/mental-health/analyze`, {
                method: 'POST',
                headers,
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Failed to generate report');
            }

            const result = await response.json();
            
            if (result.success) {
                showSuccess('Mental health report generated successfully!');
                displayReport(result.data);
                analysisForm.style.display = 'none';
                reportContainer.style.display = 'block';
            } else {
                throw new Error(result.message || 'Failed to generate report');
            }

        } catch (error) {
            console.error('Error generating report:', error);
            showError('Failed to generate report. Please try again.');
        } finally {
            submitBtn.innerHTML = '<i class="fas fa-chart-line"></i> Generate Report';
            submitBtn.disabled = false;
        }
    }

    function collectFormData() {
        // Collect vitals
        formData.vitals = {
            systolic: parseInt(document.getElementById('systolic').value),
            diastolic: parseInt(document.getElementById('diastolic').value),
            heartRate: parseInt(document.getElementById('heart-rate').value),
            sleepDuration: parseFloat(document.getElementById('sleep-duration').value),
            temperature: parseFloat(document.getElementById('temperature').value) || null
        };

        // Collect lifestyle
        formData.lifestyle = {
            exerciseFrequency: document.getElementById('exercise-frequency').value,
            smokingStatus: document.getElementById('smoking-status').value,
            alcoholConsumption: document.getElementById('alcohol-consumption').value,
            screenTime: parseInt(document.getElementById('screen-time').value) || null,
            chronicConditions: document.getElementById('chronic-conditions').value,
            medications: document.getElementById('medications').value
        };

        // Collect DASS-21
        const dass21Scores = [];
        for (let i = 0; i < 21; i++) {
            const checked = document.querySelector(`input[name="dass21_${i}"]:checked`);
            dass21Scores.push(parseInt(checked.value));
        }
        formData.dass21 = calculateDASS21Scores(dass21Scores);

        // Collect GAD-7
        const gad7Scores = [];
        for (let i = 0; i < 7; i++) {
            const checked = document.querySelector(`input[name="gad7_${i}"]:checked`);
            gad7Scores.push(parseInt(checked.value));
        }
        formData.gad7 = calculateGAD7Score(gad7Scores);

        // Collect PHQ-9
        const phq9Scores = [];
        for (let i = 0; i < 9; i++) {
            const checked = document.querySelector(`input[name="phq9_${i}"]:checked`);
            phq9Scores.push(parseInt(checked.value));
        }
        formData.phq9 = calculatePHQ9Score(phq9Scores);
    }

    function calculateDASS21Scores(scores) {
        // DASS-21 subscales: Depression (3,5,10,13,16,17,21), Anxiety (2,4,7,9,15,19,20), Stress (1,6,8,11,12,14,18)
        const depressionItems = [2, 4, 9, 12, 15, 16, 20]; // 0-indexed
        const anxietyItems = [1, 3, 6, 8, 14, 18, 19]; // 0-indexed
        const stressItems = [0, 5, 7, 10, 11, 13, 17]; // 0-indexed

        const depressionScore = depressionItems.reduce((sum, i) => sum + scores[i], 0) * 2;
        const anxietyScore = anxietyItems.reduce((sum, i) => sum + scores[i], 0) * 2;
        const stressScore = stressItems.reduce((sum, i) => sum + scores[i], 0) * 2;

        return {
            depression: {
                score: depressionScore,
                severity: getDASSSeverity('depression', depressionScore)
            },
            anxiety: {
                score: anxietyScore,
                severity: getDASSSeverity('anxiety', anxietyScore)
            },
            stress: {
                score: stressScore,
                severity: getDASSSeverity('stress', stressScore)
            }
        };
    }

    function getDASSSeverity(subscale, score) {
        const ranges = {
            depression: { normal: [0, 9], mild: [10, 13], moderate: [14, 20], severe: [21, 42] },
            anxiety: { normal: [0, 7], mild: [8, 9], moderate: [10, 14], severe: [15, 42] },
            stress: { normal: [0, 14], mild: [15, 18], moderate: [19, 25], severe: [26, 42] }
        };

        const range = ranges[subscale];
        if (score >= range.severe[0]) return 'severe';
        if (score >= range.moderate[0]) return 'moderate';
        if (score >= range.mild[0]) return 'mild';
        return 'normal';
    }

    function calculateGAD7Score(scores) {
        const totalScore = scores.reduce((sum, score) => sum + score, 0);
        
        let severity;
        if (totalScore >= 15) severity = 'severe';
        else if (totalScore >= 10) severity = 'moderate';
        else if (totalScore >= 5) severity = 'mild';
        else severity = 'normal';

        return { score: totalScore, severity };
    }

    function calculatePHQ9Score(scores) {
        const totalScore = scores.reduce((sum, score) => sum + score, 0);
        
        let severity;
        if (totalScore >= 20) severity = 'severe';
        else if (totalScore >= 15) severity = 'moderate';
        else if (totalScore >= 10) severity = 'mild';
        else if (totalScore >= 5) severity = 'minimal';
        else severity = 'normal';

        return { score: totalScore, severity };
    }

    function displayReport(reportData) {
        const content = document.getElementById('report-content');
        
        let html = '';

        // Check for emergency situations
        const isEmergency = reportData.dass21.depression.severity === 'severe' || 
                           reportData.dass21.anxiety.severity === 'severe' ||
                           reportData.gad7.severity === 'severe' ||
                           reportData.phq9.severity === 'severe';

        if (isEmergency) {
            html += `
                <div class="emergency-notice">
                    <h3><i class="fas fa-exclamation-triangle"></i> Immediate Support Recommended</h3>
                    <p>Your assessment indicates you may benefit from immediate professional support. Please consider reaching out to a mental health professional.</p>
                    <div class="emergency-actions">
                        <a href="tel:9152987821" class="emergency-btn">
                            <i class="fas fa-phone"></i> Crisis Helpline: 9152987821
                        </a>
                        <a href="appointment.html" class="emergency-btn">
                            <i class="fas fa-calendar"></i> Book Counseling Session
                        </a>
                    </div>
                </div>
            `;
        }

        // Mental Health Scores
        html += `
            <div class="report-section">
                <h3><i class="fas fa-brain"></i> Mental Health Assessment Results</h3>
                <div class="score-grid">
                    <div class="score-card ${reportData.dass21.depression.severity}">
                        <div class="score-value">${reportData.dass21.depression.score}</div>
                        <div class="score-label">Depression</div>
                        <div class="score-severity">${reportData.dass21.depression.severity}</div>
                    </div>
                    <div class="score-card ${reportData.dass21.anxiety.severity}">
                        <div class="score-value">${reportData.dass21.anxiety.score}</div>
                        <div class="score-label">Anxiety</div>
                        <div class="score-severity">${reportData.dass21.anxiety.severity}</div>
                    </div>
                    <div class="score-card ${reportData.dass21.stress.severity}">
                        <div class="score-value">${reportData.dass21.stress.score}</div>
                        <div class="score-label">Stress</div>
                        <div class="score-severity">${reportData.dass21.stress.severity}</div>
                    </div>
                    <div class="score-card ${reportData.gad7.severity}">
                        <div class="score-value">${reportData.gad7.score}</div>
                        <div class="score-label">GAD-7</div>
                        <div class="score-severity">${reportData.gad7.severity}</div>
                    </div>
                    <div class="score-card ${reportData.phq9.severity}">
                        <div class="score-value">${reportData.phq9.score}</div>
                        <div class="score-label">PHQ-9</div>
                        <div class="score-severity">${reportData.phq9.severity}</div>
                    </div>
                </div>
            </div>
        `;

        // Vitals Summary
        html += `
            <div class="report-section">
                <h3><i class="fas fa-heartbeat"></i> Health Vitals Summary</h3>
                <div class="vitals-summary">
                    <p><strong>Blood Pressure:</strong> ${reportData.vitals.systolic}/${reportData.vitals.diastolic} mmHg 
                    ${getVitalStatus('bp', reportData.vitals.systolic, reportData.vitals.diastolic)}</p>
                    <p><strong>Heart Rate:</strong> ${reportData.vitals.heartRate} BPM 
                    ${getVitalStatus('hr', reportData.vitals.heartRate)}</p>
                    <p><strong>Sleep Duration:</strong> ${reportData.vitals.sleepDuration} hours 
                    ${getVitalStatus('sleep', reportData.vitals.sleepDuration)}</p>
                </div>
            </div>
        `;

        // Recommendations
        html += `
            <div class="report-section">
                <h3><i class="fas fa-lightbulb"></i> Personalized Recommendations</h3>
                <div class="recommendations">
                    ${generateRecommendations(reportData)}
                </div>
            </div>
        `;

        content.innerHTML = html;

        // Setup report actions
        setupReportActions(reportData);
    }

    function getVitalStatus(type, value1, value2) {
        switch (type) {
            case 'bp':
                if (value1 < 120 && value2 < 80) return '<span style="color: green;">(Normal)</span>';
                if (value1 < 140 && value2 < 90) return '<span style="color: orange;">(Elevated)</span>';
                return '<span style="color: red;">(High)</span>';
            case 'hr':
                if (value1 >= 60 && value1 <= 100) return '<span style="color: green;">(Normal)</span>';
                return '<span style="color: orange;">(Outside normal range)</span>';
            case 'sleep':
                if (value1 >= 7 && value1 <= 9) return '<span style="color: green;">(Optimal)</span>';
                if (value1 >= 6 && value1 <= 10) return '<span style="color: orange;">(Acceptable)</span>';
                return '<span style="color: red;">(Poor)</span>';
            default:
                return '';
        }
    }

    function generateRecommendations(reportData) {
        let recommendations = [];

        // Based on mental health scores
        if (reportData.dass21.depression.severity !== 'normal') {
            recommendations.push({
                title: 'Depression Management',
                content: 'Consider mindfulness meditation, regular exercise, and maintaining social connections. Our guided meditation resources can help.'
            });
        }

        if (reportData.dass21.anxiety.severity !== 'normal') {
            recommendations.push({
                title: 'Anxiety Relief',
                content: 'Practice deep breathing exercises, progressive muscle relaxation, and consider limiting caffeine intake.'
            });
        }

        if (reportData.dass21.stress.severity !== 'normal') {
            recommendations.push({
                title: 'Stress Management',
                content: 'Implement time management techniques, take regular breaks, and engage in stress-reducing activities like yoga or nature walks.'
            });
        }

        // Sleep recommendations
        if (reportData.vitals.sleepDuration < 7 || reportData.vitals.sleepDuration > 9) {
            recommendations.push({
                title: 'Sleep Optimization',
                content: 'Aim for 7-9 hours of sleep per night. Establish a consistent bedtime routine and limit screen time before bed.'
            });
        }

        // Exercise recommendations
        if (!reportData.lifestyle.exerciseFrequency || reportData.lifestyle.exerciseFrequency === 'never') {
            recommendations.push({
                title: 'Physical Activity',
                content: 'Start with 30 minutes of moderate exercise 3-4 times per week. Even light walking can significantly improve mental health.'
            });
        }

        return recommendations.map(rec => `
            <div class="recommendation-item">
                <h4>${rec.title}</h4>
                <p>${rec.content}</p>
            </div>
        `).join('');
    }

    function setupReportActions(reportData) {
        // Email report button
        document.getElementById('email-report').addEventListener('click', async () => {
            try {
                const response = await fetch(`${apiConfig.backendApiUrl}/api/mental-health/email-report`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ reportId: reportData._id })
                });

                if (response.ok) {
                    showSuccess('Report sent to your email successfully!');
                } else {
                    throw new Error('Failed to send email');
                }
            } catch (error) {
                showError('Failed to send email. Please try again.');
            }
        });

        // Download PDF button
        document.getElementById('download-pdf').addEventListener('click', () => {
            showInfo('PDF download feature will be available soon.');
        });
    }

    // Utility functions
    function showSuccess(message) {
        showNotification(message, 'success');
    }

    function showError(message) {
        showNotification(message, 'error');
    }

    function showWarning(message) {
        showNotification(message, 'warning');
    }

    function showInfo(message) {
        showNotification(message, 'info');
    }

    function showNotification(message, type) {
        // Use the existing notification system from script.js
        if (window.showSuccess && type === 'success') {
            window.showSuccess(message);
        } else if (window.showError && type === 'error') {
            window.showError(message);
        } else if (window.showWarning && type === 'warning') {
            window.showWarning(message);
        } else if (window.showInfo && type === 'info') {
            window.showInfo(message);
        } else {
            // Fallback
            alert(message);
        }
    }
});
