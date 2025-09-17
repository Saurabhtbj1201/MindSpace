document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        window.location.href = 'index.html';
        return;
    }

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
        setupEventListeners();
        
        // Check if we should generate a new report
        const urlParams = new URLSearchParams(window.location.search);
        const shouldGenerate = urlParams.get('generate') === 'true';
        
        if (shouldGenerate) {
            await generateNewReport();
        } else {
            await loadAssessmentHistory();
        }
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

        // New assessment button
        const newAssessmentBtn = document.getElementById('new-assessment-btn');
        if (newAssessmentBtn) {
            newAssessmentBtn.addEventListener('click', () => {
                window.location.href = 'mental-health.html';
            });
        }

        // Start first assessment button
        const startFirstBtn = document.getElementById('start-first-assessment');
        if (startFirstBtn) {
            startFirstBtn.addEventListener('click', () => {
                window.location.href = 'mental-health.html';
            });
        }

        // Refresh reports button
        const refreshBtn = document.getElementById('refresh-reports-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                loadAssessmentHistory();
            });
        }
    }

    async function generateNewReport() {
        const reportGenSection = document.getElementById('report-generation-section');
        const currentReportSection = document.getElementById('current-report-section');
        const historySection = document.getElementById('assessment-history-section');
        
        // Show generation section, hide others
        reportGenSection.style.display = 'block';
        currentReportSection.style.display = 'none';
        historySection.style.display = 'none';

        const progressDiv = document.getElementById('analysis-progress');
        const resultsDiv = document.getElementById('analysis-results');

        try {
            // Step 1: Load module progress
            updateProgressStep(progressDiv, 'fas fa-download', 'Loading assessment data...');
            
            const moduleProgress = await loadModuleProgress();
            if (!moduleProgress || !validateCompleteAssessment(moduleProgress)) {
                throw new Error('Incomplete assessment data. Please complete all modules first.');
            }

            // Step 2: Process assessment data
            updateProgressStep(progressDiv, 'fas fa-calculator', 'Processing assessment scores...');
            
            const formData = processModuleData(moduleProgress);

            // Step 3: Generate report
            updateProgressStep(progressDiv, 'fas fa-chart-line', 'Generating comprehensive report...');
            
            const reportData = await generateDetailedReport(formData);

            // Step 4: Auto-send email
            updateProgressStep(progressDiv, 'fas fa-envelope', 'Sending detailed report to your email...');
            
            await autoSendReportEmail(reportData);

            // Step 5: Display success and report
            updateProgressStep(progressDiv, 'fas fa-check-circle', 'Report generated successfully!', 'success');
            
            setTimeout(() => {
                // Hide generation section and show current report section
                reportGenSection.style.display = 'none';
                currentReportSection.style.display = 'block';
                
                const currentReportContent = document.getElementById('current-report-content');
                displayDetailedReport(currentReportContent, reportData);
                
                // Setup report actions
                setupReportActions(reportData);
                
                // Also show history section below
                setTimeout(() => {
                    historySection.style.display = 'block';
                    loadAssessmentHistory();
                }, 500);
            }, 2000);

        } catch (error) {
            console.error('Error generating report:', error);
            updateProgressStep(progressDiv, 'fas fa-exclamation-triangle', `Error: ${error.message}`, 'error');
            
            setTimeout(() => {
                window.location.href = 'mental-health.html';
            }, 3000);
        }
    }

    function updateProgressStep(container, iconClass, message, type = 'loading') {
        const className = type === 'error' ? 'progress-step error' : 'progress-step';
        const icon = type === 'loading' ? `${iconClass} fa-spin` : iconClass;
        
        container.innerHTML = `
            <div class="${className}">
                <i class="fas ${icon}"></i>
                <span>${message}</span>
            </div>
        `;
    }

    async function loadModuleProgress() {
        try {
            const response = await fetch(`${apiConfig.backendApiUrl}/api/mental-health/progress`, {
                method: 'GET',
                headers
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.success ? data.progress : null;
            }
            throw new Error('Failed to load assessment data');
        } catch (error) {
            console.error('Error loading module progress:', error);
            throw error;
        }
    }

    function validateCompleteAssessment(moduleProgress) {
        const requiredModules = ['vitals', 'dass21', 'gad7', 'phq9'];
        return requiredModules.every(module => moduleProgress[module]);
    }

    function processModuleData(moduleProgress) {
        // Process vitals and lifestyle
        const vitalsData = moduleProgress.vitals;
        const formData = {
            vitals: vitalsData.vitals,
            lifestyle: vitalsData.lifestyle,
            dass21: calculateDASS21Scores(moduleProgress.dass21),
            gad7: calculateGAD7Score(moduleProgress.gad7),
            phq9: calculatePHQ9Score(moduleProgress.phq9)
        };

        return formData;
    }

    async function generateDetailedReport(formData) {
        try {
            const response = await fetch(`${apiConfig.backendApiUrl}/api/mental-health/analyze`, {
                method: 'POST',
                headers,
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.success) {
                return result.data;
            } else {
                throw new Error(result.message || 'Failed to generate report');
            }

        } catch (error) {
            console.error('Error generating detailed report:', error);
            throw error;
        }
    }

    async function autoSendReportEmail(reportData) {
        try {
            const response = await fetch(`${apiConfig.backendApiUrl}/api/mental-health/email-report`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ reportId: reportData._id })
            });

            if (!response.ok) {
                throw new Error('Failed to send email');
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message || 'Email sending failed');
            }

            showSuccess('Detailed report has been sent to your email!');
            return true;

        } catch (error) {
            console.error('Error sending email:', error);
            showWarning('Report generated successfully, but email sending failed. You can manually send it later.');
            return false;
        }
    }

    function displayDetailedReport(container, reportData) {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const reportDate = new Date(reportData.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Check for emergency situations
        const isEmergency = reportData.overallRisk === 'severe' || reportData.overallRisk === 'high';

        let html = `
            <div class="report-metadata">
                <div class="report-info">
                    <h3>Report Information</h3>
                    <p><strong>Patient:</strong> ${userData.firstName} ${userData.lastName}</p>
                    <p><strong>Generated:</strong> ${reportDate}</p>
                    <p><strong>Report ID:</strong> ${reportData._id}</p>
                    <p><strong>Overall Risk Level:</strong> <span class="risk-${reportData.overallRisk}">${reportData.overallRisk.toUpperCase()}</span></p>
                </div>
            </div>
        `;

        if (isEmergency) {
            html += `
                <div class="emergency-notice">
                    <h3><i class="fas fa-exclamation-triangle"></i> Immediate Professional Support Recommended</h3>
                    <p>Your assessment indicates significant mental health concerns that require immediate attention. Please consider reaching out to a mental health professional or crisis support service.</p>
                    <div class="emergency-actions">
                        <a href="tel:9152987821" class="emergency-btn">
                            <i class="fas fa-phone"></i> Crisis Helpline: 9152987821
                        </a>
                        <a href="tel:112" class="emergency-btn">
                            <i class="fas fa-ambulance"></i> Emergency: 112
                        </a>
                        <a href="appointment.html" class="emergency-btn">
                            <i class="fas fa-calendar"></i> Book Counseling Session
                        </a>
                    </div>
                </div>
            `;
        }

        // Mental Health Assessment Results
        html += `
            <div class="report-section">
                <h3><i class="fas fa-brain"></i> Mental Health Assessment Results</h3>
                <div class="score-grid">
                    <div class="score-card ${reportData.dass21.depression.severity}">
                        <div class="score-value">${reportData.dass21.depression.score}</div>
                        <div class="score-label">Depression (DASS-21)</div>
                        <div class="score-severity">${reportData.dass21.depression.severity}</div>
                        <div class="score-description">
                            ${getScoreDescription('depression', reportData.dass21.depression.severity)}
                        </div>
                    </div>
                    <div class="score-card ${reportData.dass21.anxiety.severity}">
                        <div class="score-value">${reportData.dass21.anxiety.score}</div>
                        <div class="score-label">Anxiety (DASS-21)</div>
                        <div class="score-severity">${reportData.dass21.anxiety.severity}</div>
                        <div class="score-description">
                            ${getScoreDescription('anxiety', reportData.dass21.anxiety.severity)}
                        </div>
                    </div>
                    <div class="score-card ${reportData.dass21.stress.severity}">
                        <div class="score-value">${reportData.dass21.stress.score}</div>
                        <div class="score-label">Stress (DASS-21)</div>
                        <div class="score-severity">${reportData.dass21.stress.severity}</div>
                        <div class="score-description">
                            ${getScoreDescription('stress', reportData.dass21.stress.severity)}
                        </div>
                    </div>
                    <div class="score-card ${reportData.gad7.severity}">
                        <div class="score-value">${reportData.gad7.score}</div>
                        <div class="score-label">Generalized Anxiety</div>
                        <div class="score-severity">${reportData.gad7.severity}</div>
                        <div class="score-description">
                            ${getScoreDescription('gad7', reportData.gad7.severity)}
                        </div>
                    </div>
                    <div class="score-card ${reportData.phq9.severity}">
                        <div class="score-value">${reportData.phq9.score}</div>
                        <div class="score-label">Depression Screening</div>
                        <div class="score-severity">${reportData.phq9.severity}</div>
                        <div class="score-description">
                            ${getScoreDescription('phq9', reportData.phq9.severity)}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Health Vitals Analysis
        html += `
            <div class="report-section">
                <h3><i class="fas fa-heartbeat"></i> Health Vitals Analysis</h3>
                <div class="vitals-grid">
                    <div class="vital-card">
                        <div class="vital-icon">
                            <i class="fas fa-heart"></i>
                        </div>
                        <div class="vital-info">
                            <h4>Blood Pressure</h4>
                            <div class="vital-value">${reportData.vitals.systolic}/${reportData.vitals.diastolic} mmHg</div>
                            <div class="vital-status ${getVitalStatusClass('bp', reportData.vitals.systolic, reportData.vitals.diastolic)}">
                                ${getVitalStatusText('bp', reportData.vitals.systolic, reportData.vitals.diastolic)}
                            </div>
                        </div>
                    </div>
                    <div class="vital-card">
                        <div class="vital-icon">
                            <i class="fas fa-heartbeat"></i>
                        </div>
                        <div class="vital-info">
                            <h4>Heart Rate</h4>
                            <div class="vital-value">${reportData.vitals.heartRate} BPM</div>
                            <div class="vital-status ${getVitalStatusClass('hr', reportData.vitals.heartRate)}">
                                ${getVitalStatusText('hr', reportData.vitals.heartRate)}
                            </div>
                        </div>
                    </div>
                    <div class="vital-card">
                        <div class="vital-icon">
                            <i class="fas fa-bed"></i>
                        </div>
                        <div class="vital-info">
                            <h4>Sleep Duration</h4>
                            <div class="vital-value">${reportData.vitals.sleepDuration} hours</div>
                            <div class="vital-status ${getVitalStatusClass('sleep', reportData.vitals.sleepDuration)}">
                                ${getVitalStatusText('sleep', reportData.vitals.sleepDuration)}
                            </div>
                        </div>
                    </div>
                    ${reportData.vitals.temperature ? `
                    <div class="vital-card">
                        <div class="vital-icon">
                            <i class="fas fa-thermometer-half"></i>
                        </div>
                        <div class="vital-info">
                            <h4>Body Temperature</h4>
                            <div class="vital-value">${reportData.vitals.temperature}°F</div>
                            <div class="vital-status ${getVitalStatusClass('temp', reportData.vitals.temperature)}">
                                ${getVitalStatusText('temp', reportData.vitals.temperature)}
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;

        // Lifestyle Summary
        if (reportData.lifestyle) {
            html += `
                <div class="report-section">
                    <h3><i class="fas fa-running"></i> Lifestyle Summary</h3>
                    <div class="lifestyle-summary">
                        <div class="lifestyle-item">
                            <strong>Exercise Frequency:</strong> ${formatLifestyleValue(reportData.lifestyle.exerciseFrequency)}
                        </div>
                        <div class="lifestyle-item">
                            <strong>Smoking Status:</strong> ${formatLifestyleValue(reportData.lifestyle.smokingStatus)}
                        </div>
                        <div class="lifestyle-item">
                            <strong>Alcohol Consumption:</strong> ${formatLifestyleValue(reportData.lifestyle.alcoholConsumption)}
                        </div>
                        ${reportData.lifestyle.screenTime ? `
                        <div class="lifestyle-item">
                            <strong>Daily Screen Time:</strong> ${reportData.lifestyle.screenTime} hours
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        // Detailed Recommendations
        html += `
            <div class="report-section">
                <h3><i class="fas fa-lightbulb"></i> Personalized Recommendations</h3>
                <div class="recommendations-detailed">
                    ${reportData.recommendations && reportData.recommendations.length > 0 ? 
                        reportData.recommendations.map(rec => `
                            <div class="recommendation-item ${rec.priority}">
                                <div class="recommendation-header">
                                    <h4>${rec.title}</h4>
                                    <span class="priority-badge ${rec.priority}">${rec.priority}</span>
                                </div>
                                <div class="recommendation-category">${rec.category}</div>
                                <p>${rec.description}</p>
                            </div>
                        `).join('') : 
                        '<div class="no-recommendations">No specific recommendations at this time. Continue monitoring your mental health regularly.</div>'
                    }
                </div>
            </div>
        `;

        // Next Steps
        html += `
            <div class="report-section">
                <h3><i class="fas fa-route"></i> Next Steps</h3>
                <div class="next-steps">
                    ${generateNextSteps(reportData)}
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    function generateNextSteps(reportData) {
        const steps = [];
        
        if (reportData.overallRisk === 'severe' || reportData.overallRisk === 'high') {
            steps.push({
                icon: 'fas fa-user-md',
                title: 'Seek Professional Help',
                description: 'Schedule an appointment with a mental health professional or counselor immediately.'
            });
        }
        
        steps.push({
            icon: 'fas fa-chart-line',
            title: 'Continue Monitoring',
            description: 'Track your mood daily and retake this assessment in 2-4 weeks to monitor progress.'
        });
        
        steps.push({
            icon: 'fas fa-users',
            title: 'Join Support Groups',
            description: 'Connect with peer support groups and engage with our community resources.'
        });
        
        if (reportData.vitals.sleepDuration < 7 || reportData.vitals.sleepDuration > 9) {
            steps.push({
                icon: 'fas fa-bed',
                title: 'Improve Sleep Hygiene',
                description: 'Focus on establishing a consistent sleep routine and aim for 7-9 hours per night.'
            });
        }
        
        return steps.map(step => `
            <div class="step-item">
                <i class="${step.icon}"></i>
                <div>
                    <h4>${step.title}</h4>
                    <p>${step.description}</p>
                </div>
            </div>
        `).join('');
    }

    async function loadAssessmentHistory() {
        const historyLoading = document.getElementById('history-loading');
        const historyContent = document.getElementById('history-content');
        const noHistory = document.getElementById('no-history');
        
        try {
            historyLoading.style.display = 'flex';
            historyContent.style.display = 'none';
            noHistory.style.display = 'none';

            const response = await fetch(`${apiConfig.backendApiUrl}/api/mental-health/reports`, {
                method: 'GET',
                headers
            });

            if (response.ok) {
                const data = await response.json();
                
                if (data.success && data.data.length > 0) {
                    displayAssessmentHistory(historyContent, data.data);
                    historyContent.style.display = 'block';
                } else {
                    noHistory.style.display = 'block';
                }
            } else {
                throw new Error('Failed to load assessment history');
            }

        } catch (error) {
            console.error('Error loading assessment history:', error);
            showError('Failed to load assessment history. Please try again.');
        } finally {
            historyLoading.style.display = 'none';
        }
    }

    function displayAssessmentHistory(container, reports) {
        const historyHtml = reports.map(report => {
            const reportDate = new Date(report.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const isEmergency = report.overallRisk === 'severe' || report.overallRisk === 'high';

            return `
                <div class="history-item ${isEmergency ? 'emergency' : ''}">
                    <div class="history-header">
                        <div class="history-date">
                            <i class="fas fa-calendar"></i>
                            ${reportDate}
                        </div>
                        <div class="history-risk">
                            <span class="risk-badge risk-${report.overallRisk}">${report.overallRisk}</span>
                            ${isEmergency ? '<i class="fas fa-exclamation-triangle emergency-icon"></i>' : ''}
                        </div>
                    </div>
                    <div class="score-summary">
                        <span>Depression: ${report.dass21.depression.score} (${report.dass21.depression.severity})</span>
                        <span>Anxiety: ${report.dass21.anxiety.score} (${report.dass21.anxiety.severity})</span>
                        <span>Stress: ${report.dass21.stress.score} (${report.dass21.stress.severity})</span>
                        <span>GAD-7: ${report.gad7.score} (${report.gad7.severity})</span>
                        <span>PHQ-9: ${report.phq9.score} (${report.phq9.severity})</span>
                    </div>
                    <div class="history-actions">
                        <button class="btn-secondary" onclick="viewReport('${report._id}')">
                            <i class="fas fa-eye"></i> View Report
                        </button>
                        <button class="btn-secondary" onclick="emailReport('${report._id}')">
                            <i class="fas fa-envelope"></i> Email
                        </button>
                        <button class="btn-secondary" onclick="downloadReportPDF('${report._id}')">
                            <i class="fas fa-download"></i> PDF
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `<div class="history-list">${historyHtml}</div>`;
    }

    function setupReportActions(reportData) {
        // Email current report button
        const emailCurrentBtn = document.getElementById('email-current-report');
        if (emailCurrentBtn) {
            emailCurrentBtn.onclick = async function() {
                try {
                    // Show loading state
                    const originalText = emailCurrentBtn.innerHTML;
                    emailCurrentBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
                    emailCurrentBtn.disabled = true;

                    const response = await fetch(`${apiConfig.backendApiUrl}/api/mental-health/email-report`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({ reportId: reportData._id })
                    });

                    if (response.ok) {
                        showSuccess('Detailed report sent to your email successfully!');
                    } else {
                        throw new Error('Failed to send email');
                    }
                } catch (error) {
                    showError('Failed to send email. Please try again.');
                } finally {
                    // Reset button state
                    emailCurrentBtn.innerHTML = originalText;
                    emailCurrentBtn.disabled = false;
                }
            };
        }

        // Download PDF button
        const downloadBtn = document.getElementById('download-pdf');
        if (downloadBtn) {
            downloadBtn.onclick = async function() {
                try {
                    // Show loading state
                    const originalText = downloadBtn.innerHTML;
                    downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating PDF...';
                    downloadBtn.disabled = true;

                    // Generate PDF using client-side library
                    await generateAndDownloadPDF(reportData);
                    
                    showSuccess('PDF report downloaded successfully!');
                } catch (error) {
                    console.error('PDF download error:', error);
                    showError('Failed to download PDF. Please try again.');
                } finally {
                    // Reset button state
                    downloadBtn.innerHTML = originalText;
                    downloadBtn.disabled = false;
                }
            };
        }
    }

    // Generate PDF using jsPDF
    async function generateAndDownloadPDF(reportData) {
        // Load jsPDF dynamically if not already loaded
        if (typeof window.jsPDF === 'undefined') {
            await loadJsPDFLibrary();
        }

        // Access jsPDF correctly from the global window object
        const jsPDF = window.jsPDF?.jsPDF || window.jsPDF;
        
        if (!jsPDF) {
            throw new Error('Failed to load jsPDF library');
        }
        
        const doc = new jsPDF();
        
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const reportDate = new Date(reportData.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        let yPosition = 20;
        const lineHeight = 8;
        const pageHeight = 280;

        // Helper function to check if we need a new page
        function checkPageBreak() {
            if (yPosition > pageHeight) {
                doc.addPage();
                yPosition = 20;
            }
        }

        // Helper function to add text with word wrapping
        function addWrappedText(text, x, y, maxWidth) {
            const lines = doc.splitTextToSize(text, maxWidth);
            doc.text(lines, x, y);
            return lines.length * lineHeight;
        }

        // Add logo and header
        try {
            // Try to add logo image
            const logoImg = new Image();
            logoImg.crossOrigin = 'anonymous';
            logoImg.onload = function() {
                // Add logo if it loads successfully
                doc.addImage(logoImg, 'PNG', 15, 15, 15, 15);
                generatePDFContent();
            };
            logoImg.onerror = function() {
                // Continue without logo if it fails to load
                generatePDFContent();
            };
            logoImg.src = 'https://mind-space-beryl.vercel.app/images/ico.png';
        } catch (error) {
            // Continue without logo if there's an error
            generatePDFContent();
        }

        function generatePDFContent() {
            // Header with logo space reserved
            doc.setFontSize(24);
            doc.setTextColor(64, 115, 192);
            doc.text('MindSpace', 35, 25);
            
            doc.setFontSize(18);
            doc.text('Mental Health Report', 35, 35);
            
            doc.setFontSize(12);
            doc.setTextColor(100, 100, 100);
            doc.text('Comprehensive Mental Wellness Assessment', 35, 45);
            
            yPosition = 60;

            // Report Information
            doc.setFontSize(14);
            doc.setTextColor(64, 115, 192);
            doc.text('Report Information', 20, yPosition);
            yPosition += 10;

            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text(`Patient: ${userData.firstName} ${userData.lastName}`, 25, yPosition);
            yPosition += lineHeight;
            doc.text(`Generated: ${reportDate}`, 25, yPosition);
            yPosition += lineHeight;
            doc.text(`Report ID: ${reportData._id}`, 25, yPosition);
            yPosition += lineHeight;
            doc.text(`Overall Risk Level: ${reportData.overallRisk.toUpperCase()}`, 25, yPosition);
            yPosition += 15;

            checkPageBreak();

            // Emergency Notice
            const isEmergency = reportData.overallRisk === 'severe' || reportData.overallRisk === 'high';
            if (isEmergency) {
                doc.setFillColor(239, 68, 68);
                doc.rect(20, yPosition - 5, 170, 25, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(12);
                doc.text('IMMEDIATE PROFESSIONAL SUPPORT RECOMMENDED', 25, yPosition + 5);
                doc.setFontSize(9);
                doc.text('Your assessment indicates significant mental health concerns that require', 25, yPosition + 12);
                doc.text('immediate attention. Please reach out to a mental health professional.', 25, yPosition + 18);
                yPosition += 35;
                doc.setTextColor(0, 0, 0);
            }

            checkPageBreak();

            // Mental Health Assessment Results
            doc.setFontSize(14);
            doc.setTextColor(64, 115, 192);
            doc.text('Mental Health Assessment Results', 20, yPosition);
            yPosition += 15;

            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);

            const assessments = [
                { label: 'Depression (DASS-21)', score: reportData.dass21.depression.score, severity: reportData.dass21.depression.severity },
                { label: 'Anxiety (DASS-21)', score: reportData.dass21.anxiety.score, severity: reportData.dass21.anxiety.severity },
                { label: 'Stress (DASS-21)', score: reportData.dass21.stress.score, severity: reportData.dass21.stress.severity },
                { label: 'Generalized Anxiety (GAD-7)', score: reportData.gad7.score, severity: reportData.gad7.severity },
                { label: 'Depression Screening (PHQ-9)', score: reportData.phq9.score, severity: reportData.phq9.severity }
            ];

            assessments.forEach(assessment => {
                doc.text(`${assessment.label}: ${assessment.score} (${assessment.severity.toUpperCase()})`, 25, yPosition);
                yPosition += lineHeight;
            });
            yPosition += 10;

            checkPageBreak();

            // Health Vitals Analysis
            doc.setFontSize(14);
            doc.setTextColor(64, 115, 192);
            doc.text('Health Vitals Analysis', 20, yPosition);
            yPosition += 15;

            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text(`Blood Pressure: ${reportData.vitals.systolic}/${reportData.vitals.diastolic} mmHg`, 25, yPosition);
            yPosition += lineHeight;
            doc.text(`Heart Rate: ${reportData.vitals.heartRate} BPM`, 25, yPosition);
            yPosition += lineHeight;
            doc.text(`Sleep Duration: ${reportData.vitals.sleepDuration} hours`, 25, yPosition);
            yPosition += lineHeight;
            if (reportData.vitals.temperature) {
                doc.text(`Body Temperature: ${reportData.vitals.temperature}°F`, 25, yPosition);
                yPosition += lineHeight;
            }
            yPosition += 10;

            checkPageBreak();

            // Lifestyle Summary
            if (reportData.lifestyle) {
                doc.setFontSize(14);
                doc.setTextColor(64, 115, 192);
                doc.text('Lifestyle Summary', 20, yPosition);
                yPosition += 15;

                doc.setFontSize(10);
                doc.setTextColor(0, 0, 0);
                doc.text(`Exercise Frequency: ${formatLifestyleValue(reportData.lifestyle.exerciseFrequency)}`, 25, yPosition);
                yPosition += lineHeight;
                doc.text(`Smoking Status: ${formatLifestyleValue(reportData.lifestyle.smokingStatus)}`, 25, yPosition);
                yPosition += lineHeight;
                doc.text(`Alcohol Consumption: ${formatLifestyleValue(reportData.lifestyle.alcoholConsumption)}`, 25, yPosition);
                yPosition += lineHeight;
                if (reportData.lifestyle.screenTime) {
                    doc.text(`Daily Screen Time: ${reportData.lifestyle.screenTime} hours`, 25, yPosition);
                    yPosition += lineHeight;
                }
                yPosition += 10;
            }

            checkPageBreak();

            // Personalized Recommendations
            doc.setFontSize(14);
            doc.setTextColor(64, 115, 192);
            doc.text('Personalized Recommendations', 20, yPosition);
            yPosition += 15;

            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);

            if (reportData.recommendations && reportData.recommendations.length > 0) {
                reportData.recommendations.forEach((rec, index) => {
                    checkPageBreak();
                    doc.setFontSize(11);
                    doc.setTextColor(64, 115, 192);
                    doc.text(`${index + 1}. ${rec.title} (${rec.priority.toUpperCase()} PRIORITY)`, 25, yPosition);
                    yPosition += lineHeight;
                    
                    doc.setFontSize(9);
                    doc.setTextColor(100, 100, 100);
                    doc.text(`Category: ${rec.category}`, 30, yPosition);
                    yPosition += lineHeight;
                    
                    doc.setFontSize(10);
                    doc.setTextColor(0, 0, 0);
                    const descHeight = addWrappedText(rec.description, 30, yPosition, 150);
                    yPosition += descHeight + 5;
                });
            } else {
                doc.text('No specific recommendations at this time.', 25, yPosition);
                yPosition += lineHeight;
                doc.text('Continue monitoring your mental health regularly.', 25, yPosition);
                yPosition += lineHeight;
            }

            yPosition += 10;
            checkPageBreak();

            // Footer
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text('IMPORTANT DISCLAIMER:', 20, yPosition);
            yPosition += lineHeight;
            const disclaimerText = 'This report is generated by MindSpace AI system and is for informational purposes only. It should not be considered as a substitute for professional medical advice, diagnosis, or treatment. Please consult with a qualified healthcare professional for proper evaluation and treatment.';
            const disclaimerHeight = addWrappedText(disclaimerText, 20, yPosition, 170);
            yPosition += disclaimerHeight + 10;

            doc.text(`© ${new Date().getFullYear()} MindSpace. All rights reserved.`, 20, yPosition);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 120, yPosition);

            // Save the PDF
            const fileName = `MindSpace-Mental-Health-Report-${reportDate.replace(/[/:,]/g, '-')}.pdf`;
            doc.save(fileName);
        }
    }

    // Load jsPDF library dynamically
    function loadJsPDFLibrary() {
        return new Promise((resolve, reject) => {
            if (typeof window.jsPDF !== 'undefined') {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = () => {
                // Check if jsPDF is available in different possible locations
                if (window.jsPDF || (window.jspdf && window.jspdf.jsPDF)) {
                    // Normalize access to jsPDF
                    if (!window.jsPDF && window.jspdf && window.jspdf.jsPDF) {
                        window.jsPDF = window.jspdf.jsPDF;
                    }
                    resolve();
                } else {
                    reject(new Error('jsPDF failed to load properly'));
                }
            };
            script.onerror = () => {
                reject(new Error('Failed to load jsPDF library'));
            };
            document.head.appendChild(script);
        });
    }

    // Global functions for history actions
    window.viewReport = async function(reportId) {
        try {
            const response = await fetch(`${apiConfig.backendApiUrl}/api/mental-health/reports/${reportId}`, {
                method: 'GET',
                headers
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    const currentReportSection = document.getElementById('current-report-section');
                    const currentReportContent = document.getElementById('current-report-content');
                    
                    displayDetailedReport(currentReportContent, data.data);
                    setupReportActions(data.data);
                    currentReportSection.style.display = 'block';
                    currentReportSection.scrollIntoView({ behavior: 'smooth' });
                }
            } else {
                throw new Error('Failed to load report');
            }
        } catch (error) {
            showError('Failed to load report. Please try again.');
        }
    };

    window.emailReport = async function(reportId) {
        try {
            // Find the button that was clicked and show loading state
            const button = event.target.closest('button');
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            button.disabled = true;

            const response = await fetch(`${apiConfig.backendApiUrl}/api/mental-health/email-report`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ reportId })
            });

            if (response.ok) {
                showSuccess('Detailed report sent to your email successfully!');
            } else {
                throw new Error('Failed to send email');
            }
        } catch (error) {
            showError('Failed to send email. Please try again.');
        } finally {
            // Reset button state
            const button = event.target.closest('button');
            button.innerHTML = '<i class="fas fa-envelope"></i> Email';
            button.disabled = false;
        }
    };

    // Add global function for PDF download from history
    window.downloadReportPDF = async function(reportId) {
        try {
            // Find the button that was clicked and show loading state
            const button = event?.target?.closest('button');
            if (button) {
                const originalText = button.innerHTML;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';
                button.disabled = true;

                // Reset button state function
                const resetButton = () => {
                    if (button) {
                        button.innerHTML = '<i class="fas fa-download"></i> PDF';
                        button.disabled = false;
                    }
                };

                try {
                    // Get the report data first
                    const response = await fetch(`${apiConfig.backendApiUrl}/api/mental-health/reports/${reportId}`, {
                        method: 'GET',
                        headers
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.success) {
                            // Generate PDF using client-side library
                            await generateAndDownloadPDF(data.data);
                            showSuccess('PDF downloaded successfully!');
                        } else {
                            throw new Error('Failed to load report data');
                        }
                    } else {
                        throw new Error('Failed to load report data');
                    }
                } catch (innerError) {
                    showError('Failed to download PDF. Please try again.');
                    throw innerError;
                } finally {
                    resetButton();
                }
            } else {
                // If no button context, just try to download
                const response = await fetch(`${apiConfig.backendApiUrl}/api/mental-health/reports/${reportId}`, {
                    method: 'GET',
                    headers
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        await generateAndDownloadPDF(data.data);
                        showSuccess('PDF downloaded successfully!');
                    } else {
                        throw new Error('Failed to load report data');
                    }
                } else {
                    throw new Error('Failed to load report data');
                }
            }
        } catch (error) {
            console.error('PDF download error:', error);
            showError('Failed to download PDF. Please try again.');
        }
    };

    // Helper functions for score calculations (same as mental-health-modular.js)
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

    // Helper functions for report display
    function getScoreDescription(scale, severity) {
        const descriptions = {
            depression: {
                normal: 'No significant depression symptoms',
                mild: 'Mild depression symptoms present',
                moderate: 'Moderate depression requiring attention',
                severe: 'Severe depression requiring immediate care'
            },
            anxiety: {
                normal: 'No significant anxiety symptoms',
                mild: 'Mild anxiety symptoms present',
                moderate: 'Moderate anxiety requiring attention',
                severe: 'Severe anxiety requiring immediate care'
            },
            stress: {
                normal: 'Normal stress levels',
                mild: 'Mild stress symptoms',
                moderate: 'Moderate stress requiring management',
                severe: 'Severe stress requiring immediate attention'
            },
            gad7: {
                normal: 'No significant generalized anxiety',
                mild: 'Mild generalized anxiety',
                moderate: 'Moderate generalized anxiety',
                severe: 'Severe generalized anxiety'
            },
            phq9: {
                normal: 'No depression symptoms',
                minimal: 'Minimal depression symptoms',
                mild: 'Mild depression',
                moderate: 'Moderate depression',
                severe: 'Severe depression'
            }
        };
        return descriptions[scale]?.[severity] || '';
    }

    function getVitalStatusClass(type, value1, value2) {
        switch (type) {
            case 'bp':
                if (value1 < 120 && value2 < 80) return 'normal';
                if (value1 < 140 && value2 < 90) return 'elevated';
                return 'high';
            case 'hr':
                if (value1 >= 60 && value1 <= 100) return 'normal';
                return 'abnormal';
            case 'sleep':
                if (value1 >= 7 && value1 <= 9) return 'optimal';
                if (value1 >= 6 && value1 <= 10) return 'acceptable';
                return 'poor';
            case 'temp':
                if (value1 >= 97.8 && value1 <= 99.1) return 'normal';
                return 'abnormal';
            default:
                return 'normal';
        }
    }

    function getVitalStatusText(type, value1, value2) {
        switch (type) {
            case 'bp':
                if (value1 < 120 && value2 < 80) return 'Normal';
                if (value1 < 140 && value2 < 90) return 'Elevated';
                return 'High';
            case 'hr':
                if (value1 >= 60 && value1 <= 100) return 'Normal';
                return 'Abnormal';
            case 'sleep':
                if (value1 >= 7 && value1 <= 9) return 'Optimal';
                if (value1 >= 6 && value1 <= 10) return 'Acceptable';
                return 'Poor';
            case 'temp':
                if (value1 >= 97.8 && value1 <= 99.1) return 'Normal';
                return 'Abnormal';
            default:
                return 'Normal';
        }
    }

    function formatLifestyleValue(value) {
        if (!value) return 'Not specified';
        return value.charAt(0).toUpperCase() + value.slice(1).replace(/([A-Z])/g, ' $1');
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