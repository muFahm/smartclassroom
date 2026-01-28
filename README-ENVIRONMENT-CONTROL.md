# Integrasi ROS2 untuk Sensor Suhu & Cahaya dan Aktuator

## Overview

Sistem smartclassroom sekarang mendukung integrasi sensor lingkungan (suhu & cahaya) dan kontrol aktuator (AC & Lampu) melalui ROS2. Data sensor dari ESP32 dapat ditampilkan secara real-time di dashboard, dan dosen dapat mengontrol suhu ruangan dan pencahayaan langsung dari UI.

## Arsitektur Sistem

```
┌─────────────────────┐         ┌──────────────────┐         ┌─────────────────────┐
│   ESP32 Sensor      │  ROS2   │   ROSBridge      │  WS     │   React Frontend    │
│   (DHT + LDR)       │ ───────>│   WebSocket      │ ───────>│   (Dashboard)       │
│                     │  Topic  │   (Port 9090)    │         │                     │
└─────────────────────┘         └──────────────────┘         └─────────────────────┘
                                        ▲                             │
                                        │                             │
┌─────────────────────┐                 │                             │ Command
│   Aktuator          │  ROS2           │                             ▼
│   (AC, Lampu)       │ <───────────────┴─────────────────────────────┘
└─────────────────────┘  Topic
```

## Koneksi Jaringan

### Pertanyaan: Apakah harus 1 Network?

**Ya, untuk ROS2 default (DDS-based)**, perangkat harus berada dalam network yang sama karena ROS2 menggunakan multicast discovery.

### Solusi untuk Cross-Network:

1. **Same Network (Paling Mudah)**
   - Dashboard dan ROS2 Ubuntu di network yang sama
   - Gunakan IP address Ubuntu sebagai ROSBridge URL

2. **ROSBridge + WebSocket (Recommended untuk Web)**
   - Install `rosbridge_suite` di Ubuntu
   - Expose topics melalui WebSocket
   - Dashboard connect via `ws://<ubuntu-ip>:9090`

3. **Zenoh Bridge (Advanced)**
   - Untuk komunikasi cross-network dengan NAT traversal

## Topic ROS2

### Sensor Data (Subscribe)

**Topic**: `/ILUMINATIONS_AND_TEMPERATURE`
**Message Type**: `std_msgs/msg/String`

Format message:
```
ID: ESP32-Rodrick | Lux: 99.17 | Temp: 24.45
```

### Actuator Commands (Publish)

**Topic AC**: `/smartclassroom/actuator/ac/command`
**Topic Lampu**: `/smartclassroom/actuator/light/command`
**Message Type**: `std_msgs/msg/String` (JSON)

Format AC Command:
```json
{
  "device_id": "AC-Room701",
  "action": "set_temp",    // "set_temp" | "power" | "mode"
  "value": 24,             // temperature | "on"/"off" | "cool"/"heat"/"fan"
  "timestamp": 1706441600000
}
```

Format Light Command:
```json
{
  "device_id": "LIGHT-Room701",
  "action": "brightness",  // "brightness" | "power" | "color_temp"
  "value": 80,             // 0-100 | "on"/"off" | 2700-6500 (Kelvin)
  "timestamp": 1706441600000
}
```

## Setup di Ubuntu (ROS2)

### 1. Install ROSBridge Suite

```bash
# ROS2 Humble/Galactic
sudo apt-get install ros-${ROS_DISTRO}-rosbridge-suite

# Atau build from source
cd ~/ros2_ws/src
git clone https://github.com/RobotWebTools/rosbridge_suite.git -b ros2
cd ~/ros2_ws
colcon build --packages-select rosbridge_suite
```

### 2. Launch ROSBridge WebSocket

```bash
# Source ROS2
source /opt/ros/${ROS_DISTRO}/setup.bash
source ~/ros2_ws/install/setup.bash

# Launch rosbridge
ros2 launch rosbridge_server rosbridge_websocket_launch.xml

# Default port: 9090
# URL: ws://<ubuntu-ip>:9090
```

