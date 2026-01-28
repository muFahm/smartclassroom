# ROS Config & Integrasi Topic (SmartClassroom)

Dokumen ini merangkum **semua konfigurasi ROS yang sudah ada** untuk fitur:
- **Environment (Light & Temperature)**
- **Polling Device**
- (Opsional) **Absensi Face Recognition** — sudah ada panduan terpisah

Tujuan: memudahkan rekan tim mengintegrasikan node ROS2, ROSBridge, dan/atau MQTT-ROS2 bridge ke topic yang sudah didefinisikan.

---

## 1) Sumber Konfigurasi (Single Source of Truth)

Gunakan file berikut sebagai acuan resmi nama topic, struktur pesan, dan konfigurasi koneksi:

- [smartclassroom/frontend/src/config/ros2Topics.js](smartclassroom/frontend/src/config/ros2Topics.js)
- [smartclassroom/frontend/src/services/environmentService.js](smartclassroom/frontend/src/services/environmentService.js)
- [smartclassroom/frontend/src/services/pollingDeviceService.js](smartclassroom/frontend/src/services/pollingDeviceService.js)
- (Absensi) [README-ROS-ABSENSI.md](README-ROS-ABSENSI.md)

> **Catatan**: File environment dan polling di frontend menggunakan **roslibjs** melalui **ROSBridge** (WebSocket). Untuk polling device, jalur **MQTT → ROS2 bridge** juga disiapkan.

---

## 2) Arsitektur Integrasi

### 2.1 Environment (Light & Temperature)
```
ESP32 Sensor/Actuator  →  ROS2  →  ROSBridge (ws://<ip>:9090)  →  React Frontend
```
Frontend subscribe sensor dan publish command ke topic actuator.

### 2.2 Polling Device
```
ESP32 Polling Device  →  HiveMQ Cloud (MQTT)  →  MQTT-ROS2 Bridge  →  ROS2 Topics
                                                                  →  Backend/Frontend
```
Untuk polling device, topik ROS2 disiapkan agar integrasi bisa dilakukan via bridge MQTT-ROS2.

---

## 3) Environment Topics (Light & Temp)

### 3.1 Sensor Data (Subscribe)
- **Topic**: `/ILUMINATIONS_AND_TEMPERATURE`
- **Type**: `std_msgs/msg/String`
- **Format payload** (string):
  ```
  ID: ESP32-Rodrick | Lux: 99.17 | Temp: 24.45
  ```
- **Parser di frontend**: `parseSensorMessage()` di [environmentService.js](smartclassroom/frontend/src/services/environmentService.js)

### 3.2 Actuator Command (Publish)
**AC Command**
- **Topic**: `/smartclassroom/actuator/ac/command`
- **Type**: `std_msgs/msg/String`
- **Payload JSON** (string):
  ```json
  {
    "device_id": "AC-Room701",
    "action": "set_temp",
    "value": 24,
    "timestamp": 1700000000000
  }
  ```
- **Action valid**: `set_temp` | `power` | `mode`

**Light Command**
- **Topic**: `/smartclassroom/actuator/light/command`
- **Type**: `std_msgs/msg/String`
- **Payload JSON** (string):
  ```json
  {
    "device_id": "LIGHT-Room701",
    "action": "brightness",
    "value": 75,
    "timestamp": 1700000000000
  }
  ```
- **Action valid**: `brightness` | `power` | `color_temp`

### 3.3 Actuator Status (Optional)
Topik status sudah disiapkan untuk feedback dari device:
- `/smartclassroom/actuator/ac/status`
- `/smartclassroom/actuator/light/status`

Struktur payload bisa mengikuti format command (JSON string) dengan tambahan `status`.

---

## 4) Polling Device Topics

Semua nama topic polling ada di [ros2Topics.js](smartclassroom/frontend/src/config/ros2Topics.js).

### 4.1 Device Management
- Register: `/smartclassroom/device/register`
- Status: `/smartclassroom/device/status`
- Heartbeat: `/smartclassroom/device/heartbeat`
- Disconnect: `/smartclassroom/device/disconnect`

**Contoh payload register (JSON string)**
```json
{
  "device_code": "A1B2",
  "student_nim": "064102500001",
  "timestamp": 1700000000000
}
```

