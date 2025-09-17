document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        window.location.href = 'index.html';
        return;
    }

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
        await loadAssessmentHistory();
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

        // Start new assessment button
        const startAssessmentBtn = document.getElementById('start-new-assessment');
        if (startAssessmentBtn) {
            startAssessmentBtn.addEventListener('click', async () => {
                // Clear all previous module progress before starting new assessment
                try {
                    const response = await fetch(`${apiConfig.backendApiUrl}/api/mental-health/progress/clear`, {
                        method: 'DELETE',
                        headers
                    });
                    
                    if (response.ok) {
                        showSuccess('Starting fresh assessment...');
                        setTimeout(() => {
                            window.location.href = 'mental-health.html';
                        }, 1000);
                    } else {
                        // Even if clearing fails, still redirect to start new assessment
                        console.warn('Could not clear previous progress, but starting new assessment');
                        window.location.href = 'mental-health.html';
                    }
                } catch (error) {
                    console.error('Error clearing progress:', error);
                    // Still redirect even if there's an error
                    window.location.href = 'mental-health.html';
                }
            });
        }
    }

    async function checkPrerequisites() {
        const content = document.getElementById('prerequisites-content');
        content.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Checking requirements...</div>';

        let allChecksPassed = true;
        let checksHtml = '';

        try {
            // Check profile completion
            const profileResponse = await fetch(`${apiConfig.backendApiUrl}/api/user/profile/completion`, {
                method: 'GET',
                headers
            });

            if (profileResponse.ok) {
                const profileData = await profileResponse.json();
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
                checksHtml += `<div class="prerequisite error">
                    <i class="fas fa-times-circle"></i>
                    <span>Unable to check profile status (${profileResponse.status}). Please try again.</span>
                </div>`;
            }

            // Check recent mood
            const moodResponse = await fetch(`${apiConfig.backendApiUrl}/api/mood/recent`, {
                method: 'GET',
                headers
            });

            if (moodResponse.ok) {
                const moodData = await moodResponse.json();
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

        content.innerHTML = checksHtml;

        // Show/hide start assessment button based on prerequisites
        const startContainer = document.getElementById('start-assessment-container');
        if (allChecksPassed) {
            startContainer.style.display = 'block';
        } else {
            startContainer.style.display = 'none';
            // Add retry button
            setTimeout(() => {
                const retryBtn = document.createElement('button');
                retryBtn.className = 'btn-secondary';
                retryBtn.innerHTML = '<i class="fas fa-redo"></i> Retry Check';
                retryBtn.style.marginTop = '20px';
                retryBtn.onclick = () => checkPrerequisites();
                content.appendChild(retryBtn);
            }, 1000);
        }
    }

    async function loadAssessmentHistory() {
        const historyContainer = document.getElementById('assessment-history');
        
        try {
            const response = await fetch(`${apiConfig.backendApiUrl}/api/mental-health/reports`, {
                method: 'GET',
                headers
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data.length > 0) {
                    displayAssessmentHistory(data.data);
                } else {
                    showEmptyHistory();
                }
            } else {
                console.warn('Could not load assessment history');
                showEmptyHistory();
            }
        } catch (error) {
            console.error('Error loading assessment history:', error);
            showEmptyHistory();
        }
    }

    function displayAssessmentHistory(assessments) {
        const historyContainer = document.getElementById('assessment-history');
        
        const historyHtml = assessments.map(assessment => {
            const date = new Date(assessment.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const status = assessment.overallRisk ? 'complete' : 'processing';
            const statusText = status === 'complete' ? 'Complete' : 'Processing';
            const statusIcon = status === 'complete' ? 'fa-check-circle' : 'fa-clock';

            return `
                <div class="assessment-item">
                    <div class="assessment-info">
                        <div class="assessment-date">${date}</div>
                        <div class="assessment-status status-${status}">
                            <i class="fas ${statusIcon}"></i>
                            ${statusText}
                        </div>
                        ${status === 'complete' ? `
                            <div class="assessment-scores">
                                <div class="score-item">
                                    <i class="fas fa-brain"></i>
                                    <span>Depression: ${assessment.dass21.depression.score}</span>
                                </div>
                                <div class="score-item">
                                    <i class="fas fa-exclamation-triangle"></i>
                                    <span>Anxiety: ${assessment.dass21.anxiety.score}</span>
                                </div>
                                <div class="score-item">
                                    <i class="fas fa-chart-line"></i>
                                    <span>Stress: ${assessment.dass21.stress.score}</span>
                                </div>
                                <div class="score-item">
                                    <i class="fas fa-heart"></i>
                                    <span>Risk Level: ${assessment.overallRisk}</span>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    <div class="assessment-actions">
                        ${status === 'complete' ? `
                            <button class="btn-primary btn-small" onclick="viewReport('${assessment._id}')">
                                <i class="fas fa-eye"></i> View Report
                            </button>
                            <button class="btn-secondary btn-small" onclick="downloadReport('${assessment._id}')">
                                <i class="fas fa-download"></i> Download
                            </button>
                        ` : `
                            <button class="btn-secondary btn-small" disabled>
                                <i class="fas fa-spinner fa-spin"></i> Processing
                            </button>
                        `}
                    </div>
                </div>
            `;
        }).join('');

        historyContainer.innerHTML = `<div class="assessment-list">${historyHtml}</div>`;
    }

    function showEmptyHistory() {
        const historyContainer = document.getElementById('assessment-history');
        historyContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <h3>No Assessment History</h3>
                <p>You haven't completed any mental health assessments yet. Start your first assessment to track your mental wellness journey.</p>
            </div>
        `;
    }

    // Global functions for report actions
    window.viewReport = function(reportId) {
        if (!reportId) {
            showError('No report ID provided');
            return;
        }
        // Store report ID and redirect to view page
        sessionStorage.setItem('viewReportId', reportId);
        window.location.href = 'mental-report.html';
    };

    window.downloadReport = function(reportId) {
        showInfo('Download feature will be available soon.');
    };

    // Utility functions
    function showSuccess(message) {
        if (window.showSuccess) {
            window.showSuccess(message);
        } else {
            alert(message);
        }
    }

    function showError(message) {
        if (window.showError) {
            window.showError(message);
        } else {
            alert(message);
        }
    }

    function showInfo(message) {
        if (window.showInfo) {
            window.showInfo(message);
        } else {
            alert(message);
        }
    }
});
