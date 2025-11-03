import { useState, useEffect } from "react";
import { Activity, Droplet, Wind, AlertCircle, Settings, CheckCircle, XCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import SystemStatus from "@/components/SystemStatus";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface CalibrationValues {
  co2: number;
  o2: number;
}

interface CoCalibrationData {
  gas_500: number[];
  gas_100: number[];
  gas_50: number[];
  t_value: number | null;
  passed: boolean | null;
  correction_slope: number;
  correction_intercept: number;
}

type CalibrationStep = 'idle' | '500ppm' | '100ppm' | '50ppm' | 'computing' | 'complete';

const Calibration = () => {
  const { toast } = useToast();
  const [calibrationValues, setCalibrationValues] = useState<CalibrationValues>({
    co2: 0,
    o2: 20.9,
  });
  const [co2Input, setCo2Input] = useState("0");
  const [o2Input, setO2Input] = useState("20.9");
  
  // CO Calibration state
  const [coCalibrationStep, setCoCalibrationStep] = useState<CalibrationStep>('idle');
  const [coCalibrationData, setCoCalibrationData] = useState<CoCalibrationData>({
    gas_500: [],
    gas_100: [],
    gas_50: [],
    t_value: null,
    passed: null,
    correction_slope: 1,
    correction_intercept: 0,
  });
  const [currentReading, setCurrentReading] = useState<number>(0);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [readingsCollected, setReadingsCollected] = useState(0);

  // Load calibration values from database on mount
  useEffect(() => {
    const fetchCalibration = async () => {
      try {
        const [calibResponse, coCalibResponse] = await Promise.all([
          fetch('http://192.168.1.10/chrono-state/php-backend/get_calibration.php'),
          fetch('http://192.168.1.10/chrono-state/php-backend/get_co_calibration.php')
        ]);
        
        const calibData = await calibResponse.json();
        const coCalibData = await coCalibResponse.json();
        
        const values = {
          co2: calibData.CO2?.value || 0,
          o2: calibData.O2?.value || 20.9,
        };
        setCalibrationValues(values);
        setCo2Input(values.co2.toString());
        setO2Input(values.o2.toString());
        
        if (coCalibData.id) {
          setCoCalibrationData({
            gas_500: coCalibData.gas_500_readings || [],
            gas_100: coCalibData.gas_100_readings || [],
            gas_50: coCalibData.gas_50_readings || [],
            t_value: coCalibData.t_value,
            passed: coCalibData.passed === 1,
            correction_slope: coCalibData.correction_slope || 1,
            correction_intercept: coCalibData.correction_intercept || 0,
          });
          if (coCalibData.t_value !== null) {
            setCoCalibrationStep('complete');
          }
        }
      } catch (error) {
        console.error('Error fetching calibration:', error);
      }
    };
    fetchCalibration();
  }, []);

  // Real-time sensor reading for CO calibration
  useEffect(() => {
    if (coCalibrationStep === 'idle' || coCalibrationStep === 'computing' || coCalibrationStep === 'complete') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const response = await fetch('http://192.168.1.10/chrono-state/php-backend/get_sensor_data.php');
        const data = await response.json();
        setCurrentReading(parseFloat(data.co) || 0);
      } catch (error) {
        console.error('Error fetching sensor data:', error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [coCalibrationStep]);

  const startCalibrationStep = async (step: '500ppm' | '100ppm' | '50ppm') => {
    setCoCalibrationStep(step);
    setCaptureProgress(0);
    setReadingsCollected(0);

    const gasConcentrations = { '500ppm': 500, '100ppm': 100, '50ppm': 50 };
    
    toast({
      title: `Starting ${gasConcentrations[step]}ppm Calibration`,
      description: "Collecting 10 readings over 60 seconds...",
    });

    try {
      const readings: number[] = [];
      const totalReadings = 10;
      const intervalMs = 6000; // 6 seconds between readings (10 readings in 60 seconds)

      for (let i = 0; i < totalReadings; i++) {
        try {
          const response = await fetch('http://192.168.1.10/chrono-state/php-backend/get_sensor_data.php');
          const sensorData = await response.json();
          const reading = parseFloat(sensorData.co) || 0;
          readings.push(reading);
          
          setReadingsCollected(i + 1);
          setCaptureProgress(((i + 1) / totalReadings) * 100);
          
          if (i < totalReadings - 1) {
            await new Promise(resolve => setTimeout(resolve, intervalMs));
          }
        } catch (error) {
          console.error("Error reading sensor during capture:", error);
        }
      }

      if (readings.length === 0) {
        throw new Error("No sensor readings captured");
      }

      // Save readings to state
      const updatedData = { ...coCalibrationData };
      if (step === '500ppm') updatedData.gas_500 = readings;
      else if (step === '100ppm') updatedData.gas_100 = readings;
      else if (step === '50ppm') updatedData.gas_50 = readings;
      
      setCoCalibrationData(updatedData);

      toast({
        title: `${gasConcentrations[step]}ppm Calibration Complete`,
        description: `Collected ${readings.length} readings. Average: ${(readings.reduce((a, b) => a + b, 0) / readings.length).toFixed(2)} ppm`,
      });

      // Auto-advance to next step or compute
      if (step === '500ppm') {
        setCoCalibrationStep('idle');
      } else if (step === '100ppm') {
        setCoCalibrationStep('idle');
      } else if (step === '50ppm') {
        // All gases captured, compute results
        computeCalibrationResults(updatedData);
      }
    } catch (error) {
      console.error('Error capturing CO data:', error);
      toast({
        title: "Calibration Failed",
        description: "Failed to capture sensor data. Check ESP32 connection.",
        variant: "destructive",
      });
      setCoCalibrationStep('idle');
    }
  };

  const computeCalibrationResults = async (data: CoCalibrationData) => {
    setCoCalibrationStep('computing');

    try {
      // Reference values (expected concentrations)
      const references = [500, 100, 50];
      
      // Measured averages
      const measured = [
        data.gas_500.reduce((a, b) => a + b, 0) / data.gas_500.length,
        data.gas_100.reduce((a, b) => a + b, 0) / data.gas_100.length,
        data.gas_50.reduce((a, b) => a + b, 0) / data.gas_50.length,
      ];

      // Calculate differences (D = measured - reference)
      const differences = measured.map((m, i) => m - references[i]);
      
      // T-test calculation
      const n = differences.length;
      const sumD = differences.reduce((a, b) => a + b, 0);
      const sumD2 = differences.reduce((a, b) => a + (b * b), 0);
      const sumDSquared = sumD * sumD;
      
      const numerator = sumD;
      const denominator = Math.sqrt((sumD2 - (sumDSquared / n)) / ((n - 1) * n));
      const tValue = denominator !== 0 ? numerator / denominator : 0;

      // Critical value for df=2, α=0.05 is ±2.045
      const passed = Math.abs(tValue) <= 2.045;

      // Linear regression for correction factor
      // y = mx + b where y = reference, x = measured
      const sumX = measured.reduce((a, b) => a + b, 0);
      const sumY = references.reduce((a, b) => a + b, 0);
      const sumXY = measured.reduce((sum, x, i) => sum + (x * references[i]), 0);
      const sumX2 = measured.reduce((a, b) => a + (b * b), 0);
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      const finalData: CoCalibrationData = {
        ...data,
        t_value: tValue,
        passed: passed,
        correction_slope: slope,
        correction_intercept: intercept,
      };

      // Save to database
      await fetch('http://192.168.1.10/chrono-state/php-backend/save_co_calibration.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gas_500: data.gas_500,
          gas_100: data.gas_100,
          gas_50: data.gas_50,
          t_value: tValue,
          passed: passed ? 1 : 0,
          correction_slope: slope,
          correction_intercept: intercept,
        }),
      });

      setCoCalibrationData(finalData);
      setCoCalibrationStep('complete');

      toast({
        title: passed ? "Calibration Passed ✓" : "Calibration Failed ✗",
        description: `T-value: ${tValue.toFixed(4)} (Critical: ±2.045)`,
        variant: passed ? "default" : "destructive",
      });
    } catch (error) {
      console.error('Error computing calibration:', error);
      toast({
        title: "Computation Error",
        description: "Failed to compute calibration results",
        variant: "destructive",
      });
      setCoCalibrationStep('idle');
    }
  };

  const resetCalibration = () => {
    setCoCalibrationStep('idle');
    setCoCalibrationData({
      gas_500: [],
      gas_100: [],
      gas_50: [],
      t_value: null,
      passed: null,
      correction_slope: 1,
      correction_intercept: 0,
    });
    setCaptureProgress(0);
    setReadingsCollected(0);
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
          {/* CO Calibration - 3-Gas Sequential Procedure */}
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-red-500" />
                Carbon Monoxide (CO) - Multi-Point Calibration
              </CardTitle>
              <CardDescription>Sequential 3-gas calibration with T-test validation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-900">Hardware Setup Requirements</AlertTitle>
                <AlertDescription className="text-amber-800 text-sm">
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>Ensure hardware is properly connected and powered</li>
                    <li>Verify calibration gas cylinders (500ppm, 100ppm, 50ppm) are ready</li>
                    <li>Check gas lines are secure with no leaks</li>
                    <li>Allow system to stabilize before each gas insertion</li>
                    <li>Each gas capture takes 60 seconds (10 readings)</li>
                  </ul>
                </AlertDescription>
              </Alert>

              {/* Current Reading Display */}
              {(coCalibrationStep === '500ppm' || coCalibrationStep === '100ppm' || coCalibrationStep === '50ppm') && (
                <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary">
                  <p className="text-sm text-muted-foreground mb-1">Current Sensor Reading</p>
                  <p className="text-3xl font-bold text-foreground">
                    {currentReading.toFixed(2)} <span className="text-base font-normal">ppm</span>
                  </p>
                </div>
              )}

              {/* Progress Display */}
              {(coCalibrationStep === '500ppm' || coCalibrationStep === '100ppm' || coCalibrationStep === '50ppm') && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Collecting readings... ({readingsCollected}/10)
                    </span>
                    <span className="font-medium">{Math.round(captureProgress)}%</span>
                  </div>
                  <Progress value={captureProgress} className="h-3" />
                </div>
              )}

              {/* Calibration Steps */}
              <div className="grid gap-4 md:grid-cols-3">
                {/* 500 PPM */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Step 1: 500 ppm</h3>
                    {coCalibrationData.gas_500.length > 0 && (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Done
                      </Badge>
                    )}
                  </div>
                  {coCalibrationData.gas_500.length > 0 && (
                    <div className="p-3 bg-muted rounded text-sm">
                      <p className="text-muted-foreground">Average:</p>
                      <p className="font-bold">
                        {(coCalibrationData.gas_500.reduce((a, b) => a + b, 0) / coCalibrationData.gas_500.length).toFixed(2)} ppm
                      </p>
                    </div>
                  )}
                  <Button
                    onClick={() => startCalibrationStep('500ppm')}
                    disabled={coCalibrationStep !== 'idle'}
                    className="w-full"
                    variant={coCalibrationData.gas_500.length > 0 ? "outline" : "default"}
                  >
                    {coCalibrationStep === '500ppm' ? "Capturing..." : coCalibrationData.gas_500.length > 0 ? "Recapture" : "Start"}
                  </Button>
                </div>

                {/* 100 PPM */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Step 2: 100 ppm</h3>
                    {coCalibrationData.gas_100.length > 0 && (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Done
                      </Badge>
                    )}
                  </div>
                  {coCalibrationData.gas_100.length > 0 && (
                    <div className="p-3 bg-muted rounded text-sm">
                      <p className="text-muted-foreground">Average:</p>
                      <p className="font-bold">
                        {(coCalibrationData.gas_100.reduce((a, b) => a + b, 0) / coCalibrationData.gas_100.length).toFixed(2)} ppm
                      </p>
                    </div>
                  )}
                  <Button
                    onClick={() => startCalibrationStep('100ppm')}
                    disabled={coCalibrationStep !== 'idle' || coCalibrationData.gas_500.length === 0}
                    className="w-full"
                    variant={coCalibrationData.gas_100.length > 0 ? "outline" : "default"}
                  >
                    {coCalibrationStep === '100ppm' ? "Capturing..." : coCalibrationData.gas_100.length > 0 ? "Recapture" : "Start"}
                  </Button>
                </div>

                {/* 50 PPM */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Step 3: 50 ppm</h3>
                    {coCalibrationData.gas_50.length > 0 && (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Done
                      </Badge>
                    )}
                  </div>
                  {coCalibrationData.gas_50.length > 0 && (
                    <div className="p-3 bg-muted rounded text-sm">
                      <p className="text-muted-foreground">Average:</p>
                      <p className="font-bold">
                        {(coCalibrationData.gas_50.reduce((a, b) => a + b, 0) / coCalibrationData.gas_50.length).toFixed(2)} ppm
                      </p>
                    </div>
                  )}
                  <Button
                    onClick={() => startCalibrationStep('50ppm')}
                    disabled={coCalibrationStep !== 'idle' || coCalibrationData.gas_100.length === 0}
                    className="w-full"
                    variant={coCalibrationData.gas_50.length > 0 ? "outline" : "default"}
                  >
                    {coCalibrationStep === '50ppm' ? "Capturing..." : coCalibrationData.gas_50.length > 0 ? "Recapture" : "Start"}
                  </Button>
                </div>
              </div>

              {/* Results Display */}
              {coCalibrationStep === 'complete' && coCalibrationData.t_value !== null && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <h3 className="font-semibold text-lg">Calibration Results</h3>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 bg-background rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">T-Test Value</p>
                      <p className="text-2xl font-bold">
                        {coCalibrationData.t_value.toFixed(4)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Critical range: -2.045 to +2.045
                      </p>
                    </div>

                    <div className={`p-4 rounded-lg ${coCalibrationData.passed ? 'bg-green-100 dark:bg-green-950' : 'bg-red-100 dark:bg-red-950'}`}>
                      <p className="text-sm text-muted-foreground mb-1">Status</p>
                      <div className="flex items-center gap-2">
                        {coCalibrationData.passed ? (
                          <>
                            <CheckCircle className="w-6 h-6 text-green-600" />
                            <span className="text-2xl font-bold text-green-600">PASSED</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-6 h-6 text-red-600" />
                            <span className="text-2xl font-bold text-red-600">FAILED</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="p-4 bg-background rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Correction Slope (m)</p>
                      <p className="text-xl font-bold">
                        {coCalibrationData.correction_slope.toFixed(6)}
                      </p>
                    </div>

                    <div className="p-4 bg-background rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Correction Intercept (b)</p>
                      <p className="text-xl font-bold">
                        {coCalibrationData.correction_intercept.toFixed(4)}
                      </p>
                    </div>
                  </div>

                  <Alert className={coCalibrationData.passed ? "border-green-500 bg-green-50 dark:bg-green-950" : "border-red-500 bg-red-50 dark:bg-red-950"}>
                    <AlertTitle className={coCalibrationData.passed ? "text-green-900 dark:text-green-100" : "text-red-900 dark:text-red-100"}>
                      {coCalibrationData.passed ? "Calibration Accepted" : "Calibration Rejected"}
                    </AlertTitle>
                    <AlertDescription className={coCalibrationData.passed ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200"}>
                      {coCalibrationData.passed 
                        ? "The sensor calibration meets the statistical acceptance criteria. The correction factors have been saved."
                        : "The sensor calibration does not meet the statistical acceptance criteria. Please check your hardware setup and try again."
                      }
                    </AlertDescription>
                  </Alert>

                  <Button onClick={resetCalibration} variant="outline" className="w-full">
                    Start New Calibration
                  </Button>
                </div>
              )}

              {coCalibrationStep === 'computing' && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center space-y-3">
                    <Settings className="w-12 h-12 animate-spin mx-auto text-primary" />
                    <p className="text-muted-foreground">Computing T-value and correction factors...</p>
                  </div>
                </div>
              )}
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