### 3. Test Connection

```bash
# Test dengan wscat
npm install -g wscat
wscat -c ws://localhost:9090

# Atau dari browser
# Buka console dan jalankan:
const ws = new WebSocket('ws://<ubuntu-ip>:9090');
ws.onopen = () => console.log('Connected!');
```

## Setup di Frontend React

### 1. Konfigurasi ROSBridge URL

Di browser, akses dashboard dan masuk ke menu **Suhu & Cahaya**. Klik icon ⚙️ untuk mengatur URL ROSBridge:

```
ws://<ubuntu-ip>:9090
```

Atau set via localStorage:
```javascript
localStorage.setItem('rosbridge_url', 'ws://192.168.1.100:9090');
```

### 2. Install roslib (Opsional, untuk implementasi penuh)

```bash
cd smartclassroom/frontend
npm install roslib
```

Kemudian uncomment kode ROSLIB di `src/services/environmentService.js`

## File yang Dibuat/Dimodifikasi

### File Baru

1. **`src/services/environmentService.js`**
   - Service untuk koneksi ROS2 environment sensors
   - Fungsi subscribe ke topic sensor
   - Fungsi publish command ke aktuator
   - Parsing data sensor
   - Simulasi data (untuk development tanpa ROS2)

2. **`src/components/EnvironmentControl.jsx`**
   - UI controller suhu dan cahaya di main area
   - Kontrol AC: power, temperature, mode
   - Kontrol Lampu: power, brightness, color temperature
   - Quick actions (Mode Nyaman, Mode Presentasi, dll)

3. **`src/components/EnvironmentControl.css`**
   - Styling untuk komponen EnvironmentControl

### File yang Dimodifikasi

1. **`src/components/Suhu.jsx`**
   - Terintegrasi dengan `environmentService`
   - Menampilkan data real-time dari ROS2
   - Status koneksi (Live/Offline)
   - Device ID

2. **`src/components/Cahaya.jsx`**
   - Terintegrasi dengan `environmentService`
   - Menampilkan data real-time dari ROS2
   - Level indicator (Redup/Normal/Terang)
   - Status koneksi

3. **`src/components/Suhu.css`**
   - Styling untuk status koneksi
   - Indikator warna berdasarkan suhu

4. **`src/components/Cahaya.css`**
   - Styling untuk status koneksi
   - Indikator warna berdasarkan intensitas cahaya

5. **`src/pages/dashboard/DashboardHome.jsx`**
   - Menambahkan mode `light-temp`
   - Import `EnvironmentControl` component

6. **`src/Dashboard.jsx`**
   - Update modeMap untuk `light-temp`

7. **`src/config/ros2Topics.js`**
   - Menambahkan topics untuk environment sensors dan actuators

## Cara Mengakses Fitur

1. Login sebagai dosen
2. Masuk ke dashboard kelas
3. Di sidebar kiri, klik menu **"Suhu & Cahaya"** di dropdown Manajemen Kelas
4. Main area akan menampilkan:
   - Status sensor real-time (Suhu & Lux)
   - Kontrol AC
   - Kontrol Lampu
   - Quick actions

## Untuk Tim Hardware/ROS2

### Yang Perlu Diimplementasikan:

1. **Publisher Sensor**
   - Publish data sensor ke topic `/ILUMINATIONS_AND_TEMPERATURE`
   - Format: `ID: {device_id} | Lux: {lux_value} | Temp: {temp_value}`
   - Interval: setiap 1-3 detik

2. **Subscriber Aktuator**
   - Subscribe ke topic `/smartclassroom/actuator/ac/command`
   - Subscribe ke topic `/smartclassroom/actuator/light/command`
   - Parse JSON message dan kirim ke hardware

3. **Publisher Status Aktuator (Opsional)**
   - Publish status aktual aktuator ke:
     - `/smartclassroom/actuator/ac/status`
     - `/smartclassroom/actuator/light/status`

### Contoh Publisher Python

