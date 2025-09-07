        // DOM elements
        const video = document.getElementById('video');
        const canvas = document.getElementById('canvas');
        const captureBtn = document.getElementById('captureBtn');
        const countdown = document.getElementById('countdown');
        const result = document.getElementById('result');
        const ctx = canvas.getContext('2d');

        // Set canvas dimensions to match video
        canvas.width = 640;
        canvas.height = 480;

        // Mood labels and colors
        const moods = [
            { label: 'Angry', color: '#ff4d4d', emoji: '😠' },
            { label: 'Disgust', color: '#9933ff', emoji: '🤢' },
            { label: 'Fear', color: '#ff9933', emoji: '😨' },
            { label: 'Happy', color: '#00cc66', emoji: '😄' },
            { label: 'Neutral', color: '#6699ff', emoji: '😐' },
            { label: 'Sad', color: '#6666ff', emoji: '😢' },
            { label: 'Surprise', color: '#ffcc00', emoji: '😲' }
        ];

        //data for the chart come from a database

        // Initialize mood history

        // Initialize chart

        // Access webcam
        async function initCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { width: 640, height: 480 } 
                });
                video.srcObject = stream;
                return stream;
            } catch (err) {
                console.error("Error accessing webcam:", err);
                result.textContent = "Error accessing webcam. Please check permissions.";
                captureBtn.disabled = true;
                return null;
            }
        }

        // Stop webcam
        function stopCamera(stream) {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                video.srcObject = null;
            }
        }

        // Capture mood function
        async function captureMood() {
            // Disable button during capture
            captureBtn.disabled = true;
            result.textContent = "Get ready...";
            
            // Start webcam
            const stream = await initCamera();
            if (!stream) {
                captureBtn.disabled = false;
                return;
            }

             // Show countdown
            countdown.style.display = 'block';
            
            let count = 5;
            countdown.textContent = count;
            
            const countdownInterval = setInterval(() => {
                count--;
                countdown.textContent = count;
                
                if (count <= 0) {
                    clearInterval(countdownInterval);
                    countdown.style.display = 'none';
                    
                    // Draw video frame to canvas
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    
                    // Send image to backend for analysis
                    analyzeMood(stream);
                }
            }, 1000);
        }
            
        // Analyze mood by sending image to backend
        function analyzeMood(stream) {
            // Show analyzing message
            result.textContent = "Analyzing mood...";
            
            // Convert canvas to blob
            canvas.toBlob(blob => {
                const formData = new FormData();
                formData.append('image', blob, 'capture.jpg');
                
                // Send image to backend
                fetch('http://localhost:5000/predict_emotion', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    // Stop camera
                    stopCamera(stream);
                    
                    if (data.error) {
                        result.textContent = `Error: ${data.error}`;
                        captureBtn.disabled = false;
                        return;
                    }
                    
                    const detectedMood = moods[data.mood];
                    
                    // Display result
                    result.innerHTML = `<span class="mood-emoji">${detectedMood.emoji}</span> You seem ${detectedMood.label}`;
                    
                    // Add to history
                    const now = new Date();
                    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    
                    moodHistory.unshift({
                        time: timeString,
                        mood: data.mood,
                        moodLabel: data.moodLabel
                    });
                    
                    // Update history display
                    updateHistoryList();
                    
                    // Update chart with new data point
                    if (moodData.labels.length >= 8) {
                        moodData.labels.shift();
                        moodData.data.shift();
                    }
                    
                    moodData.labels.push(timeString);
                    moodData.data.push(data.mood);
                    
                    moodChart.update();
                    
                    // Re-enable capture button
                    captureBtn.disabled = false;
                })
                .catch(error => {
                    console.error('Error:', error);
                    // Stop camera on error
                    stopCamera(stream);
                    result.textContent = "Error analyzing mood. Please try again.";
                    captureBtn.disabled = false;
                });
            }, 'image/jpeg');
        }

        // Update mood history list
        function updateHistoryList() {
            historyList.innerHTML = '';
            
            moodHistory.forEach(entry => {
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';
                
                historyItem.innerHTML = `
                    <span>${entry.time}</span>
                    <span><span class="mood-color ${entry.moodLabel.toLowerCase()}"></span>${entry.moodLabel}</span>
                `;
                
                historyList.appendChild(historyItem);
            });
        }

        // Initialize the app
        updateHistoryList();

        // Event listeners
        captureBtn.addEventListener('click', captureMood);