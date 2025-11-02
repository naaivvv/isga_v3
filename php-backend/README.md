# PHP Backend Setup Instructions

## Installation Steps

1. **Copy PHP files to your WAMP server**
   - Copy all `.php` files to: `C:\wamp64\www\projectgas\`
   - Your directory structure should look like:
     ```
     C:\wamp64\www\projectgas\
     ├── sensorvalue.php (existing)
     ├── get_sensor_data.php
     ├── get_schedule.php
     ├── save_schedule.php
     ├── get_calibration.php
     └── save_calibration.php
     ```

2. **Create database tables**
   - Open phpMyAdmin (http://localhost/phpmyadmin)
   - Select your `isga` database
   - Go to SQL tab
   - Copy and paste the contents of `database.sql`
   - Click "Go" to execute

3. **Update your React app configuration**
   - Open `src/lib/api.ts` in your React project
   - Update the `API_BASE_URL` to match your WAMP server IP:
     ```typescript
     const API_BASE_URL = 'http://192.168.0.100/projectgas';
     ```

4. **Test the endpoints**
   - Get sensor data: http://192.168.0.100/projectgas/get_sensor_data.php
   - Get schedule: http://192.168.0.100/projectgas/get_schedule.php
   - Get calibration: http://192.168.0.100/projectgas/get_calibration.php

## ESP32 Communication
- Manual controls send commands directly to: `http://192.168.0.111/control`
- Format: `?pin=0&state=1` (pin: 0=Fan, 1=Compressor; state: 0=OFF, 1=ON)

## Notes
- Make sure WAMP server is running
- Ensure your firewall allows connections on port 80
- The ESP32 and your computer must be on the same network
