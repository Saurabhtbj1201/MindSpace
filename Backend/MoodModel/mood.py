from flask import Flask, request, jsonify
import cv2
import numpy as np
from keras.models import load_model
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS to allow frontend requests

# Load the pre-trained model and Haar cascade
model = load_model('model_file_30epochs.h5')
faceDetect = cv2.CascadeClassifier('haarcascade_frontalface_default.xml')
labels_dict = {0: 'Angry', 1: 'Disgust', 2: 'Fear', 3: 'Happy', 4: 'Neutral', 5: 'Sad', 6: 'Surprise'}

@app.route('/predict_emotion', methods=['POST'])
def predict_emotion():
    try:
        print("Received prediction request")
        print("Files in request:", request.files.keys())
        print("Form data in request:", request.form.keys())
        
        # Check if an image file is included in the request
        if 'image' not in request.files:
            print("No 'image' field found in request")
            return jsonify({'error': 'No image provided'}), 400

        # Read the image file
        file = request.files['image']
        print(f"Received file: {file.filename}, content type: {file.content_type}")
        
        if file.filename == '':
            print("Empty filename")
            return jsonify({'error': 'No image file selected'}), 400
            
        npimg = np.frombuffer(file.read(), np.uint8)
        print(f"Image buffer size: {len(npimg)}")
        
        frame = cv2.imdecode(npimg, cv2.IMREAD_COLOR)
        
        if frame is None:
            print("Failed to decode image")
            return jsonify({'error': 'Invalid image format'}), 400
            
        print(f"Image shape: {frame.shape}")

        # Convert to grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        # Detect faces
        faces = faceDetect.detectMultiScale(gray, 1.3, 3)
        print(f"Detected {len(faces)} faces")

        if len(faces) == 0:
            return jsonify({'error': 'No face detected'}), 400

        # Process the first detected face
        for x, y, w, h in faces:
            sub_face_img = gray[y:y+h, x:x+w]
            resized = cv2.resize(sub_face_img, (48, 48))
            normalize = resized / 255.0
            reshaped = np.reshape(normalize, (1, 48, 48, 1))
            result = model.predict(reshaped)
            label = int(np.argmax(result, axis=1)[0])  # Convert np.int64 to Python int
            emotion = labels_dict[label]
            print(f"Predicted emotion: {emotion} (label: {label})")
            return jsonify({'mood': label, 'moodLabel': emotion})

        return jsonify({'error': 'No face processed'}), 400

    except Exception as e:
        print(f"Error in predict_emotion: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)