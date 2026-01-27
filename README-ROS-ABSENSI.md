# Integrasi ROS2 Face Recognition untuk Sistem Absensi

## Overview

Sistem absensi smartclassroom telah disiapkan dengan placeholder untuk integrasi modul ML face recognition melalui ROS2. Dokumen ini menjelaskan cara mengintegrasikan modul face recognition Anda dengan frontend React.

## Arsitektur Sistem

```
┌─────────────────────┐         ┌──────────────────┐         ┌─────────────────────┐
│   ML Face Recog     │  ROS2   │   ROSBridge      │  WS     │   React Frontend    │
│   (Python/C++)      │ ───────>│   WebSocket      │ ───────>│   (attendanceService)│
│                     │         │   (Port 9090)    │         │                     │
└─────────────────────┘         └──────────────────┘         └─────────────────────┘
```

## File yang Sudah Disiapkan

### Frontend (React)

**Location**: `smartclassroom/frontend/src/services/attendanceService.js`

Service ini sudah menyediakan:
- ✅ Placeholder untuk ROS2 listener
- ✅ Handler untuk face recognition result
- ✅ Auto-update attendance ketika wajah terdeteksi
- ✅ Cache dan session management

**Location**: `smartclassroom/frontend/src/components/AbsensiManagement.jsx`

Komponen UI yang sudah siap:
- ✅ Tombol "Absen Wajah" untuk aktivasi face recognition
- ✅ Indikator status ketika ROS2 aktif
- ✅ Auto-update UI ketika wajah terdeteksi

## Format Message ROS2

### Topic yang Diharapkan

**Topic Name**: `/smartclassroom/face_recognition/result`

**Message Type**: `std_msgs/msg/String` atau custom message type

**Format JSON** (di dalam String message):

```json
{
  "nim": "064102500001",
  "name": "John Doe",
  "confidence": 0.95,
  "timestamp": 1706441600000
}
```

### Field Description

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `nim` | string | ✅ Yes | Nomor Induk Mahasiswa (unique identifier) |
| `name` | string | ⚠️ Optional | Nama mahasiswa (akan di-update jika belum ada) |
| `confidence` | float | ⚠️ Optional | Confidence score (0.0 - 1.0) |
| `timestamp` | number | ⚠️ Optional | Unix timestamp dalam milliseconds |

**Notes**:
- `nim` adalah field paling penting untuk matching dengan data mahasiswa
- `confidence` akan ditampilkan di UI untuk tracking akurasi
- `timestamp` akan di-generate otomatis jika tidak disediakan

## Setup ROS2 Bridge

### 1. Install ROSBridge Suite

```bash
# Ubuntu/ROS2
sudo apt-get install ros-${ROS_DISTRO}-rosbridge-suite

# Atau build from source
cd ~/ros2_ws/src
git clone https://github.com/RobotWebTools/rosbridge_suite.git
cd ~/ros2_ws
colcon build --packages-select rosbridge_suite
```

### 2. Launch ROSBridge WebSocket

```bash
# Source ROS2
source /opt/ros/${ROS_DISTRO}/setup.bash

# Launch rosbridge
ros2 launch rosbridge_server rosbridge_websocket_launch.xml

# Default port: 9090
# URL: ws://localhost:9090
```

### 3. Verify Connection

```bash
# Test dengan wscat
npm install -g wscat
wscat -c ws://localhost:9090

# Atau gunakan browser console
const ws = new WebSocket('ws://localhost:9090');
ws.onopen = () => console.log('Connected to ROS2 bridge');
```

## Implementasi di Frontend

### Step 1: Install Dependencies

```bash
cd smartclassroom/frontend
npm install roslib
```

### Step 2: Update attendanceService.js

File: `src/services/attendanceService.js`

**Cari function** `initROS2FaceRecognition()` (sekitar line 70-120)

**Replace placeholder code** dengan implementasi berikut:

