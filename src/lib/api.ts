// API configuration for connecting to MySQL database via PHP backend
// Update this IP address to match your WAMP server IP
const API_BASE_URL = 'http://192.168.1.10/chrono-state/php-backend';
const ESP32_IP = 'http://192.168.0.111';

export interface SensorData {
  id: number | null;
  node_name: string;
  co: number;
  co2: number;
  o2: number;
  fan: number;
  compressor: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface ScheduleConfig {
  hours: number;
  minutes: number;
  active: number;
}

export interface CalibrationData {
  CO?: { value: number; updated_at: string };
  CO2?: { value: number; updated_at: string };
  O2?: { value: number; updated_at: string };
}

// Fetch latest sensor data from MySQL
export async function getSensorData(): Promise<SensorData> {
  try {
    const response = await fetch(`${API_BASE_URL}/get_sensor_data.php`);
    if (!response.ok) throw new Error('Failed to fetch sensor data');
    return await response.json();
  } catch (error) {
    console.error('Error fetching sensor data:', error);
    throw error;
  }
}

// Fetch schedule configuration from MySQL
export async function getSchedule(): Promise<ScheduleConfig> {
  try {
    const response = await fetch(`${API_BASE_URL}/get_schedule.php`);
    if (!response.ok) throw new Error('Failed to fetch schedule');
    return await response.json();
  } catch (error) {
    console.error('Error fetching schedule:', error);
    throw error;
  }
}

// Save schedule configuration to MySQL
export async function saveSchedule(config: ScheduleConfig): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/save_schedule.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });
    if (!response.ok) throw new Error('Failed to save schedule');
  } catch (error) {
    console.error('Error saving schedule:', error);
    throw error;
  }
}

// Fetch calibration data from MySQL
export async function getCalibration(): Promise<CalibrationData> {
  try {
    const response = await fetch(`${API_BASE_URL}/get_calibration.php`);
    if (!response.ok) throw new Error('Failed to fetch calibration');
    return await response.json();
  } catch (error) {
    console.error('Error fetching calibration:', error);
    throw error;
  }
}

// Save calibration value to MySQL
export async function saveCalibration(gasType: string, value: number): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/save_calibration.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ gas_type: gasType, value }),
    });
    if (!response.ok) throw new Error('Failed to save calibration');
  } catch (error) {
    console.error('Error saving calibration:', error);
    throw error;
  }
}

// Send manual control command to ESP32
export async function sendESP32Command(device: 'fan' | 'compressor', state: boolean): Promise<void> {
  try {
    const pin = device === 'fan' ? 0 : 1;
    const stateValue = state ? 1 : 0;
    const response = await fetch(`${ESP32_IP}/control?pin=${pin}&state=${stateValue}`, {
      method: 'GET',
    });
    if (!response.ok) throw new Error('Failed to send command to ESP32');
  } catch (error) {
    console.error('Error sending ESP32 command:', error);
    throw error;
  }
}

// Simulate reading CO sensor data (for calibration)
export async function captureCoSensorData(): Promise<number> {
  try {
    // Get current sensor reading from database
    const sensorData = await getSensorData();
    return sensorData.co;
  } catch (error) {
    console.error('Error capturing CO sensor data:', error);
    throw error;
  }
}
