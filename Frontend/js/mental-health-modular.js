document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        window.location.href = 'index.html';
        return;
    }

    // Initialize variables
    let currentModule = 'vitals';
    let moduleProgress = {
        vitals: { completed: false, data: null },
        dass21: { completed: false, data: null },
        gad7: { completed: false, data: null },
        phq9: { completed: false, data: null }
    };

    // API configuration
    const apiConfig = {
        backendApiUrl: window.ENV_CONFIG?.backendApiUrl || window.ENV_API_URL || 'http://localhost:5001'
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
        await loadModuleProgress();
        setupEventListeners();
        loadCurrentModule();
    }

    function updateUserProfile() {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        if (userData) {
            const initials = ((userData.firstName || '').charAt(0) + (userData.lastName || '').charAt(0)).toUpperCase();
            const headerUsername = document.getElementById('header-username');
            const headerAvatar = document.getElementById('header-avatar');
            
            if (headerUsername) headerUsername.textContent = userData.firstName || 'User';
            if (headerAvatar) headerAvatar.textContent = initials || 'U';
        }
        setupProfileDropdown();
    }

    function setupProfileDropdown() {
        const profileTrigger = document.getElementById('profile-trigger');
        const profileDropdown = document.getElementById('profile-dropdown');
        const logoutBtn = document.getElementById('logout-btn');

        if (profileTrigger && profileDropdown) {
            profileTrigger.addEventListener('click', () => {
                profileDropdown.classList.toggle('active');
            });

            document.addEventListener('click', (event) => {
                if (!profileTrigger.contains(event.target) && !profileDropdown.contains(event.target)) {
                    profileDropdown.classList.remove('active');
                }
            });
        }

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

        // Progress item clicks
        document.querySelectorAll('.progress-item').forEach(item => {
            item.addEventListener('click', () => {
                const moduleId = item.id.replace('progress-', '');
                switchToModule(moduleId);
            });
        });
    }

    async function loadModuleProgress() {
        try {
            const response = await fetch(`${apiConfig.backendApiUrl}/api/mental-health/progress`, {
                method: 'GET',
                headers
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.progress) {
                    Object.keys(data.progress).forEach(module => {
                        if (moduleProgress[module]) {
                            moduleProgress[module].data = data.progress[module];
                            moduleProgress[module].completed = true;
                            updateProgressIndicator(module, true);
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error loading module progress:', error);
        }
    }

    function updateProgressIndicator(module, completed) {
        const progressItem = document.getElementById(`progress-${module}`);
        const checkIcon = progressItem?.querySelector('.progress-check');
        
        if (progressItem) {
            if (completed) {
                progressItem.classList.add('completed');
                if (checkIcon) checkIcon.style.display = 'flex';
            } else {
                progressItem.classList.remove('completed');
                if (checkIcon) checkIcon.style.display = 'none';
            }
        }
    }

    function switchToModule(moduleId) {
        // Update current module
        currentModule = moduleId;
        
        // Update progress indicators
        document.querySelectorAll('.progress-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const targetProgress = document.getElementById(`progress-${moduleId}`);
        if (targetProgress) {
            targetProgress.classList.add('active');
        }

        // Load module content
        loadCurrentModule();
    }

    function loadCurrentModule() {
        const container = document.getElementById('module-container');
        if (!container) return;
        
        switch (currentModule) {
            case 'vitals':
                loadVitalsModule(container);
                break;
            case 'dass21':
                loadDASS21Module(container);
                break;
            case 'gad7':
                loadGAD7Module(container);
                break;
            case 'phq9':
                loadPHQ9Module(container);
                break;
        }
    }

    function loadVitalsModule(container) {
        container.innerHTML = `
            <div class="module-section active">
                <div class="module-header">
                    <h2><i class="fas fa-heartbeat"></i> Health & Vitals Assessment</h2>
                    <p>Please provide your current health information for a comprehensive analysis.</p>
                </div>
                
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
                
                <div class="form-navigation">
                    <div></div>
                    <button type="button" class="btn-primary" onclick="window.saveVitalsModule()">
                        Save & Continue <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `;

        // Pre-fill if data exists
        if (moduleProgress.vitals.data) {
            setTimeout(() => prefillVitalsData(moduleProgress.vitals.data), 100);
        }
    }

    function loadDASS21Module(container) {
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

        const dassOptions = [
            "Did not apply to me at all",
            "Applied to me to some degree, or some of the time", 
            "Applied to me to a considerable degree or a good part of time",
            "Applied to me very much or most of the time"
        ];

        container.innerHTML = `
            <div class="module-section active">
                <div class="module-header">
                    <h2><i class="fas fa-brain"></i> DASS-21 Assessment</h2>
                    <p>Please read each statement and select the response that indicates how much the statement applied to you over the past week.</p>
                </div>

                <div class="questionnaire">
                    ${questions.map((question, index) => `
                        <div class="question-group">
                            <p>${index + 1}. ${question}</p>
                            <div class="options-group">
                                ${dassOptions.map((option, value) => `
                                    <div class="option-item">
                                        <input type="radio" id="dass21_${index}_${value}" name="dass21_${index}" value="${value}">
                                        <label for="dass21_${index}_${value}">
                                            <span class="option-text">${option}</span>
                                        </label>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="form-navigation">
                    <button type="button" class="btn-secondary" onclick="window.switchToModule('vitals')">
                        <i class="fas fa-arrow-left"></i> Previous
                    </button>
                    <button type="button" class="btn-primary" onclick="window.saveDASS21Module()">
                        Save & Continue <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `;

        // Pre-fill if data exists
        if (moduleProgress.dass21.data) {
            setTimeout(() => prefillDASS21Data(moduleProgress.dass21.data), 100);
        }
    }

    function loadGAD7Module(container) {
        const questions = [
            "Feeling nervous, anxious, or on edge",
            "Not being able to stop or control worrying",
            "Worrying too much about different things",
            "Trouble relaxing",
            "Being so restless that it is hard to sit still",
            "Becoming easily annoyed or irritable",
            "Feeling afraid, as if something awful might happen"
        ];

        const gadOptions = [
            "Not at all",
            "Several days",
            "More than half the days",
            "Nearly every day"
        ];

        container.innerHTML = `
            <div class="module-section active">
                <div class="module-header">
                    <h2><i class="fas fa-exclamation-triangle"></i> GAD-7 Assessment</h2>
                    <p>Over the last 2 weeks, how often have you been bothered by the following problems?</p>
                </div>

                <div class="questionnaire">
                    ${questions.map((question, index) => `
                        <div class="question-group">
                            <p>${index + 1}. ${question}</p>
                            <div class="options-group">
                                ${gadOptions.map((option, value) => `
                                    <div class="option-item">
                                        <input type="radio" id="gad7_${index}_${value}" name="gad7_${index}" value="${value}">
                                        <label for="gad7_${index}_${value}">
                                            <span class="option-text">${option}</span>
                                        </label>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="form-navigation">
                    <button type="button" class="btn-secondary" onclick="window.switchToModule('dass21')">
                        <i class="fas fa-arrow-left"></i> Previous
                    </button>
                    <button type="button" class="btn-primary" onclick="window.saveGAD7Module()">
                        Save & Continue <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `;

        // Pre-fill if data exists
        if (moduleProgress.gad7.data) {
            setTimeout(() => prefillGAD7Data(moduleProgress.gad7.data), 100);
        }
    }

    function loadPHQ9Module(container) {
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

        const phqOptions = [
            "Not at all",
            "Several days", 
            "More than half the days",
            "Nearly every day"
        ];

        container.innerHTML = `
            <div class="module-section active">
                <div class="module-header">
                    <h2><i class="fas fa-heart"></i> PHQ-9 Assessment</h2>
                    <p>Over the last 2 weeks, how often have you been bothered by any of the following problems?</p>
                </div>

                <div class="questionnaire">
                    ${questions.map((question, index) => `
                        <div class="question-group">
                            <p>${index + 1}. ${question}</p>
                            <div class="options-group">
                                ${phqOptions.map((option, value) => `
                                    <div class="option-item">
                                        <input type="radio" id="phq9_${index}_${value}" name="phq9_${index}" value="${value}">
                                        <label for="phq9_${index}_${value}">
                                            <span class="option-text">${option}</span>
                                        </label>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="form-navigation">
                    <button type="button" class="btn-secondary" onclick="window.switchToModule('gad7')">
                        <i class="fas fa-arrow-left"></i> Previous
                    </button>
                    <button type="button" class="btn-primary" onclick="window.savePHQ9Module()">
                        Save & Generate Report <i class="fas fa-chart-line"></i>
                    </button>
                </div>
            </div>
        `;

        // Pre-fill if data exists
        if (moduleProgress.phq9.data) {
            setTimeout(() => prefillPHQ9Data(moduleProgress.phq9.data), 100);
        }
    }

    // Prefill functions - FIXED: Added missing implementations
    function prefillVitalsData(data) {
        if (data && data.vitals) {
            const vitals = data.vitals;
            const lifestyle = data.lifestyle || {};
            
            const elements = {
                'systolic': vitals.systolic,
                'diastolic': vitals.diastolic,
                'heart-rate': vitals.heartRate,
                'sleep-duration': vitals.sleepDuration,
                'temperature': vitals.temperature,
                'exercise-frequency': lifestyle.exerciseFrequency,
                'smoking-status': lifestyle.smokingStatus,
                'alcohol-consumption': lifestyle.alcoholConsumption,
                'screen-time': lifestyle.screenTime,
                'chronic-conditions': lifestyle.chronicConditions,
                'medications': lifestyle.medications
            };

            Object.keys(elements).forEach(id => {
                const element = document.getElementById(id);
                if (element && elements[id] !== undefined && elements[id] !== null) {
                    element.value = elements[id];
                }
            });
        }
    }

    function prefillDASS21Data(data) {
        if (Array.isArray(data)) {
            data.forEach((value, index) => {
                if (typeof value !== 'undefined' && value !== null) {
                    const radio = document.getElementById(`dass21_${index}_${value}`);
                    if (radio) radio.checked = true;
                }
            });
        }
    }

    function prefillGAD7Data(data) {
        if (Array.isArray(data)) {
            data.forEach((value, index) => {
                if (typeof value !== 'undefined' && value !== null) {
                    const radio = document.getElementById(`gad7_${index}_${value}`);
                    if (radio) radio.checked = true;
                }
            });
        }
    }

    function prefillPHQ9Data(data) {
        if (Array.isArray(data)) {
            data.forEach((value, index) => {
                if (typeof value !== 'undefined' && value !== null) {
                    const radio = document.getElementById(`phq9_${index}_${value}`);
                    if (radio) radio.checked = true;
                }
            });
        }
    }

    // Global functions for button clicks
    window.switchToModule = switchToModule;
    
    window.saveVitalsModule = async function() {
        const vitalsData = {
            systolic: parseInt(document.getElementById('systolic')?.value) || null,
            diastolic: parseInt(document.getElementById('diastolic')?.value) || null,
            heartRate: parseInt(document.getElementById('heart-rate')?.value) || null,
            sleepDuration: parseFloat(document.getElementById('sleep-duration')?.value) || null,
            temperature: parseFloat(document.getElementById('temperature')?.value) || null
        };
        
        const lifestyleData = {
            exerciseFrequency: document.getElementById('exercise-frequency')?.value || '',
            smokingStatus: document.getElementById('smoking-status')?.value || '',
            alcoholConsumption: document.getElementById('alcohol-consumption')?.value || '',
            screenTime: parseInt(document.getElementById('screen-time')?.value) || null,
            chronicConditions: document.getElementById('chronic-conditions')?.value || '',
            medications: document.getElementById('medications')?.value || ''
        };

        if (!vitalsData.systolic || !vitalsData.diastolic || !vitalsData.heartRate || !vitalsData.sleepDuration) {
            showWarning('Please fill in all required vital signs.');
            return;
        }

        if (!lifestyleData.exerciseFrequency || !lifestyleData.smokingStatus || !lifestyleData.alcoholConsumption) {
            showWarning('Please complete all required lifestyle information.');
            return;
        }

        await saveModuleProgress('vitals', { vitals: vitalsData, lifestyle: lifestyleData });
        moduleProgress.vitals.completed = true;
        moduleProgress.vitals.data = { vitals: vitalsData, lifestyle: lifestyleData };
        updateProgressIndicator('vitals', true);
        switchToModule('dass21');
    };

    window.saveDASS21Module = async function() {
        const answers = [];
        let allAnswered = true;
        
        for (let i = 0; i < 21; i++) {
            const checked = document.querySelector(`input[name="dass21_${i}"]:checked`);
            if (!checked) {
                allAnswered = false;
                break;
            }
            answers.push(parseInt(checked.value));
        }

        if (!allAnswered) {
            showWarning('Please answer all DASS-21 questions.');
            return;
        }

        await saveModuleProgress('dass21', answers);
        moduleProgress.dass21.completed = true;
        moduleProgress.dass21.data = answers;
        updateProgressIndicator('dass21', true);
        switchToModule('gad7');
    };

    window.saveGAD7Module = async function() {
        const answers = [];
        let allAnswered = true;
        
        for (let i = 0; i < 7; i++) {
            const checked = document.querySelector(`input[name="gad7_${i}"]:checked`);
            if (!checked) {
                allAnswered = false;
                break;
            }
            answers.push(parseInt(checked.value));
        }

        if (!allAnswered) {
            showWarning('Please answer all GAD-7 questions.');
            return;
        }

        await saveModuleProgress('gad7', answers);
        moduleProgress.gad7.completed = true;
        moduleProgress.gad7.data = answers;
        updateProgressIndicator('gad7', true);
        switchToModule('phq9');
    };

    window.savePHQ9Module = async function() {
        const answers = [];
        let allAnswered = true;
        
        for (let i = 0; i < 9; i++) {
            const checked = document.querySelector(`input[name="phq9_${i}"]:checked`);
            if (!checked) {
                allAnswered = false;
                break;
            }
            answers.push(parseInt(checked.value));
        }

        if (!allAnswered) {
            showWarning('Please answer all PHQ-9 questions.');
            return;
        }

        await saveModuleProgress('phq9', answers);
        moduleProgress.phq9.completed = true;
        moduleProgress.phq9.data = answers;
        updateProgressIndicator('phq9', true);
        
        // Redirect to mental-report page for final analysis
        showSuccess('Assessment completed! Redirecting to generate your detailed report...');
        setTimeout(() => {
            window.location.href = 'mental-report.html?generate=true';
        }, 2000);
    };

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
                    showSuccess(`${moduleName.toUpperCase()} module saved successfully!`);
                    return true;
                } else {
                    throw new Error(result.message || 'Failed to save progress');
                }
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error(`Error saving ${moduleName} progress:`, error);
            showError(`Failed to save ${moduleName} progress: ${error.message}`);
            return false;
        }
    }

    // Helper functions for score calculations
    function calculateDASS21Scores(scores) {
        const depressionItems = [2, 4, 9, 12, 15, 16, 20];
        const anxietyItems = [1, 3, 6, 8, 14, 18, 19];
        const stressItems = [0, 5, 7, 10, 11, 13, 17];

        const depressionScore = depressionItems.reduce((sum, i) => sum + scores[i], 0) * 2;
        const anxietyScore = anxietyItems.reduce((sum, i) => sum + scores[i], 0) * 2;
        const stressScore = stressItems.reduce((sum, i) => sum + scores[i], 0) * 2;

        return {
            depression: { score: depressionScore, severity: getDASSSeverity('depression', depressionScore) },
            anxiety: { score: anxietyScore, severity: getDASSSeverity('anxiety', anxietyScore) },
            stress: { score: stressScore, severity: getDASSSeverity('stress', stressScore) }
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

    // Utility functions
    function showSuccess(message) { 
        if (window.showSuccess) window.showSuccess(message); 
        else console.log('SUCCESS:', message);
    }
    function showError(message) { 
        if (window.showError) window.showError(message); 
        else console.error('ERROR:', message);
    }
    function showWarning(message) { 
        if (window.showWarning) window.showWarning(message); 
        else console.warn('WARNING:', message);
    }
    function showInfo(message) { 
        if (window.showInfo) window.showInfo(message); 
        else console.info('INFO:', message);
    }
});