```javascript
import ROSLIB from 'roslib';

let rosConnection = null;

export function initROS2FaceRecognition(onFaceDetected) {
  // Initialize ROS connection
  const ros = new ROSLIB.Ros({
    url: 'ws://localhost:9090' // Sesuaikan dengan IP ROS2 bridge
  });

  ros.on('connection', () => {
    console.log('✅ Connected to ROS2 bridge');
  });

  ros.on('error', (error) => {
    console.error('❌ ROS2 connection error:', error);
  });

  ros.on('close', () => {
    console.log('🔌 Disconnected from ROS2 bridge');
  });

  // Subscribe to face recognition topic
  const faceRecognitionTopic = new ROSLIB.Topic({
    ros: ros,
    name: '/smartclassroom/face_recognition/result',
    messageType: 'std_msgs/msg/String'
  });

  faceRecognitionTopic.subscribe((message) => {
    try {
      // Parse JSON data from message
      const data = JSON.parse(message.data);
      
      // Validate required fields
      if (!data.nim) {
        console.warn('⚠️ Face recognition result missing NIM:', data);
        return;
      }

      // Call the callback with face data
      onFaceDetected({
        nim: data.nim,
        name: data.name || null,
        confidence: data.confidence || 0.95,
        timestamp: data.timestamp || Date.now(),
      });

      console.log('👤 Face detected:', data);
    } catch (error) {
      console.error('Error parsing face recognition message:', error);
    }
  });

  // Store connection for cleanup
  rosConnection = { ros, topic: faceRecognitionTopic };
  
  // Register callback
  faceRecognitionCallbacks.push(onFaceDetected);

  // Return disconnect function
  return {
    disconnect: () => {
      if (faceRecognitionTopic) {
        faceRecognitionTopic.unsubscribe();
      }
      if (ros) {
        ros.close();
      }
      faceRecognitionCallbacks = faceRecognitionCallbacks.filter(cb => cb !== onFaceDetected);
      rosConnection = null;
      console.log('ROS2 Face Recognition disconnected');
    }
  };
}
```

### Step 3: Environment Configuration (Optional)

Tambahkan ke `.env` file:

```bash
REACT_APP_ROS_BRIDGE_URL=ws://localhost:9090
REACT_APP_FACE_RECOG_TOPIC=/smartclassroom/face_recognition/result
```

Update code untuk menggunakan env variables:

```javascript
const ros = new ROSLIB.Ros({
  url: process.env.REACT_APP_ROS_BRIDGE_URL || 'ws://localhost:9090'
});

const faceRecognitionTopic = new ROSLIB.Topic({
  ros: ros,
  name: process.env.REACT_APP_FACE_RECOG_TOPIC || '/smartclassroom/face_recognition/result',
  messageType: 'std_msgs/msg/String'
});
```

## Implementasi ML Face Recognition (Backend/ROS2)

### Python Publisher Example

```python
#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from std_msgs.msg import String
import json
import cv2
import numpy as np
from datetime import datetime

class FaceRecognitionNode(Node):
    def __init__(self):
        super().__init__('face_recognition_node')
        
        # Publisher untuk hasil face recognition
        self.publisher = self.create_publisher(
            String,
            '/smartclassroom/face_recognition/result',
            10
        )
        
        # Load your ML model here
        # self.model = load_your_model()
        
        self.get_logger().info('Face Recognition Node started')
    
    def publish_face_result(self, nim, name, confidence):
        """
        Publish face recognition result
        
        Args:
            nim (str): Nomor Induk Mahasiswa
            name (str): Nama mahasiswa
            confidence (float): Confidence score (0.0 - 1.0)
        """
        msg = String()
        
        result_data = {
            "nim": nim,
            "name": name,
            "confidence": round(confidence, 4),
            "timestamp": int(datetime.now().timestamp() * 1000)
        }
        
        msg.data = json.dumps(result_data)
        self.publisher.publish(msg)
        
        self.get_logger().info(f'Published: {nim} ({name}) - {confidence:.2%}')
    
    def process_frame(self, frame):
        """
        Process camera frame and detect faces
        Implement your ML model inference here
        """
        # Your face recognition logic here
        # detected_nim, detected_name, confidence = your_model.predict(frame)
        
        # Example:
        detected_nim = "064102500001"
        detected_name = "John Doe"
        confidence = 0.95
        
        if confidence > 0.85:  # Threshold
            self.publish_face_result(detected_nim, detected_name, confidence)

def main(args=None):
    rclpy.init(args=args)
    node = FaceRecognitionNode()
    
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
```

### C++ Publisher Example

