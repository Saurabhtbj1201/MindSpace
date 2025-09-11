// Profile Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        // Redirect to login page if not logged in
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
    
    // Profile state management
    let isEditMode = false;
    let originalData = {};
    
    // API Configuration - use environment config
    const apiConfig = window.ENV_CONFIG || {
        backendApiUrl: 'http://localhost:5001',
        mlServiceUrl: 'http://localhost:5000/predict_emotion'
    };
    
    // Initialize the page
    initializePage();
    
    // Check for recent mood tracking and update the mood button
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
                // User has tracked mood within the last 2 hours
                const moodTrackerBtn = document.querySelector('.mood-tracker-btn');
                if (moodTrackerBtn) {
                    const moodData = data.data;
                    
                    // Emoji map for moods
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
                    
                    // Add a CSS class for styling
                    moodTrackerBtn.classList.add('current-mood');
                }
            }
        } catch (error) {
            console.error('Error checking recent mood:', error);
        }
    }
    
    // Check and update mood button
    checkAndUpdateMoodButton();
    
    // Function to initialize the page
    async function initializePage() {
        // Load user profile data
        await loadUserProfile();
        
        // Check profile completion
        await checkProfileCompletion();
        
        // Set up form interactions
        setupFormInteractions();
        
        // Set up edit mode functionality
        setupEditMode();
    }
    
    // Function to update profile information in header
    function updateProfileInfo(userData) {
        if (userData) {
            const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
            const initials = ((userData.firstName || '').charAt(0) + (userData.lastName || '').charAt(0)).toUpperCase();
            
            // Update header profile dropdown
            document.getElementById('header-username').textContent = userData.firstName || 'User';
            document.getElementById('header-avatar').textContent = initials || 'U';
            
            // Update welcome message
            document.getElementById('welcome-message').textContent = `👋 Hi, Welcome ${userData.firstName || 'User'}!`;
            
            // Set up dropdown toggle
            setupProfileDropdown();
            
            // Handle logout
            document.getElementById('logout-btn').addEventListener('click', function(e) {
                e.preventDefault();
                
                // Clear authentication data
                localStorage.removeItem('authToken');
                localStorage.removeItem('userData');
                
                // Show success notification
                showSuccess('Logged out successfully!');
                
                // Redirect to home page after short delay
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            });
        }
    }
    
    // Function to load user profile data
    async function loadUserProfile() {
        try {
            // First populate with basic user data from localStorage
            populateBasicInfo(userData);
            
            // Then try to load extended profile data from backend
            const apiUrl = `${apiConfig.backendApiUrl}/api/user/profile`;
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.profile) {
                    populateProfileData(data.profile);
                    originalData = { ...data.profile };
                }
            } else {
                console.warn('Could not load extended profile data');
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            // Continue with basic data from localStorage
        }
    }
    
    // Function to populate basic user info
    function populateBasicInfo(data) {
        document.getElementById('firstName').value = data.firstName || '';
        document.getElementById('lastName').value = data.lastName || '';
        document.getElementById('email').value = data.email || '';
        
        // Calculate and display age if DOB is available
        if (data.dob) {
            document.getElementById('dob').value = data.dob;
            calculateAndSetAge(data.dob);
        }
    }
    
    // Function to populate all profile data
    function populateProfileData(profile) {
        // Personal Information - Display
        document.getElementById('display-firstName').textContent = profile.firstName || 'Not provided';
        document.getElementById('display-lastName').textContent = profile.lastName || 'Not provided';
        document.getElementById('display-email').textContent = profile.email || 'Not provided';
        document.getElementById('display-gender').textContent = formatGender(profile.gender) || 'Not specified';
        document.getElementById('display-dob').textContent = formatDate(profile.dob) || 'Not provided';
        document.getElementById('display-age').textContent = calculateAge(profile.dob) || 'Not calculated';
        document.getElementById('display-bloodGroup').textContent = profile.bloodGroup || 'Not specified';
        document.getElementById('display-disability').textContent = formatYesNo(profile.disability) || 'Not specified';
        document.getElementById('display-height').textContent = profile.height ? `${profile.height} cm` : 'Not provided';
        document.getElementById('display-weight').textContent = profile.weight ? `${profile.weight} kg` : 'Not provided';
        
        // Disability details
        if (profile.disability === 'yes' && profile.disabilityDetails) {
            document.getElementById('display-disabilitySpecify').style.display = 'block';
            document.getElementById('display-disabilityDetails').textContent = profile.disabilityDetails;
        }
        
        // Address Details - Display
        document.getElementById('display-district').textContent = profile.district || 'Not provided';
        document.getElementById('display-state').textContent = profile.state || 'Not provided';
        document.getElementById('display-pincode').textContent = profile.pincode || 'Not provided';
        
        // Academic Information - Display
        document.getElementById('display-currentStatus').textContent = formatCurrentStatus(profile.currentStatus) || 'Not specified';
        document.getElementById('display-collegeName').textContent = profile.collegeName || 'Not provided';
        document.getElementById('display-courseName').textContent = profile.courseName || 'Not provided';
        document.getElementById('display-courseDuration').textContent = profile.courseDuration ? `${profile.courseDuration} years` : 'Not specified';
        document.getElementById('display-currentYear').textContent = profile.currentYear || 'Not specified';
        document.getElementById('display-expectedCompletion').textContent = profile.expectedCompletion || 'Not specified';
        document.getElementById('display-backlogs').textContent = formatYesNo(profile.backlogs) || 'Not specified';
        document.getElementById('display-studyMode').textContent = formatStudyMode(profile.studyMode) || 'Not specified';
        
        // Backlog details
        if (profile.backlogs === 'yes' && profile.backlogSubjects) {
            document.getElementById('display-backlogCount').style.display = 'block';
            document.getElementById('display-backlogSubjects').textContent = profile.backlogSubjects;
        }
        
        // Residence - Display
        document.getElementById('display-livingWithParents').textContent = formatYesNo(profile.livingWithParents) || 'Not specified';
        document.getElementById('display-collegeDistance').textContent = profile.collegeDistance ? `${profile.collegeDistance} km` : 'Not provided';
        
        // Living arrangement
        if (profile.livingWithParents === 'no' && profile.livingIn) {
            document.getElementById('display-livingArrangement').style.display = 'block';
            document.getElementById('display-livingIn').textContent = formatLivingIn(profile.livingIn);
        }
        
        // Health & Wellness - Display
        document.getElementById('display-sleepPattern').textContent = formatSleepPattern(profile.sleepPattern) || 'Not specified';
        document.getElementById('display-exerciseHabit').textContent = formatYesNo(profile.exerciseHabit) || 'Not specified';
        document.getElementById('display-smokingDrinking').textContent = formatYesNo(profile.smokingDrinking) || 'Not specified';
        document.getElementById('display-mentalHealthCondition').textContent = formatMentalHealth(profile.mentalHealthCondition) || 'Not specified';
        document.getElementById('display-currentMedication').textContent = profile.currentMedication || 'None specified';
        
        // Exercise frequency
        if (profile.exerciseHabit === 'yes' && profile.exerciseFreq) {
            document.getElementById('display-exerciseFrequency').style.display = 'block';
            document.getElementById('display-exerciseFreq').textContent = formatExerciseFreq(profile.exerciseFreq);
        }

        // Personal Information - Form
        if (profile.firstName) document.getElementById('firstName').value = profile.firstName;
        if (profile.lastName) document.getElementById('lastName').value = profile.lastName;
        if (profile.email) document.getElementById('email').value = profile.email;
        if (profile.gender) document.getElementById('gender').value = profile.gender;
        if (profile.dob) {
            document.getElementById('dob').value = profile.dob.split('T')[0]; // Format for date input
            calculateAndSetAge(profile.dob);
        }
        if (profile.bloodGroup) document.getElementById('bloodGroup').value = profile.bloodGroup;
        if (profile.disability) {
            document.getElementById('disability').value = profile.disability;
            toggleDisabilityDetails(profile.disability === 'yes');
            if (profile.disabilityDetails) document.getElementById('disabilityDetails').value = profile.disabilityDetails;
        }
        if (profile.height) document.getElementById('height').value = profile.height;
        if (profile.weight) document.getElementById('weight').value = profile.weight;
        
        // Address Details
        if (profile.district) document.getElementById('district').value = profile.district;
        if (profile.state) document.getElementById('state').value = profile.state;
        if (profile.pincode) document.getElementById('pincode').value = profile.pincode;
        
        // Academic Information
        if (profile.currentStatus) document.getElementById('currentStatus').value = profile.currentStatus;
        if (profile.collegeName) document.getElementById('collegeName').value = profile.collegeName;
        if (profile.courseName) document.getElementById('courseName').value = profile.courseName;
        if (profile.courseDuration) document.getElementById('courseDuration').value = profile.courseDuration;
        if (profile.currentYear) document.getElementById('currentYear').value = profile.currentYear;
        if (profile.expectedCompletion) document.getElementById('expectedCompletion').value = profile.expectedCompletion;
        if (profile.backlogs) {
            document.getElementById('backlogs').value = profile.backlogs;
            toggleBacklogCount(profile.backlogs === 'yes');
            if (profile.backlogSubjects) document.getElementById('backlogSubjects').value = profile.backlogSubjects;
        }
        if (profile.studyMode) document.getElementById('studyMode').value = profile.studyMode;
        
        // Current Residence
        if (profile.livingWithParents) {
            document.getElementById('livingWithParents').value = profile.livingWithParents;
            toggleLivingArrangement(profile.livingWithParents === 'no');
            if (profile.livingIn) document.getElementById('livingIn').value = profile.livingIn;
        }
        if (profile.collegeDistance) document.getElementById('collegeDistance').value = profile.collegeDistance;
        
        // Health & Wellness
        if (profile.sleepPattern) document.getElementById('sleepPattern').value = profile.sleepPattern;
        if (profile.exerciseHabit) {
            document.getElementById('exerciseHabit').value = profile.exerciseHabit;
            toggleExerciseFrequency(profile.exerciseHabit === 'yes');
            if (profile.exerciseFreq) document.getElementById('exerciseFreq').value = profile.exerciseFreq;
        }
        if (profile.smokingDrinking) document.getElementById('smokingDrinking').value = profile.smokingDrinking;
        if (profile.mentalHealthCondition) document.getElementById('mentalHealthCondition').value = profile.mentalHealthCondition;
        if (profile.currentMedication) document.getElementById('currentMedication').value = profile.currentMedication;
    }
    
    // Function to set up form interactions
    function setupFormInteractions() {
        // DOB change handler
        document.getElementById('dob').addEventListener('change', function() {
            if (this.value) {
                calculateAndSetAge(this.value);
            }
        });
        
        // Disability dropdown change handler
        document.getElementById('disability').addEventListener('change', function() {
            toggleDisabilityDetails(this.value === 'yes');
        });
        
        // Backlogs dropdown change handler
        document.getElementById('backlogs').addEventListener('change', function() {
            toggleBacklogCount(this.value === 'yes');
        });
        
        // Living with parents change handler
        document.getElementById('livingWithParents').addEventListener('change', function() {
            toggleLivingArrangement(this.value === 'no');
        });
        
        // Exercise habit change handler
        document.getElementById('exerciseHabit').addEventListener('change', function() {
            toggleExerciseFrequency(this.value === 'yes');
        });
    }
    
    // Function to set up edit mode functionality
    function setupEditMode() {
        // Personal Information Section
        setupSectionEdit('personal-info', 'personal');
        
        // Academic Information Section
        setupSectionEdit('academic-info', 'academic');
        
        // Health & Wellness Section
        setupSectionEdit('health-info', 'health');
    }
    
    // Function to set up individual section editing
    function setupSectionEdit(sectionName, sectionType) {
        const editButton = document.getElementById(`edit-${sectionName}`);
        const saveButton = document.getElementById(`save-${sectionName}`);
        const cancelButton = document.getElementById(`cancel-${sectionName}`);
        
        if (!editButton || !saveButton || !cancelButton) return;
        
        let originalSectionData = {};
        
        editButton.addEventListener('click', () => {
            // Store original data for this section
            originalSectionData = getCurrentSectionData(sectionType);
            
            // Enter edit mode for this section
            enterSectionEditMode(sectionName, sectionType);
        });
        
        saveButton.addEventListener('click', () => {
            saveSectionProfile(sectionName, sectionType);
        });
        
        cancelButton.addEventListener('click', () => {
            // Restore original data
            populateSectionData(sectionType, originalSectionData);
            exitSectionEditMode(sectionName, sectionType);
            showInfo(`${getSectionDisplayName(sectionType)} changes cancelled.`);
        });
    }
    
    // Function to enter edit mode
    function enterEditMode() {
        isEditMode = true;
        document.body.classList.add('edit-mode');
        
        // Store original data for cancel functionality
        originalData = getCurrentFormData();
        
        // Enable form inputs
        enableFormInputs();
        
        // Show/hide buttons
        document.getElementById('edit-mode-toggle').style.display = 'none';
        document.getElementById('save-profile').style.display = 'flex';
        document.getElementById('cancel-edit').style.display = 'flex';
        
        showInfo('Edit mode enabled. You can now modify your profile information.');
    }
    
    // Function to save profile
    async function saveProfile() {
        try {
            // Show loading state
            const saveButton = document.getElementById('save-profile');
            const originalText = saveButton.innerHTML;
            saveButton.disabled = true;
            saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            
            // Get current form data
            const profileData = getCurrentFormData();
            
            // Clean up data - remove empty values
            Object.keys(profileData).forEach(key => {
                if (profileData[key] === '' || profileData[key] === null || profileData[key] === undefined) {
                    delete profileData[key];
                }
            });
            
            // Convert numeric strings to numbers where appropriate
            if (profileData.height) profileData.height = Number(profileData.height);
            if (profileData.weight) profileData.weight = Number(profileData.weight);
            if (profileData.currentYear) profileData.currentYear = Number(profileData.currentYear);
            if (profileData.expectedCompletion) profileData.expectedCompletion = Number(profileData.expectedCompletion);
            if (profileData.backlogSubjects) profileData.backlogSubjects = Number(profileData.backlogSubjects);
            if (profileData.collegeDistance) profileData.collegeDistance = Number(profileData.collegeDistance);
            if (profileData.courseDuration) profileData.courseDuration = Number(profileData.courseDuration);
            
            console.log('Sending profile data:', profileData);
            
            // Send update request to backend
            const apiUrl = `${apiConfig.backendApiUrl}/api/user/profile`;
            const response = await fetch(apiUrl, {
                method: 'PUT',
                headers,
                body: JSON.stringify(profileData)
            });
            
            const responseText = await response.text();
            console.log('Server response:', responseText);
            
            if (response.ok) {
                const data = JSON.parse(responseText);
                if (data.success) {
                    showSuccess('Profile updated successfully!');
                    
                    // Reload profile data to reflect changes
                    await loadUserProfile();
                    exitEditMode();
                    
                    // Update localStorage with new data if user data was updated
                    if (data.userData) {
                        const updatedUserData = { ...userData, ...data.userData };
                        localStorage.setItem('userData', JSON.stringify(updatedUserData));
                        updateProfileInfo(updatedUserData);
                    }
                } else {
                    throw new Error(data.message || 'Failed to update profile');
                }
            } else {
                let errorMessage = 'Failed to update profile';
                try {
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.message || errorData.error || errorMessage;
                    if (errorData.errors && Array.isArray(errorData.errors)) {
                        errorMessage += ': ' + errorData.errors.join(', ');
                    }
                } catch (e) {
                    errorMessage = `Server error: ${response.status} - ${responseText}`;
                }
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('Error saving profile:', error);
            showError('Failed to save profile: ' + error.message);
        } finally {
            // Reset button state
            const saveButton = document.getElementById('save-profile');
            saveButton.disabled = false;
            saveButton.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        }
    }
    
    // Function to cancel edit
    function cancelEdit() {
        // Restore original data
        populateProfileData(originalData);
        exitEditMode();
        showInfo('Changes cancelled. Profile restored to original state.');
    }
    
    // Function to exit edit mode
    function exitEditMode() {
        isEditMode = false;
        document.body.classList.remove('edit-mode');
        
        // Disable form inputs
        disableFormInputs();
        
        // Show/hide buttons
        const editToggle = document.getElementById('edit-mode-toggle');
        const saveProfile = document.getElementById('save-profile');
        const cancelEdit = document.getElementById('cancel-edit');
        
        if (editToggle) editToggle.style.display = 'flex';
        if (saveProfile) saveProfile.style.display = 'none';
        if (cancelEdit) cancelEdit.style.display = 'none';
    }
    
    // Function to enter section edit mode
    function enterSectionEditMode(sectionName, sectionType) {
        const displayDiv = document.getElementById(`${sectionType}-display`);
        const editDiv = document.getElementById(`${sectionType}-edit`);
        const editButton = document.getElementById(`edit-${sectionName}`);
        const saveButton = document.getElementById(`save-${sectionName}`);
        const cancelButton = document.getElementById(`cancel-${sectionName}`);
        
        // Toggle display/edit views
        if (displayDiv) displayDiv.style.display = 'none';
        if (editDiv) editDiv.style.display = 'block';
        
        // Toggle buttons
        if (editButton) editButton.style.display = 'none';
        if (saveButton) saveButton.style.display = 'flex';
        if (cancelButton) cancelButton.style.display = 'flex';
        
        // Enable inputs for this section only
        enableSectionInputs(sectionType);
        
        showInfo(`${getSectionDisplayName(sectionType)} edit mode enabled.`);
    }
    
    // Function to exit section edit mode
    function exitSectionEditMode(sectionName, sectionType) {
        const displayDiv = document.getElementById(`${sectionType}-display`);
        const editDiv = document.getElementById(`${sectionType}-edit`);
        const editButton = document.getElementById(`edit-${sectionName}`);
        const saveButton = document.getElementById(`save-${sectionName}`);
        const cancelButton = document.getElementById(`cancel-${sectionName}`);
        
        // Toggle display/edit views
        if (displayDiv) displayDiv.style.display = 'block';
        if (editDiv) editDiv.style.display = 'none';
        
        // Toggle buttons
        if (editButton) editButton.style.display = 'flex';
        if (saveButton) saveButton.style.display = 'none';
        if (cancelButton) cancelButton.style.display = 'none';
        
        // Disable inputs for this section
        disableSectionInputs(sectionType);
    }
    
    // Function to enable inputs for a specific section
    function enableSectionInputs(sectionType) {
        const editDiv = document.getElementById(`${sectionType}-edit`);
        if (!editDiv) return;
        
        const inputs = editDiv.querySelectorAll('.form-input');
        inputs.forEach(input => {
            if (input.id !== 'email' && input.id !== 'age') { // Keep email and age readonly
                input.removeAttribute('readonly');
                input.removeAttribute('disabled');
            }
        });
    }
    
    // Function to disable inputs for a specific section
    function disableSectionInputs(sectionType) {
        const editDiv = document.getElementById(`${sectionType}-edit`);
        if (!editDiv) return;
        
        const inputs = editDiv.querySelectorAll('.form-input');
        inputs.forEach(input => {
            if (input.tagName === 'SELECT') {
                input.disabled = true;
            } else {
                input.readOnly = true;
            }
        });
    }
    
    // Function to get current section data
    function getCurrentSectionData(sectionType) {
        const data = {};
        
        if (sectionType === 'personal') {
            data.firstName = document.getElementById('firstName').value;
            data.lastName = document.getElementById('lastName').value;
            data.email = document.getElementById('email').value;
            data.gender = document.getElementById('gender').value;
            data.dob = document.getElementById('dob').value;
            data.bloodGroup = document.getElementById('bloodGroup').value;
            data.disability = document.getElementById('disability').value;
            data.disabilityDetails = document.getElementById('disabilityDetails').value;
            data.height = document.getElementById('height').value;
            data.weight = document.getElementById('weight').value;
            data.district = document.getElementById('district').value;
            data.state = document.getElementById('state').value;
            data.pincode = document.getElementById('pincode').value;
        } else if (sectionType === 'academic') {
            data.currentStatus = document.getElementById('currentStatus').value;
            data.collegeName = document.getElementById('collegeName').value;
            data.courseName = document.getElementById('courseName').value;
            data.courseDuration = document.getElementById('courseDuration').value;
            data.currentYear = document.getElementById('currentYear').value;
            data.expectedCompletion = document.getElementById('expectedCompletion').value;
            data.backlogs = document.getElementById('backlogs').value;
            data.backlogSubjects = document.getElementById('backlogSubjects').value;
            data.studyMode = document.getElementById('studyMode').value;
            data.livingWithParents = document.getElementById('livingWithParents').value;
            data.livingIn = document.getElementById('livingIn').value;
            data.collegeDistance = document.getElementById('collegeDistance').value;
        } else if (sectionType === 'health') {
            data.sleepPattern = document.getElementById('sleepPattern').value;
            data.exerciseHabit = document.getElementById('exerciseHabit').value;
            data.exerciseFreq = document.getElementById('exerciseFreq').value;
            data.smokingDrinking = document.getElementById('smokingDrinking').value;
            data.mentalHealthCondition = document.getElementById('mentalHealthCondition').value;
            data.currentMedication = document.getElementById('currentMedication').value;
        }
        
        return data;
    }
    
    // Function to populate section data
    function populateSectionData(sectionType, data) {
        if (sectionType === 'personal') {
            if (data.firstName !== undefined) document.getElementById('firstName').value = data.firstName || '';
            if (data.lastName !== undefined) document.getElementById('lastName').value = data.lastName || '';
            if (data.email !== undefined) document.getElementById('email').value = data.email || '';
            if (data.gender !== undefined) document.getElementById('gender').value = data.gender || '';
            if (data.dob !== undefined) {
                document.getElementById('dob').value = data.dob || '';
                if (data.dob) calculateAndSetAge(data.dob);
            }
            if (data.bloodGroup !== undefined) document.getElementById('bloodGroup').value = data.bloodGroup || '';
            if (data.disability !== undefined) {
                document.getElementById('disability').value = data.disability || '';
                toggleDisabilityDetails(data.disability === 'yes');
            }
            if (data.disabilityDetails !== undefined) document.getElementById('disabilityDetails').value = data.disabilityDetails || '';
            if (data.height !== undefined) document.getElementById('height').value = data.height || '';
            if (data.weight !== undefined) document.getElementById('weight').value = data.weight || '';
            if (data.district !== undefined) document.getElementById('district').value = data.district || '';
            if (data.state !== undefined) document.getElementById('state').value = data.state || '';
            if (data.pincode !== undefined) document.getElementById('pincode').value = data.pincode || '';
        } else if (sectionType === 'academic') {
            if (data.currentStatus !== undefined) document.getElementById('currentStatus').value = data.currentStatus || '';
            if (data.collegeName !== undefined) document.getElementById('collegeName').value = data.collegeName || '';
            if (data.courseName !== undefined) document.getElementById('courseName').value = data.courseName || '';
            if (data.courseDuration !== undefined) document.getElementById('courseDuration').value = data.courseDuration || '';
            if (data.currentYear !== undefined) document.getElementById('currentYear').value = data.currentYear || '';
            if (data.expectedCompletion !== undefined) document.getElementById('expectedCompletion').value = data.expectedCompletion || '';
            if (data.backlogs !== undefined) {
                document.getElementById('backlogs').value = data.backlogs || '';
                toggleBacklogCount(data.backlogs === 'yes');
            }
            if (data.backlogSubjects !== undefined) document.getElementById('backlogSubjects').value = data.backlogSubjects || '';
            if (data.studyMode !== undefined) document.getElementById('studyMode').value = data.studyMode || '';
            if (data.livingWithParents !== undefined) {
                document.getElementById('livingWithParents').value = data.livingWithParents || '';
                toggleLivingArrangement(data.livingWithParents === 'no');
            }
            if (data.livingIn !== undefined) document.getElementById('livingIn').value = data.livingIn || '';
            if (data.collegeDistance !== undefined) document.getElementById('collegeDistance').value = data.collegeDistance || '';
        } else if (sectionType === 'health') {
            if (data.sleepPattern !== undefined) document.getElementById('sleepPattern').value = data.sleepPattern || '';
            if (data.exerciseHabit !== undefined) {
                document.getElementById('exerciseHabit').value = data.exerciseHabit || '';
                toggleExerciseFrequency(data.exerciseHabit === 'yes');
            }
            if (data.exerciseFreq !== undefined) document.getElementById('exerciseFreq').value = data.exerciseFreq || '';
            if (data.smokingDrinking !== undefined) document.getElementById('smokingDrinking').value = data.smokingDrinking || '';
            if (data.mentalHealthCondition !== undefined) document.getElementById('mentalHealthCondition').value = data.mentalHealthCondition || '';
            if (data.currentMedication !== undefined) document.getElementById('currentMedication').value = data.currentMedication || '';
        }
    }
    
    // Function to save section profile
    async function saveSectionProfile(sectionName, sectionType) {
        try {
            // Show loading state
            const saveButton = document.getElementById(`save-${sectionName}`);
            const originalText = saveButton.innerHTML;
            saveButton.disabled = true;
            saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            
            // Get current section data
            const sectionData = getCurrentSectionData(sectionType);
            
            // Clean up data - remove empty values
            Object.keys(sectionData).forEach(key => {
                if (sectionData[key] === '' || sectionData[key] === null || sectionData[key] === undefined) {
                    delete sectionData[key];
                }
            });
            
            // Convert numeric strings to numbers where appropriate
            const numericFields = ['height', 'weight', 'currentYear', 'expectedCompletion', 'backlogSubjects', 'collegeDistance', 'courseDuration'];
            numericFields.forEach(field => {
                if (sectionData[field]) {
                    sectionData[field] = Number(sectionData[field]);
                }
            });
            
            console.log('Sending section data:', sectionData);
            
            // Send update request to backend
            const apiUrl = `${apiConfig.backendApiUrl}/api/user/profile`;
            const response = await fetch(apiUrl, {
                method: 'PUT',
                headers,
                body: JSON.stringify(sectionData)
            });
            
            const responseText = await response.text();
            console.log('Server response:', responseText);
            
            if (response.ok) {
                const data = JSON.parse(responseText);
                if (data.success) {
                    showSuccess(`${getSectionDisplayName(sectionType)} updated successfully!`);
                    
                    // Reload profile data to reflect changes
                    await loadUserProfile();
                    exitSectionEditMode(sectionName, sectionType);
                    
                    // Update localStorage with new data if user data was updated
                    if (data.userData) {
                        const updatedUserData = { ...userData, ...data.userData };
                        localStorage.setItem('userData', JSON.stringify(updatedUserData));
                        updateProfileInfo(updatedUserData);
                    }
                } else {
                    throw new Error(data.message || 'Failed to update profile');
                }
            } else {
                let errorMessage = 'Failed to update profile';
                try {
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.message || errorData.error || errorMessage;
                    if (errorData.errors && Array.isArray(errorData.errors)) {
                        errorMessage += ': ' + errorData.errors.join(', ');
                    }
                } catch (e) {
                    errorMessage = `Server error: ${response.status} - ${responseText}`;
                }
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('Error saving section:', error);
            showError(`Failed to save ${getSectionDisplayName(sectionType)}: ` + error.message);
        } finally {
            // Reset button state
            const saveButton = document.getElementById(`save-${sectionName}`);
            saveButton.disabled = false;
            saveButton.innerHTML = '<i class="fas fa-save"></i> Save';
        }
    }
    
    // Function to get section display name
    function getSectionDisplayName(sectionType) {
        const names = {
            'personal': 'Personal Information',
            'academic': 'Academic Information',
            'health': 'Health & Wellness'
        };
        return names[sectionType] || sectionType;
    }
    
    // Function to enable form inputs
    function enableFormInputs() {
        const inputs = document.querySelectorAll('.form-input');
        inputs.forEach(input => {
            if (input.id !== 'email' && input.id !== 'age') { // Keep email and age readonly
                input.removeAttribute('readonly');
                input.removeAttribute('disabled');
            }
        });
    }
    
    // Function to disable form inputs
    function disableFormInputs() {
        const inputs = document.querySelectorAll('.form-input');
        inputs.forEach(input => {
            if (input.tagName === 'SELECT') {
                input.disabled = true;
            } else {
                input.readOnly = true;
            }
        });
    }
    
    // Function to get current form data
    function getCurrentFormData() {
        return {
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            email: document.getElementById('email').value,
            gender: document.getElementById('gender').value,
            dob: document.getElementById('dob').value,
            bloodGroup: document.getElementById('bloodGroup').value,
            disability: document.getElementById('disability').value,
            disabilityDetails: document.getElementById('disabilityDetails').value,
            height: document.getElementById('height').value,
            weight: document.getElementById('weight').value,
            district: document.getElementById('district').value,
            state: document.getElementById('state').value,
            pincode: document.getElementById('pincode').value,
            currentStatus: document.getElementById('currentStatus').value,
            collegeName: document.getElementById('collegeName').value,
            courseName: document.getElementById('courseName').value,
            courseDuration: document.getElementById('courseDuration').value,
            currentYear: document.getElementById('currentYear').value,
            expectedCompletion: document.getElementById('expectedCompletion').value,
            backlogs: document.getElementById('backlogs').value,
            backlogSubjects: document.getElementById('backlogSubjects').value,
            studyMode: document.getElementById('studyMode').value,
            livingWithParents: document.getElementById('livingWithParents').value,
            livingIn: document.getElementById('livingIn').value,
            collegeDistance: document.getElementById('collegeDistance').value,
            sleepPattern: document.getElementById('sleepPattern').value,
            exerciseHabit: document.getElementById('exerciseHabit').value,
            exerciseFreq: document.getElementById('exerciseFreq').value,
            smokingDrinking: document.getElementById('smokingDrinking').value,
            mentalHealthCondition: document.getElementById('mentalHealthCondition').value,
            currentMedication: document.getElementById('currentMedication').value
        };
    }
    
    // Utility functions for form interactions
    function calculateAndSetAge(dobString) {
        const dob = new Date(dobString);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
            age--;
        }
        
        document.getElementById('age').value = age > 0 ? age : '';
    }
    
    function toggleDisabilityDetails(show) {
        const detailsGroup = document.getElementById('disabilitySpecify');
        detailsGroup.style.display = show ? 'flex' : 'none';
    }
    
    function toggleBacklogCount(show) {
        const backlogGroup = document.getElementById('backlogCount');
        backlogGroup.style.display = show ? 'flex' : 'none';
    }
    
    function toggleLivingArrangement(show) {
        const livingGroup = document.getElementById('livingArrangement');
        livingGroup.style.display = show ? 'flex' : 'none';
    }
    
    function toggleExerciseFrequency(show) {
        const exerciseFreqGroup = document.getElementById('exerciseFrequency');
        exerciseFreqGroup.style.display = show ? 'flex' : 'none';
    }
    
    // Helper functions for formatting display values
    function formatGender(gender) {
        const genderMap = {
            'male': 'Male',
            'female': 'Female',
            'other': 'Other',
            'prefer-not-to-say': 'Prefer not to say'
        };
        return genderMap[gender] || gender;
    }
    
    function formatDate(dateString) {
        if (!dateString) return null;
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }
    
    function calculateAge(dobString) {
        if (!dobString) return null;
        const dob = new Date(dobString);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
            age--;
        }
        
        return age > 0 ? `${age} years old` : null;
    }
    
    function formatYesNo(value) {
        return value === 'yes' ? 'Yes' : value === 'no' ? 'No' : value;
    }
    
    function formatCurrentStatus(status) {
        const statusMap = {
            'job': 'Job',
            'ug': 'UG (Undergraduate)',
            'pg': 'PG (Postgraduate)',
            '12th': '12th or Equivalent',
            'below-12': 'Below 12th'
        };
        return statusMap[status] || status;
    }
    
    function formatStudyMode(mode) {
        const modeMap = {
            'regular': 'Regular',
            'online': 'Online',
            'hybrid': 'Hybrid/Sometimes'
        };
        return modeMap[mode] || mode;
    }
    
    function formatLivingIn(living) {
        const livingMap = {
            'hostel': 'Hostel',
            'pg': 'PG',
            'rented': 'Rented',
            'other': 'Other'
        };
        return livingMap[living] || living;
    }
    
    function formatSleepPattern(pattern) {
        const patternMap = {
            '<4': '< 4 hours',
            '4-6': '4–6 hours',
            '6-8': '6–8 hours',
            '>8': '> 8 hours'
        };
        return patternMap[pattern] || pattern;
    }
    
    function formatMentalHealth(condition) {
        const conditionMap = {
            'anxiety': 'Anxiety',
            'depression': 'Depression',
            'none': 'None',
            'prefer-not-to-say': 'Prefer not to say'
        };
        return conditionMap[condition] || condition;
    }
    
    function formatExerciseFreq(freq) {
        const freqMap = {
            'daily': 'Daily',
            'weekly': 'Weekly',
            'occasionally': 'Occasionally'
        };
        return freqMap[freq] || freq;
    }
    
    // Function to check profile completion
    async function checkProfileCompletion() {
        try {
            const apiUrl = `${apiConfig.backendApiUrl}/api/user/profile/completion`;
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    const completionPercentage = data.completionPercentage;
                    
                    // Show completion notice if profile is not fully complete
                    if (completionPercentage < 80) {
                        const notice = document.getElementById('profile-completion-notice');
                        const percentageElement = document.getElementById('completion-percentage');
                        
                        if (notice && percentageElement) {
                            percentageElement.textContent = `${completionPercentage}%`;
                            notice.style.display = 'block';
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error checking profile completion:', error);
        }
    }
    
    // Fix profile dropdown toggle
    function setupProfileDropdown() {
        const profileTrigger = document.getElementById('profile-trigger');
        const profileDropdown = document.getElementById('profile-dropdown');
        
        if (!profileTrigger || !profileDropdown) return;
        
        // Remove any previous event listeners
        profileTrigger.onclick = null;
        document.removeEventListener('click', closeDropdownOnClickOutside, true);
        
        // Toggle dropdown on trigger click
        profileTrigger.addEventListener('click', function(e) {
            e.stopPropagation();
            profileDropdown.classList.toggle('active');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', closeDropdownOnClickOutside, true);
        
        function closeDropdownOnClickOutside(event) {
            if (!profileTrigger.contains(event.target) && !profileDropdown.contains(event.target)) {
                profileDropdown.classList.remove('active');
            }
        }
    }
});