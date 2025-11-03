import { useState, useEffect } from "react";
import { Activity, Droplet, Wind, AlertCircle, CheckCircle, XCircle } from "lucide-react";
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

interface GasCalibrationData {
  reference_value: number;
  trial_1_readings: number[];
  trial_2_readings: number[];
  trial_3_readings: number[];
  trial_1_avg: number;
  trial_2_avg: number;
  trial_3_avg: number;
  t_value: number | null;
  passed: boolean | null;
  correction_slope: number;
  correction_intercept: number;
}

type GasType = 'CO' | 'CO2' | 'O2';
type CalibrationStep = 'idle' | 'trial1' | 'trial2' | 'trial3' | 'computing' | 'complete';

const Calibration = () => {
  const { toast } = useToast();
  
  // Calibration state for each gas
  const [coData, setCoData] = useState<GasCalibrationData>({
    reference_value: 0,
    trial_1_readings: [],
    trial_2_readings: [],
    trial_3_readings: [],
    trial_1_avg: 0,
    trial_2_avg: 0,
    trial_3_avg: 0,
    t_value: null,
    passed: null,
    correction_slope: 1,
    correction_intercept: 0,
  });

  const [co2Data, setCo2Data] = useState<GasCalibrationData>({
    reference_value: 0,
    trial_1_readings: [],
    trial_2_readings: [],
    trial_3_readings: [],
    trial_1_avg: 0,
    trial_2_avg: 0,
    trial_3_avg: 0,
    t_value: null,
    passed: null,
    correction_slope: 1,
    correction_intercept: 0,
  });

  const [o2Data, setO2Data] = useState<GasCalibrationData>({
    reference_value: 20.9,
    trial_1_readings: [],
    trial_2_readings: [],
    trial_3_readings: [],
    trial_1_avg: 0,
    trial_2_avg: 0,
    trial_3_avg: 0,
    t_value: null,
    passed: null,
    correction_slope: 1,
    correction_intercept: 0,
  });

  // Reference value inputs
  const [coReference, setCoReference] = useState("0");
  const [co2Reference, setCo2Reference] = useState("0");
  const [o2Reference, setO2Reference] = useState("20.9");

  // Current gas being calibrated
  const [activeGas, setActiveGas] = useState<GasType | null>(null);
  const [calibrationStep, setCalibrationStep] = useState<CalibrationStep>('idle');
  const [currentReading, setCurrentReading] = useState<number>(0);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [readingsCollected, setReadingsCollected] = useState(0);

  // Start fresh on every page visit - no loading of old calibration data
  // Users must perform new calibration each time

  // Real-time sensor reading during calibration
  useEffect(() => {
    if (!activeGas || calibrationStep === 'idle' || calibrationStep === 'computing' || calibrationStep === 'complete') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const response = await fetch('http://192.168.1.10/chrono-state/php-backend/get_sensor_data.php');
        const sensorData = await response.json();
        
        let reading = 0;
        if (activeGas === 'CO') {
          reading = parseFloat(sensorData.co) || 0;
        } else if (activeGas === 'CO2') {
          reading = (parseFloat(sensorData.co2) || 0) / 10000; // Convert ppm to %
        } else if (activeGas === 'O2') {
          reading = parseFloat(sensorData.o2) || 0;
        }
        
        setCurrentReading(reading);
      } catch (error) {
        console.error('Error fetching sensor data:', error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeGas, calibrationStep]);

  const startCalibration = async (gasType: GasType, trialNumber: 1 | 2 | 3) => {
    setActiveGas(gasType);
    setCalibrationStep(trialNumber === 1 ? 'trial1' : trialNumber === 2 ? 'trial2' : 'trial3');
    setCaptureProgress(0);
    setReadingsCollected(0);

    const gasUnit = gasType === 'CO' ? 'ppm' : '%';
    
    toast({
      title: `${gasType} Trial ${trialNumber} Started`,
      description: `Collecting 10 readings over 60 seconds...`,
    });

    try {
      const readings: number[] = [];
      const totalReadings = 10;
      const intervalMs = 6000; // 6 seconds between readings

      for (let i = 0; i < totalReadings; i++) {
        try {
          const response = await fetch('http://192.168.1.10/chrono-state/php-backend/get_sensor_data.php');
          const sensorData = await response.json();
          
          let reading = 0;
          if (gasType === 'CO') {
            reading = parseFloat(sensorData.co) || 0;
          } else if (gasType === 'CO2') {
            reading = (parseFloat(sensorData.co2) || 0) / 10000; // Convert to %
          } else if (gasType === 'O2') {
            reading = parseFloat(sensorData.o2) || 0;
          }
          
          readings.push(reading);
          setReadingsCollected(i + 1);
          setCaptureProgress(((i + 1) / totalReadings) * 100);
          
          if (i < totalReadings - 1) {
            await new Promise(resolve => setTimeout(resolve, intervalMs));
          }
        } catch (error) {
          console.error("Error reading sensor:", error);
        }
      }

      if (readings.length === 0) {
        throw new Error("No sensor readings captured");
      }

      const average = readings.reduce((a, b) => a + b, 0) / readings.length;

      // Update the appropriate gas data
      const updateData = (data: GasCalibrationData): GasCalibrationData => {
        const newData = { ...data };
        if (trialNumber === 1) {
          newData.trial_1_readings = readings;
          newData.trial_1_avg = average;
        } else if (trialNumber === 2) {
          newData.trial_2_readings = readings;
          newData.trial_2_avg = average;
        } else if (trialNumber === 3) {
          newData.trial_3_readings = readings;
          newData.trial_3_avg = average;
        }
        return newData;
      };

      let updatedData: GasCalibrationData;
      if (gasType === 'CO') {
        updatedData = updateData(coData);
        setCoData(updatedData);
      } else if (gasType === 'CO2') {
        updatedData = updateData(co2Data);
        setCo2Data(updatedData);
      } else {
        updatedData = updateData(o2Data);
        setO2Data(updatedData);
      }

      toast({
        title: `${gasType} Trial ${trialNumber} Complete`,
        description: `Average: ${average.toFixed(3)} ${gasUnit}`,
      });

      setCalibrationStep('idle');
      setActiveGas(null);

      // If all 3 trials are complete, compute results
      if (trialNumber === 3) {
        await computeCalibration(gasType, updatedData);
      }
    } catch (error) {
      console.error('Error during calibration:', error);
      toast({
        title: "Calibration Failed",
        description: "Failed to capture sensor data.",
        variant: "destructive",
      });
      setCalibrationStep('idle');
      setActiveGas(null);
    }
  };

  const computeCalibration = async (gasType: GasType, data: GasCalibrationData) => {
    setActiveGas(gasType);
    setCalibrationStep('computing');

    try {
      const referenceValue = data.reference_value;
      
      // Get the 3 trial averages
      const trialAverages = [data.trial_1_avg, data.trial_2_avg, data.trial_3_avg];
      
      // One-sample t-test: comparing trial averages to reference value
      // H0: mean of trials = reference value
      const n = trialAverages.length;
      const sampleMean = trialAverages.reduce((a, b) => a + b, 0) / n;
      const sampleVariance = trialAverages.reduce((sum, x) => sum + Math.pow(x - sampleMean, 2), 0) / (n - 1);
      const sampleStdDev = Math.sqrt(sampleVariance);
      const standardError = sampleStdDev / Math.sqrt(n);
      
      const tValue = standardError !== 0 ? (sampleMean - referenceValue) / standardError : 0;
      
      // Critical value for df=2, α=0.05 (two-tailed) is ±4.303
      const criticalValue = 4.303;
      const passed = Math.abs(tValue) <= criticalValue;

      // Linear regression: x = measured (trial averages), y = reference value (repeated 3 times)
      // In this case, we're calibrating so measured values should map to reference value
      // We'll use a simpler approach: correction_factor = reference / mean_measured
      const correctionSlope = sampleMean !== 0 ? referenceValue / sampleMean : 1;
      const correctionIntercept = 0; // For multiplicative correction

      const finalData: GasCalibrationData = {
        ...data,
        t_value: tValue,
        passed: passed,
        correction_slope: correctionSlope,
        correction_intercept: correctionIntercept,
      };

      // Save to database
      await fetch('http://192.168.1.10/chrono-state/php-backend/save_unified_calibration.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gas_type: gasType,
          reference_value: referenceValue,
          trial_1_readings: data.trial_1_readings,
          trial_2_readings: data.trial_2_readings,
          trial_3_readings: data.trial_3_readings,
          trial_1_avg: data.trial_1_avg,
          trial_2_avg: data.trial_2_avg,
          trial_3_avg: data.trial_3_avg,
          t_value: tValue,
          passed: passed ? 1 : 0,
          correction_slope: correctionSlope,
          correction_intercept: correctionIntercept,
        }),
      });

      if (gasType === 'CO') setCoData(finalData);
      else if (gasType === 'CO2') setCo2Data(finalData);
      else setO2Data(finalData);

      setCalibrationStep('complete');
      
      toast({
        title: passed ? `${gasType} Calibration Passed ✓` : `${gasType} Calibration Failed ✗`,
        description: `T-value: ${tValue.toFixed(4)} (Critical: ±${criticalValue})`,
        variant: passed ? "default" : "destructive",
      });

      setTimeout(() => {
        setCalibrationStep('idle');
        setActiveGas(null);
      }, 2000);
    } catch (error) {
      console.error('Error computing calibration:', error);
      toast({
        title: "Computation Error",
        description: "Failed to compute calibration results",
        variant: "destructive",
      });
      setCalibrationStep('idle');
      setActiveGas(null);
    }
  };

  const resetCalibration = (gasType: GasType) => {
    const emptyData: GasCalibrationData = {
      reference_value: gasType === 'O2' ? 20.9 : 0,
      trial_1_readings: [],
      trial_2_readings: [],
      trial_3_readings: [],
      trial_1_avg: 0,
      trial_2_avg: 0,
      trial_3_avg: 0,
      t_value: null,
      passed: null,
      correction_slope: 1,
      correction_intercept: 0,
    };

    if (gasType === 'CO') {
      setCoData(emptyData);
      setCoReference("0");
    } else if (gasType === 'CO2') {
      setCo2Data(emptyData);
      setCo2Reference("0");
    } else {
      setO2Data(emptyData);
      setO2Reference("20.9");
    }

    toast({
      title: `${gasType} Calibration Reset`,
      description: "All calibration data cleared",
    });
  };

  const saveReferenceValue = (gasType: GasType) => {
    let value: number;
    let data: GasCalibrationData;

    if (gasType === 'CO') {
      value = parseFloat(coReference);
      data = { ...coData, reference_value: value };
      setCoData(data);
    } else if (gasType === 'CO2') {
      value = parseFloat(co2Reference);
      data = { ...co2Data, reference_value: value };
      setCo2Data(data);
    } else {
      value = parseFloat(o2Reference);
      data = { ...o2Data, reference_value: value };
      setO2Data(data);
    }

    if (isNaN(value)) {
      toast({
        title: "Invalid Value",
        description: "Please enter a valid reference value",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: `${gasType} Reference Set`,
      description: `Reference value: ${value} ${gasType === 'CO' ? 'ppm' : '%'}`,
    });
  };

  const renderGasCalibration = (
    gasType: GasType,
    data: GasCalibrationData,
    referenceInput: string,
    setReferenceInput: (value: string) => void,
    icon: React.ReactNode,
    color: string
  ) => {
    const unit = gasType === 'CO' ? 'ppm' : '%';
    const isActive = activeGas === gasType;
    const canStartTrial = data.reference_value > 0 && !isActive;

    return (
      <Card className="md:col-span-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {icon}
            {gasType === 'CO' && 'Carbon Monoxide (CO)'}
            {gasType === 'CO2' && 'Carbon Dioxide (CO₂)'}
            {gasType === 'O2' && 'Oxygen (O₂)'}
            {data.passed !== null && (
              <Badge variant={data.passed ? "default" : "destructive"} className="ml-2">
                {data.passed ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                {data.passed ? 'Passed' : 'Failed'}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>Statistical calibration with 3 trials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Reference Value Input */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`${gasType}-reference`}>
                Laboratory Reference Value ({unit})
              </Label>
              <Input
                id={`${gasType}-reference`}
                type="number"
                step={gasType === 'CO' ? "1" : "0.01"}
                value={referenceInput}
                onChange={(e) => setReferenceInput(e.target.value)}
                placeholder={`Enter ${gasType} reference value`}
                disabled={isActive}
              />
              <Button 
                onClick={() => saveReferenceValue(gasType)}
                disabled={isActive}
                size="sm"
                variant="outline"
              >
                Set Reference
              </Button>
            </div>

            {data.reference_value > 0 && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Current Reference</p>
                <p className="text-2xl font-bold text-foreground">
                  {data.reference_value.toFixed(gasType === 'CO' ? 0 : 2)} <span className="text-base font-normal">{unit}</span>
                </p>
              </div>
            )}
          </div>

          {/* Current Reading Display */}
          {isActive && (
            <div className={`p-4 rounded-lg border-2`} style={{ backgroundColor: `${color}15`, borderColor: color }}>
              <p className="text-sm text-muted-foreground mb-1">Current Sensor Reading</p>
              <p className="text-3xl font-bold text-foreground">
                {currentReading.toFixed(gasType === 'CO' ? 2 : 3)} <span className="text-base font-normal">{unit}</span>
              </p>
            </div>
          )}

          {/* Progress Display */}
          {isActive && calibrationStep !== 'idle' && (
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

          {/* 3 Trials */}
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((trialNum) => {
              const trialReadings = trialNum === 1 ? data.trial_1_readings : trialNum === 2 ? data.trial_2_readings : data.trial_3_readings;
              const trialAvg = trialNum === 1 ? data.trial_1_avg : trialNum === 2 ? data.trial_2_avg : data.trial_3_avg;
              const isComplete = trialReadings.length > 0;

              return (
                <div key={trialNum} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Trial {trialNum}</h3>
                    {isComplete && (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Done
                      </Badge>
                    )}
                  </div>
                  {isComplete && (
                    <div className="p-3 bg-muted rounded text-sm">
                      <p className="text-muted-foreground">Average:</p>
                      <p className="font-bold">
                        {trialAvg.toFixed(gasType === 'CO' ? 2 : 3)} {unit}
                      </p>
                    </div>
                  )}
                  <Button
                    onClick={() => startCalibration(gasType, trialNum as 1 | 2 | 3)}
                    disabled={!canStartTrial || (trialNum > 1 && (trialNum === 2 ? data.trial_1_readings.length === 0 : data.trial_2_readings.length === 0))}
                    className="w-full"
                    variant={isComplete ? "outline" : "default"}
                  >
                    {isActive && calibrationStep === `trial${trialNum}` ? "Capturing..." : isComplete ? "Recapture" : "Start"}
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Results */}
          {data.t_value !== null && (
            <Alert className={data.passed ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <AlertTitle className={data.passed ? "text-green-900" : "text-red-900"}>
                {data.passed ? "✓ Calibration Passed" : "✗ Calibration Failed"}
              </AlertTitle>
              <AlertDescription className={data.passed ? "text-green-800" : "text-red-800"}>
                <div className="text-sm space-y-1 mt-2">
                  <p><strong>T-value:</strong> {data.t_value.toFixed(4)} (Critical: ±4.303)</p>
                  <p><strong>Correction Factor:</strong> {data.correction_slope.toFixed(4)}</p>
                  <p className="text-xs mt-2">
                    {data.passed 
                      ? "The sensor measurements are statistically consistent with the reference value." 
                      : "The sensor measurements differ significantly from the reference value. Recalibration recommended."}
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Reset Button */}
          <Button 
            onClick={() => resetCalibration(gasType)}
            variant="outline"
            className="w-full"
            disabled={isActive}
          >
            Reset {gasType} Calibration
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Calibration</h1>
          <p className="text-muted-foreground">Statistical calibration with T-test validation</p>
        </header>

        <SystemStatus />

        <div className="grid gap-6">
          {/* Calibration Guidelines */}
          <Card className="md:col-span-4">
            <CardHeader>
              <CardTitle>Calibration Guidelines</CardTitle>
              <CardDescription>Follow these steps for accurate calibration</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-900">Hardware Setup Requirements</AlertTitle>
                <AlertDescription className="text-amber-800 text-sm">
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>Ensure ESP32 and sensors are properly connected and powered</li>
                    <li>Use 10-liter concentrated gas from certified laboratory</li>
                    <li>Enter the laboratory reference value before starting trials</li>
                    <li>Each trial captures 10 samples over 60 seconds (6-second intervals)</li>
                    <li>Complete all 3 trials for each gas to compute statistical validation</li>
                    <li>Allow system to stabilize between trials</li>
                    <li>T-test validates if sensor readings match reference value</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* CO Calibration */}
          {renderGasCalibration(
            'CO',
            coData,
            coReference,
            setCoReference,
            <Activity className="w-5 h-5 text-red-500" />,
            '#ef4444'
          )}

          {/* CO2 Calibration */}
          {renderGasCalibration(
            'CO2',
            co2Data,
            co2Reference,
            setCo2Reference,
            <Droplet className="w-5 h-5 text-orange-500" />,
            '#f97316'
          )}

          {/* O2 Calibration */}
          {renderGasCalibration(
            'O2',
            o2Data,
            o2Reference,
            setO2Reference,
            <Wind className="w-5 h-5 text-primary" />,
            'hsl(var(--primary))'
          )}
        </div>
      </div>
    </div>
  );
};

export default Calibration;
