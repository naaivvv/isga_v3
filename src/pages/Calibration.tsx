import { useState, useEffect } from "react";
import { Activity, Droplet, Wind, AlertCircle, Settings } from "lucide-react";
import Navbar from "@/components/Navbar";
import SystemStatus from "@/components/SystemStatus";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface CalibrationValues {
  co: number;
  co2: number;
  o2: number;
}

const Calibration = () => {
  const { toast } = useToast();
  const [calibrationValues, setCalibrationValues] = useState<CalibrationValues>({
    co: 0,
    co2: 0,
    o2: 20.9,
  });
  const [co2Input, setCo2Input] = useState("0");
  const [o2Input, setO2Input] = useState("20.9");
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);

  // Load calibration values from database on mount
  useEffect(() => {
    const fetchCalibration = async () => {
      try {
        const response = await fetch('http://192.168.1.10/chrono-state/php-backend/get_calibration.php');
        const data = await response.json();
        const values = {
          co: data.CO?.value || 0,
          co2: data.CO2?.value || 0,
          o2: data.O2?.value || 20.9,
        };
        setCalibrationValues(values);
        setCo2Input(values.co2.toString());
        setO2Input(values.o2.toString());
      } catch (error) {
        console.error('Error fetching calibration:', error);
      }
    };
    fetchCalibration();
  }, []);

  const handleCaptureCO = async () => {
    setIsCapturing(true);
    setCaptureProgress(0);

    const interval = setInterval(() => {
      setCaptureProgress((prev) => Math.min(prev + 20, 100));
    }, 1000);

    try {
      // Capture sensor data for 5 seconds
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Fetch current CO reading from database
      const response = await fetch('http://192.168.1.10/chrono-state/php-backend/get_sensor_data.php');
      const sensorData = await response.json();

      // Ensure numeric conversion
      const capturedValue = parseFloat(sensorData.co) || 0;

      // Save calibration to database
      await fetch('http://192.168.1.10/chrono-state/php-backend/save_calibration.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gas_type: 'CO', value: capturedValue }),
      });

      // Safely handle floating number formatting
      const newValues = { ...calibrationValues, co: capturedValue };
      setCalibrationValues(newValues);

      toast({
        title: "CO Calibration Complete",
        description: `Calibrated value: ${capturedValue.toFixed(2)} ppm`,
      });
    } catch (error) {
      console.error('Error capturing CO data:', error);
      toast({
        title: "Calibration Failed",
        description: "Failed to capture CO sensor data",
        variant: "destructive",
      });
    } finally {
      clearInterval(interval);
      setIsCapturing(false);
      setCaptureProgress(0);
    }
  };


  const handleSaveCO2 = async () => {
    const value = parseFloat(co2Input);
    if (isNaN(value) || value < 0) {
      toast({
        title: "Invalid Value",
        description: "Please enter a valid CO₂ calibration value",
        variant: "destructive",
      });
      return;
    }

    try {
      await fetch('http://192.168.1.10/chrono-state/php-backend/save_calibration.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gas_type: 'CO2', value }),
      });

      const newValues = { ...calibrationValues, co2: value };
      setCalibrationValues(newValues);
      toast({
        title: "CO₂ Calibration Saved",
        description: `Calibrated CO₂ value: ${value} ppm`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save CO₂ calibration",
        variant: "destructive",
      });
    }
  };

  const handleSaveO2 = async () => {
    const value = parseFloat(o2Input);
    if (isNaN(value) || value < 0 || value > 100) {
      toast({
        title: "Invalid Value",
        description: "Please enter a valid O₂ calibration value (0-100%)",
        variant: "destructive",
      });
      return;
    }

    try {
      await fetch('http://192.168.1.10/chrono-state/php-backend/save_calibration.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gas_type: 'O2', value }),
      });

      const newValues = { ...calibrationValues, o2: value };
      setCalibrationValues(newValues);
      toast({
        title: "O₂ Calibration Saved",
        description: `Calibrated O₂ value: ${value}%`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save O₂ calibration",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Calibration</h1>
          <p className="text-muted-foreground">System calibration and configuration</p>
        </header>

        <SystemStatus />

        <div className="grid gap-6 md:grid-cols-3">
          {/* Calibration Info */}
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle>Calibration Guidelines</CardTitle>
              <CardDescription>Best practices for accurate calibration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Perform calibration in a controlled environment</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Use certified calibration gases for accuracy</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Regular calibration ensures measurement accuracy</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Document all calibration values and dates</span>
                </p>
              </div>
            </CardContent>
          </Card>
          {/* CO Calibration - Automatic Capture */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-red-500" />
                Carbon Monoxide (CO)
              </CardTitle>
              <CardDescription>Automatic calibration from gas source</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-900">Important Setup Requirements</AlertTitle>
                <AlertDescription className="text-amber-800 text-sm">
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>Ensure your hardware is properly connected and powered</li>
                    <li>Verify calibration gas cylinder is properly set up</li>
                    <li>Check that gas lines are secure with no leaks</li>
                    <li>Allow system to stabilize before calibration</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Current Calibrated Value</p>
                <p className="text-2xl font-bold text-foreground">
                  {calibrationValues.co.toFixed(2)} <span className="text-base font-normal">ppm</span>
                </p>
              </div>

              {isCapturing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Capturing data...</span>
                    <span className="font-medium">{captureProgress}%</span>
                  </div>
                  <Progress value={captureProgress} className="h-2" />
                </div>
              )}

              <Button
                onClick={handleCaptureCO}
                disabled={isCapturing}
                className="w-full"
                size="lg"
              >
                <Settings className="w-4 h-4 mr-2" />
                {isCapturing ? "Capturing (5s)..." : "Capture CO Calibration"}
              </Button>
            </CardContent>
          </Card>

          {/* CO2 Calibration - Manual Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Droplet className="w-5 h-5 text-orange-500" />
                Carbon Dioxide (CO₂)
              </CardTitle>
              <CardDescription>Manual calibration value entry</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Current Calibrated Value</p>
                <p className="text-2xl font-bold text-foreground">
                  {calibrationValues.co2.toFixed(0)} <span className="text-base font-normal">ppm</span>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="co2-input">Enter Calibration Value (ppm)</Label>
                <Input
                  id="co2-input"
                  type="number"
                  value={co2Input}
                  onChange={(e) => setCo2Input(e.target.value)}
                  placeholder="Enter CO₂ value"
                  className="text-lg"
                />
              </div>

              <Button onClick={handleSaveCO2} className="w-full" size="lg">
                <Settings className="w-4 h-4 mr-2" />
                Save CO₂ Calibration
              </Button>
            </CardContent>
          </Card>

          {/* O2 Calibration - Manual Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wind className="w-5 h-5 text-primary" />
                Oxygen (O₂)
              </CardTitle>
              <CardDescription>Manual calibration value entry</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Current Calibrated Value</p>
                <p className="text-2xl font-bold text-foreground">
                  {calibrationValues.o2.toFixed(1)} <span className="text-base font-normal">%</span>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="o2-input">Enter Calibration Value (%)</Label>
                <Input
                  id="o2-input"
                  type="number"
                  step="0.1"
                  value={o2Input}
                  onChange={(e) => setO2Input(e.target.value)}
                  placeholder="Enter O₂ value"
                  className="text-lg"
                />
              </div>

              <Button onClick={handleSaveO2} className="w-full" size="lg">
                <Settings className="w-4 h-4 mr-2" />
                Save O₂ Calibration
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Calibration;
