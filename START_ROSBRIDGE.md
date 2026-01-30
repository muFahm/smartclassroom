# 🚀 Cara Menjalankan ROSbridge Server

## Langkah 1: Install ROSbridge (jika belum ada)

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install ros-humble-rosbridge-suite

# atau untuk ROS2 Foxy
sudo apt install ros-foxy-rosbridge-suite
```

## Langkah 2: Source ROS environment

```bash
source /opt/ros/humble/setup.bash
# atau
source /opt/ros/foxy/setup.bash
```

## Langkah 3: Jalankan ROSbridge Server

### Cara 1: Launch file (Recommended)
```bash
ros2 launch rosbridge_server rosbridge_websocket_launch.xml
```

### Cara 2: Run node langsung
```bash
ros2 run rosbridge_server rosbridge_websocket
```

### Cara 3: Dengan port custom
```bash
ros2 run rosbridge_server rosbridge_websocket --ros-args -p port:=9090
```

## Langkah 4: Verifikasi server running

```bash
# Cek di browser atau curl
curl http://10.41.197.10:9090

# Atau cek node list
ros2 node list
```

## 🔥 Troubleshooting

### Problem: Port already in use
```bash
# Cek process di port 9090
sudo lsof -i :9090
# Kill process
sudo kill -9 <PID>
```

### Problem: Firewall blocking
```bash
# Ubuntu - Allow port 9090
sudo ufw allow 9090/tcp
sudo ufw reload
```

### Problem: Cannot connect from external IP
Pastikan rosbridge listening di 0.0.0.0, bukan hanya localhost:
```bash
ros2 run rosbridge_server rosbridge_websocket --ros-args -p address:=0.0.0.0 -p port:=9090
```

## ✅ Test Connection

Buka file `test-rosbridge.html` di browser dan masukkan:
- URL: `ws://10.41.197.10:9090`
- Click "Test Connection"

Atau test dengan JavaScript di Console:
```javascript
let ws = new WebSocket('ws://10.41.197.10:9090');
ws.onopen = () => console.log('✅ Connected!');
ws.onerror = (e) => console.error('❌ Error:', e);
```

## 📝 Catatan Penting

1. **IP Address**: Pastikan `10.41.197.10` adalah IP yang benar
2. **Port**: Default ROSbridge adalah 9090
3. **Firewall**: Port harus terbuka di kedua sisi (server & client)
4. **Network**: Pastikan komputer bisa ping ke `10.41.197.10`

## 🎯 Auto-start ROSbridge (Optional)

Buat systemd service agar auto-start:

```bash
sudo nano /etc/systemd/system/rosbridge.service
```

Isi dengan:
```ini
[Unit]
Description=ROSbridge WebSocket Server
After=network.target

[Service]
Type=simple
User=your-username
Environment="ROS_DISTRO=humble"
ExecStart=/bin/bash -c 'source /opt/ros/humble/setup.bash && ros2 launch rosbridge_server rosbridge_websocket_launch.xml'
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable dan start:
```bash
sudo systemctl enable rosbridge
sudo systemctl start rosbridge
sudo systemctl status rosbridge
```
