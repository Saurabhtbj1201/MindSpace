from tensorflow.keras.preprocessing.image import ImageDataGenerator
from keras.models import Sequential
from keras.layers import Dense,Dropout,Flatten
from keras.layers import Conv2D,MaxPooling2D
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import random

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes


train_data_dir='data/train/'
validation_data_dir='data/test/'


train_datagen = ImageDataGenerator(
					rescale=1./255,
					rotation_range=30,
					shear_range=0.3,
					zoom_range=0.3,
					horizontal_flip=True,
					fill_mode='nearest')

validation_datagen = ImageDataGenerator(rescale=1./255)

train_generator = train_datagen.flow_from_directory(
					train_data_dir,
					color_mode='grayscale',
					target_size=(48, 48),
					batch_size=32,
					class_mode='categorical',
					shuffle=True)

validation_generator = validation_datagen.flow_from_directory(
							validation_data_dir,
							color_mode='grayscale',
							target_size=(48, 48),
							batch_size=32,
							class_mode='categorical',
							shuffle=True)


class_labels=['Angry','Disgust', 'Fear', 'Happy','Neutral','Sad','Surprise']

img, label = train_generator.__next__()


model = Sequential()

model.add(Conv2D(32, kernel_size=(3, 3), activation='relu', input_shape=(48,48,1)))

model.add(Conv2D(64, kernel_size=(3, 3), activation='relu'))
model.add(MaxPooling2D(pool_size=(2, 2)))
model.add(Dropout(0.1))

model.add(Conv2D(128, kernel_size=(3, 3), activation='relu'))
model.add(MaxPooling2D(pool_size=(2, 2)))
model.add(Dropout(0.1))

model.add(Conv2D(256, kernel_size=(3, 3), activation='relu'))
model.add(MaxPooling2D(pool_size=(2, 2)))
model.add(Dropout(0.1))

model.add(Flatten())
model.add(Dense(512, activation='relu'))
model.add(Dropout(0.2))

model.add(Dense(7, activation='softmax'))

model.compile(optimizer = 'adam', loss='categorical_crossentropy', metrics=['accuracy'])
print(model.summary())


train_path = "data/train/"
test_path = "data/test"

num_train_imgs = 0
for root, dirs, files in os.walk(train_path):
    num_train_imgs += len(files)
    
num_test_imgs = 0
for root, dirs, files in os.walk(test_path):
    num_test_imgs += len(files)

print(num_train_imgs)
print(num_test_imgs)

epochs=30

history=model.fit(train_generator,
                steps_per_epoch=num_train_imgs//32,
                epochs=epochs,
                validation_data=validation_generator,
                validation_steps=num_test_imgs//32)

model.save('model_file.h5')


@app.route('/predict_emotion', methods=['POST'])
def predict_emotion():
    """
    Process image and return detected emotion.
    This is a simple implementation that returns random moods for testing.
    In a production environment, this would use the actual ML model.
    """
    try:
        # Check if an image file was included in the request
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        # Get the image file
        image_file = request.files['image']
        
        # Print some debugging information
        print(f"Received image: {image_file.filename}, {image_file.content_type}, {image_file.content_length} bytes")
        
        # Save the image for debugging (optional)
        debug_dir = 'debug_images'
        if not os.path.exists(debug_dir):
            os.makedirs(debug_dir)
        image_file.save(os.path.join(debug_dir, 'latest_capture.jpg'))
        
        # In a real implementation, we would process the image with the ML model here
        # For now, let's return a random mood
        moods = [
            {"mood": 0, "moodLabel": "Angry"},
            {"mood": 1, "moodLabel": "Disgust"},
            {"mood": 2, "moodLabel": "Fear"},
            {"mood": 3, "moodLabel": "Happy"},
            {"mood": 4, "moodLabel": "Neutral"},
            {"mood": 5, "moodLabel": "Sad"},
            {"mood": 6, "moodLabel": "Surprise"}
        ]
        
        # Choose a random mood (for testing purposes)
        random_mood = random.choice(moods)
        
        # Return the mood as JSON
        return jsonify({
            "mood": random_mood["mood"],
            "moodLabel": random_mood["moodLabel"]
        })
        
    except Exception as e:
        print(f"Error processing image: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Run the Flask app on port 5000
    print("Starting mood detection server on port 5000...")
    app.run(host='0.0.0.0', port=5000, debug=True)