```cpp
#include <rclcpp/rclcpp.hpp>
#include <std_msgs/msg/string.hpp>
#include <chrono>
#include <string>
#include <sstream>

class FaceRecognitionNode : public rclcpp::Node
{
public:
    FaceRecognitionNode() : Node("face_recognition_node")
    {
        publisher_ = this->create_publisher<std_msgs::msg::String>(
            "/smartclassroom/face_recognition/result", 10);
        
        RCLCPP_INFO(this->get_logger(), "Face Recognition Node started");
    }
    
    void publishFaceResult(const std::string& nim, const std::string& name, float confidence)
    {
        auto message = std_msgs::msg::String();
        
        // Create JSON string
        std::ostringstream json;
        json << "{"
             << "\"nim\":\"" << nim << "\","
             << "\"name\":\"" << name << "\","
             << "\"confidence\":" << confidence << ","
             << "\"timestamp\":" << std::chrono::duration_cast<std::chrono::milliseconds>(
                    std::chrono::system_clock::now().time_since_epoch()).count()
             << "}";
        
        message.data = json.str();
        publisher_->publish(message);
        
        RCLCPP_INFO(this->get_logger(), "Published: %s (%s) - %.2f", 
                    nim.c_str(), name.c_str(), confidence);
    }

private:
    rclcpp::Publisher<std_msgs::msg::String>::SharedPtr publisher_;
};

int main(int argc, char** argv)
{
    rclcpp::init(argc, argv);
    auto node = std::make_shared<FaceRecognitionNode>();
    rclcpp::spin(node);
    rclcpp::shutdown();
    return 0;
}
```

## Testing

### 1. Testing dengan simulateFaceDetection()

Untuk testing tanpa ROS2, gunakan fungsi simulator yang sudah disiapkan:

```javascript
// Di browser console atau React component
import { simulateFaceDetection } from '../services/attendanceService';

// Simulate face detection
simulateFaceDetection({
  nim: "064102500001",
  name: "John Doe",
  confidence: 0.95
});
```

### 2. Testing ROS2 Publisher (Command Line)

```bash
# Publish test message
ros2 topic pub /smartclassroom/face_recognition/result std_msgs/msg/String \
  '{data: "{\"nim\":\"064102500001\",\"name\":\"John Doe\",\"confidence\":0.95,\"timestamp\":1706441600000}"}'
```

### 3. Monitor Topic

```bash
# Listen to topic
ros2 topic echo /smartclassroom/face_recognition/result

# Check topic info
ros2 topic info /smartclassroom/face_recognition/result

# Check message rate
ros2 topic hz /smartclassroom/face_recognition/result
```

## Flow Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│ 1. Dosen klik "Absen Wajah" di UI                                  │
└───────────────────────────┬────────────────────────────────────────┘
                            │
                            v
┌────────────────────────────────────────────────────────────────────┐
│ 2. Frontend subscribe ke ROS2 topic                                │
│    - initROS2FaceRecognition() dipanggil                           │
│    - Koneksi ke ws://localhost:9090                                │
└───────────────────────────┬────────────────────────────────────────┘
                            │
                            v
┌────────────────────────────────────────────────────────────────────┐
│ 3. ML Model detect wajah dari kamera                               │
│    - Face detection & recognition                                  │
│    - Match dengan database training                                │
└───────────────────────────┬────────────────────────────────────────┘
                            │
                            v
┌────────────────────────────────────────────────────────────────────┐
│ 4. Publish ke ROS2 topic                                           │
│    - Topic: /smartclassroom/face_recognition/result                │
│    - Data: {nim, name, confidence, timestamp}                      │
└───────────────────────────┬────────────────────────────────────────┘
                            │
                            v
┌────────────────────────────────────────────────────────────────────┐
│ 5. Frontend terima message via WebSocket                           │
│    - Parse JSON dari message.data                                  │
│    - Validate NIM                                                  │
└───────────────────────────┬────────────────────────────────────────┘
                            │
                            v
┌────────────────────────────────────────────────────────────────────┐
│ 6. handleFaceRecognitionResult() dipanggil                         │
│    - Cari mahasiswa di session aktif                               │
│    - Update status ke "HADIR"                                      │
│    - Set markedBy: "face_recognition"                              │
│    - Save confidence score                                         │
└───────────────────────────┬────────────────────────────────────────┘
                            │
                            v
┌────────────────────────────────────────────────────────────────────┐
│ 7. UI otomatis update                                              │
│    - Status berubah menjadi "Hadir"                                │
│    - Badge "👤 95%" muncul (face recognition indicator)            │
│    - Statistik di-update                                           │
└────────────────────────────────────────────────────────────────────┘
```

## Troubleshooting

### Problem: Frontend tidak bisa connect ke ROS2 Bridge

**Solution**:
```bash
# Check if rosbridge is running
ros2 topic list | grep rosbridge

