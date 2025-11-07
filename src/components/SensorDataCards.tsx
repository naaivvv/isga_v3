import { useEffect, useState } from "react";
import { Activity, Droplet, Wind } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface CalibrationData {
  correction_slope: number;
  correction_intercept: number;
  passed: number;
}

const SensorDataCards = () => {
  const [coLevel, setCoLevel] = useState(0);
  const [co2Level, setCo2Level] = useState(0);
  const [o2Level, setO2Level] = useState(0);
  
  // Calibration correction factors
  const [coCalibration, setCoCalibration] = useState<CalibrationData>({ correction_slope: 1, correction_intercept: 0, passed: 0 });
  const [co2Calibration, setCo2Calibration] = useState<CalibrationData>({ correction_slope: 1, correction_intercept: 0, passed: 0 });
  const [o2Calibration, setO2Calibration] = useState<CalibrationData>({ correction_slope: 1, correction_intercept: 0, passed: 0 });

  // Load calibration data on mount
  useEffect(() => {
    const fetchCalibration = async () => {
      try {
        const response = await fetch("http://192.168.1.10/chrono-state/php-backend/get_unified_calibration.php");
        const data = await response.json();
        
        if (data.CO) {
          setCoCalibration({
            correction_slope: data.CO.correction_slope || 1,
            correction_intercept: data.CO.correction_intercept || 0,
            passed: data.CO.passed || 0
          });
        }
        if (data.CO2) {
          setCo2Calibration({
            correction_slope: data.CO2.correction_slope || 1,
            correction_intercept: data.CO2.correction_intercept || 0,
            passed: data.CO2.passed || 0
          });
        }
        if (data.O2) {
          setO2Calibration({
            correction_slope: data.O2.correction_slope || 1,
            correction_intercept: data.O2.correction_intercept || 0,
            passed: data.O2.passed || 0
          });
        }
      } catch (error) {
        console.error("Error fetching calibration data:", error);
      }
    };
    fetchCalibration();
  }, []);

  // Fetch sensor data and apply calibration
  useEffect(() => {
    const fetchSensorData = async () => {
      try {
        const response = await fetch("http://192.168.1.10/chrono-state/php-backend/get_sensor_data.php");
        const data = await response.json();

        // Get raw sensor values
        const coRaw = Number(data.co) || 0;
        const co2ppmRaw = Number(data.co2) || 0;
        const o2Raw = Number(data.o2) || 0;

        // Convert CO2 ppm → percent
        const co2percentRaw = co2ppmRaw / 10000;

        // Apply linear regression calibration: calibrated = raw * slope + intercept
        const coCalibrated = coRaw * coCalibration.correction_slope + coCalibration.correction_intercept;
        const co2Calibrated = co2percentRaw * co2Calibration.correction_slope + co2Calibration.correction_intercept;
        const o2Calibrated = o2Raw * o2Calibration.correction_slope + o2Calibration.correction_intercept;

        setCoLevel(coCalibrated);
        setCo2Level(co2Calibrated);
        setO2Level(o2Calibrated);
      } catch (error) {
        console.error("Error fetching sensor data:", error);
      }
    };

    fetchSensorData();
    const interval = setInterval(fetchSensorData, 2000);
    return () => clearInterval(interval);
  }, [coCalibration, co2Calibration, o2Calibration]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
      {/* CO Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-red-500" />
              Carbon Monoxide (CO)
            </span>
          </CardTitle>
          <CardDescription>Current CO levels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-foreground">
                {coLevel.toFixed(1)}
              </span>
              <span className="text-muted-foreground">ppm</span>
            </div>
            <Progress value={coLevel} className="h-2" />
            <p className="text-sm text-muted-foreground">Safe limit: 50 ppm</p>
          </div>
        </CardContent>
      </Card>

      {/* CO2 Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Droplet className="w-5 h-5 text-orange-500" />
              Carbon Dioxide (CO₂)
            </span>
          </CardTitle>
          <CardDescription>Current CO₂ levels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-foreground">
                {co2Level.toFixed(2)}
              </span>
              <span className="text-muted-foreground">%</span>
            </div>
            <Progress value={(co2Level / 5) * 100} className="h-2" />
            <p className="text-sm text-muted-foreground">Safe limit: ≤ 0.5%</p>
          </div>
        </CardContent>
      </Card>

      {/* O2 Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Wind className="w-5 h-5 text-primary" />
              Oxygen (O₂)
            </span>
          </CardTitle>
          <CardDescription>Current O₂ levels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-foreground">
                {o2Level.toFixed(1)}
              </span>
              <span className="text-muted-foreground">%</span>
            </div>
            <Progress value={(o2Level / 21) * 100} className="h-2" />
            <p className="text-sm text-muted-foreground">Normal: 19.5–23.5%</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SensorDataCards;