```python
import rclpy
from rclpy.node import Node
from std_msgs.msg import String

class SensorPublisher(Node):
    def __init__(self):
        super().__init__('sensor_publisher')
        self.publisher = self.create_publisher(String, '/ILUMINATIONS_AND_TEMPERATURE', 10)
        self.timer = self.create_timer(2.0, self.publish_sensor_data)
        
    def publish_sensor_data(self):
        # Baca data dari sensor ESP32
        lux = read_lux_sensor()  # implementasi sesuai hardware
        temp = read_temp_sensor()  # implementasi sesuai hardware
        
        msg = String()
        msg.data = f'ID: ESP32-Classroom | Lux: {lux:.2f} | Temp: {temp:.2f}'
        self.publisher.publish(msg)
        self.get_logger().info(f'Published: {msg.data}')

def main():
    rclpy.init()
    node = SensorPublisher()
    rclpy.spin(node)
    rclpy.shutdown()

if __name__ == '__main__':
    main()
```

### Contoh Subscriber Python untuk Aktuator

```python
import rclpy
from rclpy.node import Node
from std_msgs.msg import String
import json

class ActuatorSubscriber(Node):
    def __init__(self):
        super().__init__('actuator_subscriber')
        
        self.ac_sub = self.create_subscription(
            String,
            '/smartclassroom/actuator/ac/command',
            self.ac_callback,
            10
        )
        
        self.light_sub = self.create_subscription(
            String,
            '/smartclassroom/actuator/light/command',
            self.light_callback,
            10
        )
        
    def ac_callback(self, msg):
        try:
            command = json.loads(msg.data)
            action = command.get('action')
            value = command.get('value')
            
            self.get_logger().info(f'AC Command: {action} = {value}')
            
            # Implementasi kontrol hardware AC
            if action == 'power':
                # control_ac_power(value == 'on')
                pass
            elif action == 'set_temp':
                # control_ac_temperature(value)
                pass
            elif action == 'mode':
                # control_ac_mode(value)
                pass
                
        except json.JSONDecodeError as e:
            self.get_logger().error(f'Invalid JSON: {e}')
            
    def light_callback(self, msg):
        try:
            command = json.loads(msg.data)
            action = command.get('action')
            value = command.get('value')
            
            self.get_logger().info(f'Light Command: {action} = {value}')
            
            # Implementasi kontrol hardware lampu
            if action == 'power':
                # control_light_power(value == 'on')
                pass
            elif action == 'brightness':
                # control_light_brightness(value)  # 0-100
                pass
            elif action == 'color_temp':
                # control_light_color_temp(value)  # 2700-6500K
                pass
                
        except json.JSONDecodeError as e:
            self.get_logger().error(f'Invalid JSON: {e}')

def main():
    rclpy.init()
    node = ActuatorSubscriber()
    rclpy.spin(node)
    rclpy.shutdown()

if __name__ == '__main__':
    main()
```

## Mode Development (Tanpa ROS2)

Jika ROSBridge tidak tersedia, sistem akan otomatis menggunakan **data simulasi**:
- Data suhu: 22-28°C (random)
- Data lux: 80-120 (random)
- Update setiap 3 detik

Untuk test manual:
```javascript
// Di browser console
import { simulateSensorData } from './services/environmentService';
simulateSensorData('ID: ESP32-Test | Lux: 150.00 | Temp: 25.50');
```

## Troubleshooting

### 1. Tidak bisa connect ke ROSBridge
- Pastikan rosbridge_server berjalan di Ubuntu
- Cek firewall: `sudo ufw allow 9090`
- Pastikan URL benar (gunakan IP, bukan localhost jika beda mesin)

### 2. Data sensor tidak muncul
- Cek apakah publisher aktif: `ros2 topic list`
- Cek data: `ros2 topic echo /ILUMINATIONS_AND_TEMPERATURE`
- Pastikan format message sesuai

### 3. Command aktuator tidak diterima
- Cek subscriber aktif
- Cek log rosbridge untuk error
- Pastikan topic name sama persis