# Check port 9090
netstat -tulpn | grep 9090

# Try relaunch rosbridge
ros2 launch rosbridge_server rosbridge_websocket_launch.xml
```

### Problem: Message tidak terdeteksi di frontend

**Solution**:
1. Check browser console untuk error messages
2. Verify topic name exact match: `/smartclassroom/face_recognition/result`
3. Test dengan `ros2 topic echo` untuk melihat message format
4. Pastikan JSON format valid (use `JSON.parse()` test)

### Problem: NIM tidak match dengan mahasiswa di session

**Solution**:
1. Pastikan NIM format sama persis (12 digit)
2. Check data mahasiswa di console: `console.log(session.attendance)`
3. Verify case sensitivity
4. Test dengan NIM yang ada di jadwal hari itu

### Problem: CORS error atau WebSocket connection failed

**Solution**:
```bash
# Launch rosbridge dengan address 0.0.0.0
ros2 launch rosbridge_server rosbridge_websocket_launch.xml rosbridge_address:=0.0.0.0

# Atau edit launch file
# /opt/ros/${ROS_DISTRO}/share/rosbridge_server/launch/rosbridge_websocket_launch.xml
```

## Advanced Configuration

### Custom Message Type

Jika ingin menggunakan custom message type:

```bash
# Create custom message
cd ~/ros2_ws/src/smartclassroom_msgs/msg
```

**FaceRecognitionResult.msg**:
```
string nim
string name
float64 confidence
int64 timestamp
```

Update subscriber:
```javascript
const faceRecognitionTopic = new ROSLIB.Topic({
  ros: ros,
  name: '/smartclassroom/face_recognition/result',
  messageType: 'smartclassroom_msgs/msg/FaceRecognitionResult'
});

faceRecognitionTopic.subscribe((message) => {
  onFaceDetected({
    nim: message.nim,
    name: message.name,
    confidence: message.confidence,
    timestamp: message.timestamp,
  });
});
```

### Multiple Camera Support

Untuk support multiple kamera, gunakan topic dengan ID:

```
/smartclassroom/camera1/face_recognition/result
/smartclassroom/camera2/face_recognition/result
```

Update code untuk subscribe ke multiple topics.

### Security

Untuk production, tambahkan authentication:

```javascript
const ros = new ROSLIB.Ros({
  url: 'wss://your-secure-domain.com:9090',  // Use WSS (secure)
  // Add authentication if needed
});
```

Configure rosbridge dengan SSL certificate.

## Performance Tips

1. **Throttle Publishing**: Jangan publish terlalu sering untuk wajah yang sama
   ```python
   # Cache last detected NIM with timestamp
   if nim == last_detected_nim and (current_time - last_detect_time) < 5.0:
       return  # Skip if detected within 5 seconds
   ```

2. **Confidence Threshold**: Set minimum confidence di ML side
   ```python
   if confidence > 0.85:  # Only publish if confident enough
       publish_result(nim, name, confidence)
   ```

3. **Batch Processing**: Process multiple faces in single frame
   ```python
   detected_faces = detect_multiple_faces(frame)
   for face in detected_faces:
       if face.confidence > threshold:
           publish_result(face.nim, face.name, face.confidence)
   ```

## Monitoring & Logging

### Frontend Logging

Check browser console untuk:
- ✅ "Connected to ROS2 bridge"
- 👤 "Face detected: {nim}"
- ❌ Connection errors

### ROS2 Logging

```bash
# Monitor all topics
ros2 topic list

# Monitor specific topic with detailed info
ros2 topic echo /smartclassroom/face_recognition/result --verbose

# Check node info
ros2 node info /face_recognition_node

# Monitor bandwidth
ros2 topic bw /smartclassroom/face_recognition/result
```

## Contact & Support

Untuk pertanyaan atau issue, silakan hubungi:
- Frontend Team: [Your Contact]
- ML/ROS2 Team: [ML Team Contact]

## References

- [ROSBridge Documentation](http://wiki.ros.org/rosbridge_suite)
- [roslibjs Documentation](https://github.com/RobotWebTools/roslibjs)
- [ROS2 Python Client](https://docs.ros.org/en/rolling/Tutorials/Beginner-Client-Libraries/Writing-A-Simple-Py-Publisher-And-Subscriber.html)
- [Attendance Service Source Code](./smartclassroom/frontend/src/services/attendanceService.js)

---

**Last Updated**: January 28, 2026  
**Version**: 1.0.0