**Contoh payload status (JSON string)**
```json
{
  "device_code": "A1B2",
  "status": "online",
  "battery_level": 87,
  "timestamp": 1700000000000
}
```

**Contoh payload heartbeat (JSON string)**
```json
{
  "type": "heartbeat",
  "device_id": "A1B2",
  "battery_level": 87,
  "rssi": -55,
  "ts": 1700000000000
}
```
> Payload heartbeat diproses oleh `handleDeviceHeartbeat()` di [pollingDeviceService.js](smartclassroom/frontend/src/services/pollingDeviceService.js).

### 4.2 Polling / Quiz
- Session Start: `/smartclassroom/polling/session/start`
- Session End: `/smartclassroom/polling/session/end`
- Question: `/smartclassroom/polling/question`
- Answer: `/smartclassroom/polling/answer`
- Answer Confirm: `/smartclassroom/polling/answer/confirm`
- Result: `/smartclassroom/polling/result`
- Statistics: `/smartclassroom/polling/statistics`

**Payload jawaban (JSON string)**
```json
{
  "device_code": "A1B2",
  "student_nim": "064102500001",
  "quiz_id": "QUIZ-2026-01",
  "question_id": "Q1",
  "answer": "B",
  "timestamp": 1700000000000
}
```

**Payload konfirmasi jawaban (JSON string)**
```json
{
  "device_code": "A1B2",
  "quiz_id": "QUIZ-2026-01",
  "question_id": "Q1",
  "status": "received",
  "timestamp": 1700000000000
}
```

---

## 5) Cara Menyambungkan (Step-by-Step)

### 5.1 ROSBridge untuk Frontend
Frontend environment & absensi menggunakan ROSBridge (WebSocket).

1. Pastikan ROS2 berjalan.
2. Jalankan ROSBridge WebSocket (port default 9090).
3. Di frontend, set URL:
   - Environment variable: `REACT_APP_ROSBRIDGE_URL` **atau**
   - Runtime UI (disimpan ke localStorage key `rosbridge_url`).

Konfigurasi url bisa dicek di:
- [environmentService.js](smartclassroom/frontend/src/services/environmentService.js)
- [attendanceService.js](smartclassroom/frontend/src/services/attendanceService.js)

### 5.2 MQTT → ROS2 Bridge untuk Polling Device
Polling device menggunakan HiveMQ Cloud. Konfigurasi broker ada di:
- [ros2Topics.js](smartclassroom/frontend/src/config/ros2Topics.js)

Yang perlu dilakukan di node bridge:
1. Subscribe MQTT dari broker HiveMQ dengan kredensial yang sesuai.
2. Map MQTT topic ke ROS2 topic **dengan nama yang sama** seperti di bagian 4.
3. Publish payload sebagai `std_msgs/msg/String` berisi JSON.

> Dengan mapping langsung nama topic, frontend/backend tidak perlu perubahan kode.

---

## 6) Catatan Absensi Face Recognition
Absensi face recognition sudah memiliki dokumen integrasi terpisah.
Silakan ikuti panduan di [README-ROS-ABSENSI.md](README-ROS-ABSENSI.md).

---

## 7) Checklist Integrasi Cepat

- [ ] ROS2 bridge aktif dan bisa diakses via `ws://<ip>:9090`
- [ ] Topic sensor `/ILUMINATIONS_AND_TEMPERATURE` publish string format yang benar
- [ ] Topic actuator publish JSON string sesuai format command
- [ ] MQTT-ROS2 bridge memetakan topic polling sesuai [ros2Topics.js](smartclassroom/frontend/src/config/ros2Topics.js)
- [ ] Device heartbeat mengirim payload (device_id, battery_level, rssi, ts)

---

## 8) Troubleshooting Singkat

- **Sensor tidak tampil di UI** → cek format string sensor persis `ID: ... | Lux: ... | Temp: ...`.
- **AC/Lampu tidak bereaksi** → pastikan payload JSON valid dan device_id benar.
- **Polling device tidak muncul** → periksa mapping MQTT → ROS2 dan nama topic.

---

Jika butuh tambahan detail message type custom (mis. `smartclassroom_msgs`), tinggal ditambahkan di dokumen ini tanpa mengubah topic name yang sudah dipakai.
