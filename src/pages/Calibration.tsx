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

interface UnifiedTrialData {
  co_readings: number[];
  co2_readings: number[];
  o2_readings: number[];
  co_avg: number;
  co2_avg: number;
  o2_avg: number;
}

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

  // Unified calibration state
  const [calibrationStep, setCalibrationStep] = useState<CalibrationStep>('idle');
  const [currentReadings, setCurrentReadings] = useState({ co: 0, co2: 0, o2: 0 });
  const [captureProgress, setCaptureProgress] = useState(0);
  const [readingsCollected, setReadingsCollected] = useState(0);
  const [unifiedTrials, setUnifiedTrials] = useState<UnifiedTrialData[]>([]);

  // Start fresh on every page visit - no loading of old calibration data
  // Users must perform new calibration each time

  // Real-time sensor reading during calibration
  useEffect(() => {
    if (calibrationStep === 'idle' || calibrationStep === 'computing' || calibrationStep === 'complete') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const response = await fetch('http://192.168.1.10/chrono-state/php-backend/get_sensor_data.php');
        const sensorData = await response.json();
        
        setCurrentReadings({
          co: parseFloat(sensorData.co) || 0,
          co2: parseFloat(sensorData.co2) || 0,
          o2: parseFloat(sensorData.o2) || 0,
        });
      } catch (error) {
        console.error('Error fetching sensor data:', error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [calibrationStep]);

  const startUnifiedCalibration = async (trialNumber: 1 | 2 | 3) => {
    // Validate all reference values are set
    const coRef = parseFloat(coReference);
    const co2Ref = parseFloat(co2Reference);
    const o2Ref = parseFloat(o2Reference);

    if (isNaN(coRef) || isNaN(co2Ref) || isNaN(o2Ref)) {
      toast({
        title: "Reference Values Required",
        description: "Please set all reference values before starting calibration",
        variant: "destructive",
      });
      return;
    }

    setCalibrationStep(trialNumber === 1 ? 'trial1' : trialNumber === 2 ? 'trial2' : 'trial3');
    setCaptureProgress(0);
    setReadingsCollected(0);
    
    toast({
      title: `Unified Trial ${trialNumber} Started`,
      description: `Capturing all sensors simultaneously - 10 readings over 60 seconds...`,
    });

    try {
      const coReadings: number[] = [];
      const co2Readings: number[] = [];
      const o2Readings: number[] = [];
      const totalReadings = 10;
      const intervalMs = 6000; // 6 seconds between readings

      for (let i = 0; i < totalReadings; i++) {
        try {
          const response = await fetch('http://192.168.1.10/chrono-state/php-backend/get_sensor_data.php');
          const sensorData = await response.json();
          
          const coReading = parseFloat(sensorData.co) || 0;
          const co2Reading = parseFloat(sensorData.co2) || 0;
          const o2Reading = parseFloat(sensorData.o2) || 0;
          
          coReadings.push(coReading);
          co2Readings.push(co2Reading);
          o2Readings.push(o2Reading);
          
          setReadingsCollected(i + 1);
          setCaptureProgress(((i + 1) / totalReadings) * 100);
          
          if (i < totalReadings - 1) {
            await new Promise(resolve => setTimeout(resolve, intervalMs));
          }
        } catch (error) {
          console.error("Error reading sensor:", error);
        }
      }

      if (coReadings.length === 0 || co2Readings.length === 0 || o2Readings.length === 0) {
        throw new Error("No sensor readings captured");
      }

      const coAvg = coReadings.reduce((a, b) => a + b, 0) / coReadings.length;
      const co2Avg = co2Readings.reduce((a, b) => a + b, 0) / co2Readings.length;
      const o2Avg = o2Readings.reduce((a, b) => a + b, 0) / o2Readings.length;

      const trialData: UnifiedTrialData = {
        co_readings: coReadings,
        co2_readings: co2Readings,
        o2_readings: o2Readings,
        co_avg: coAvg,
        co2_avg: co2Avg,
        o2_avg: o2Avg,
      };

      // Update unified trials
      const newTrials = [...unifiedTrials];
      newTrials[trialNumber - 1] = trialData;
      setUnifiedTrials(newTrials);

      // Update individual gas data
      const updateGasData = (
        currentData: GasCalibrationData,
        readings: number[],
        avg: number,
        trialNum: number
      ): GasCalibrationData => {
        const newData = { ...currentData };
        if (trialNum === 1) {
          newData.trial_1_readings = readings;
          newData.trial_1_avg = avg;
        } else if (trialNum === 2) {
          newData.trial_2_readings = readings;
          newData.trial_2_avg = avg;
        } else if (trialNum === 3) {
          newData.trial_3_readings = readings;
          newData.trial_3_avg = avg;
        }
        return newData;
      };

      setCoData(updateGasData(coData, coReadings, coAvg, trialNumber));
      setCo2Data(updateGasData(co2Data, co2Readings, co2Avg, trialNumber));
      setO2Data(updateGasData(o2Data, o2Readings, o2Avg, trialNumber));

      toast({
        title: `Trial ${trialNumber} Complete`,
        description: `CO: ${coAvg.toFixed(2)} ppm | CO₂: ${co2Avg.toFixed(2)}% | O₂: ${o2Avg.toFixed(2)}%`,
      });

      setCalibrationStep('idle');

      // If all 3 trials are complete, compute results for all gases
      if (trialNumber === 3 && newTrials.length === 3) {
        await computeAllCalibrations();
      }
    } catch (error) {
      console.error('Error during calibration:', error);
      toast({
        title: "Calibration Failed",
        description: "Failed to capture sensor data.",
        variant: "destructive",
      });
      setCalibrationStep('idle');
    }
  };

  const computeAllCalibrations = async () => {
    setCalibrationStep('computing');

    try {
      const computeGasCalibration = async (
        gasType: GasType,
        data: GasCalibrationData,
        referenceValue: number
      ) => {
        const trialAverages = [data.trial_1_avg, data.trial_2_avg, data.trial_3_avg];
        
        const n = trialAverages.length;
        const sampleMean = trialAverages.reduce((a, b) => a + b, 0) / n;
        const sampleVariance = trialAverages.reduce((sum, x) => sum + Math.pow(x - sampleMean, 2), 0) / (n - 1);
        const sampleStdDev = Math.sqrt(sampleVariance);
        const standardError = sampleStdDev / Math.sqrt(n);
        
        const tValue = standardError !== 0 ? (sampleMean - referenceValue) / standardError : 0;
        const criticalValue = 4.303;
        const passed = Math.abs(tValue) <= criticalValue;

        const correctionSlope = sampleMean !== 0 ? referenceValue / sampleMean : 1;
        const correctionIntercept = 0;

        const finalData: GasCalibrationData = {
          ...data,
          reference_value: referenceValue,
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

        return { gasType, finalData, tValue, passed, criticalValue };
      };

      // Compute calibration for all three gases
      const coResult = await computeGasCalibration('CO', coData, parseFloat(coReference));
      const co2Result = await computeGasCalibration('CO2', co2Data, parseFloat(co2Reference));
      const o2Result = await computeGasCalibration('O2', o2Data, parseFloat(o2Reference));

      setCoData(coResult.finalData);
      setCo2Data(co2Result.finalData);
      setO2Data(o2Result.finalData);

      setCalibrationStep('complete');
      
      // Show results for all gases
      const allPassed = coResult.passed && co2Result.passed && o2Result.passed;
      toast({
        title: allPassed ? "All Calibrations Passed ✓" : "Calibration Results",
        description: `CO: ${coResult.passed ? '✓' : '✗'} | CO₂: ${co2Result.passed ? '✓' : '✗'} | O₂: ${o2Result.passed ? '✓' : '✗'}`,
        variant: allPassed ? "default" : "destructive",
      });

      setTimeout(() => {
        setCalibrationStep('idle');
      }, 3000);
    } catch (error) {
      console.error('Error computing calibration:', error);
      toast({
        title: "Computation Error",
        description: "Failed to compute calibration results",
        variant: "destructive",
      });
      setCalibrationStep('idle');
    }
  };

  const resetAllCalibration = () => {
    const emptyCoData: GasCalibrationData = {
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
    };

    const emptyCo2Data: GasCalibrationData = {
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
    };

    const emptyO2Data: GasCalibrationData = {
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
    };

    setCoData(emptyCoData);
    setCo2Data(emptyCo2Data);
    setO2Data(emptyO2Data);
    setCoReference("0");
    setCo2Reference("0");
    setO2Reference("20.9");
    setUnifiedTrials([]);

    toast({
      title: "Calibration Reset",
      description: "All calibration data cleared for all gases",
    });
  };

  const saveAllReferenceValues = () => {
    const coVal = parseFloat(coReference);
    const co2Val = parseFloat(co2Reference);
    const o2Val = parseFloat(o2Reference);

    if (isNaN(coVal) || isNaN(co2Val) || isNaN(o2Val)) {
      toast({
        title: "Invalid Values",
        description: "Please enter valid reference values for all gases",
        variant: "destructive",
      });
      return;
    }

    setCoData({ ...coData, reference_value: coVal });
    setCo2Data({ ...co2Data, reference_value: co2Val });
    setO2Data({ ...o2Data, reference_value: o2Val });

    toast({
      title: "Reference Values Set",
      description: `CO: ${coVal} ppm | CO₂: ${co2Val}% | O₂: ${o2Val}%`,
    });
  };

  const renderGasResults = (
    gasType: GasType,
    data: GasCalibrationData,
    icon: React.ReactNode,
    color: string
  ) => {
    const unit = gasType === 'CO' ? 'ppm' : '%';
    const hasTrialData = data.trial_1_readings.length > 0;

    return (
      <Card key={gasType}>
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
          <CardDescription>
            Reference: {data.reference_value} {unit}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasTrialData && (
            <>
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((trialNum) => {
                  const trialAvg = trialNum === 1 ? data.trial_1_avg : trialNum === 2 ? data.trial_2_avg : data.trial_3_avg;
                  return (
                    <div key={trialNum} className="p-3 bg-muted rounded-lg text-center">
                      <p className="text-xs text-muted-foreground mb-1">Trial {trialNum}</p>
                      <p className="text-sm font-bold">
                        {trialAvg.toFixed(2)} {unit}
                      </p>
                    </div>
                  );
                })}
              </div>

              {data.t_value !== null && (
                <Alert className={data.passed ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                  <AlertTitle className={data.passed ? "text-green-900" : "text-red-900"}>
                    {data.passed ? "✓ Calibration Passed" : "✗ Calibration Failed"}
                  </AlertTitle>
                  <AlertDescription className={data.passed ? "text-green-800" : "text-red-800"}>
                    <div className="text-sm space-y-1 mt-2">
                      <p><strong>T-value:</strong> {data.t_value.toFixed(4)} (Critical: ±4.303)</p>
                      <p><strong>Correction Factor:</strong> {data.correction_slope.toFixed(4)}</p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
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
          <Card>
            <CardHeader>
              <CardTitle>Unified Calibration Process</CardTitle>
              <CardDescription>All sensors calibrated simultaneously in 3 trials</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-900">Hardware Setup Requirements</AlertTitle>
                <AlertDescription className="text-amber-800 text-sm">
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>Ensure ESP32 and all sensors are properly connected and powered</li>
                    <li>Use 10-liter concentrated gas from certified laboratory</li>
                    <li>Set reference values for all three gases before starting</li>
                    <li>Each trial captures all sensors simultaneously (10 samples over 60 seconds)</li>
                    <li>Complete all 3 trials to compute statistical validation for each gas</li>
                    <li>T-test validates each sensor independently</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Reference Values Section */}
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Set Laboratory Reference Values</CardTitle>
              <CardDescription>Enter certified reference values for all gases</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="co-reference" className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-red-500" />
                    CO Reference (ppm)
                  </Label>
                  <Input
                    id="co-reference"
                    type="number"
                    step="1"
                    value={coReference}
                    onChange={(e) => setCoReference(e.target.value)}
                    placeholder="e.g., 500"
                    disabled={calibrationStep !== 'idle'}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="co2-reference" className="flex items-center gap-2">
                    <Droplet className="w-4 h-4 text-orange-500" />
                    CO₂ Reference (%)
                  </Label>
                  <Input
                    id="co2-reference"
                    type="number"
                    step="0.01"
                    value={co2Reference}
                    onChange={(e) => setCo2Reference(e.target.value)}
                    placeholder="e.g., 5.00"
                    disabled={calibrationStep !== 'idle'}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="o2-reference" className="flex items-center gap-2">
                    <Wind className="w-4 h-4 text-primary" />
                    O₂ Reference (%)
                  </Label>
                  <Input
                    id="o2-reference"
                    type="number"
                    step="0.01"
                    value={o2Reference}
                    onChange={(e) => setO2Reference(e.target.value)}
                    placeholder="e.g., 20.9"
                    disabled={calibrationStep !== 'idle'}
                  />
                </div>
              </div>

              <Button 
                onClick={saveAllReferenceValues}
                disabled={calibrationStep !== 'idle'}
                className="w-full mt-4"
              >
                Set All Reference Values
              </Button>
            </CardContent>
          </Card>

          {/* Current Readings During Calibration */}
          {calibrationStep !== 'idle' && calibrationStep !== 'computing' && calibrationStep !== 'complete' && (
            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle>Real-time Sensor Readings</CardTitle>
                <CardDescription>Current values during calibration capture</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-red-50 rounded-lg border-2 border-red-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-medium">CO</span>
                    </div>
                    <p className="text-2xl font-bold">{currentReadings.co.toFixed(2)} <span className="text-base font-normal">ppm</span></p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Droplet className="w-4 h-4 text-orange-500" />
                      <span className="text-sm font-medium">CO₂</span>
                    </div>
                    <p className="text-2xl font-bold">{currentReadings.co2.toFixed(2)} <span className="text-base font-normal">%</span></p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Wind className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">O₂</span>
                    </div>
                    <p className="text-2xl font-bold">{currentReadings.o2.toFixed(2)} <span className="text-base font-normal">%</span></p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progress Display */}
          {calibrationStep !== 'idle' && calibrationStep !== 'complete' && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {calibrationStep === 'computing' ? 'Computing results...' : `Collecting readings... (${readingsCollected}/10)`}
                    </span>
                    <span className="font-medium">{Math.round(captureProgress)}%</span>
                  </div>
                  <Progress value={captureProgress} className="h-3" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Unified Trials Section */}
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Run Calibration Trials</CardTitle>
              <CardDescription>Complete 3 trials capturing all sensors simultaneously</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {[1, 2, 3].map((trialNum) => {
                  const isComplete = unifiedTrials[trialNum - 1] !== undefined;
                  const canStart = 
                    calibrationStep === 'idle' && 
                    parseFloat(coReference) > 0 && 
                    parseFloat(co2Reference) > 0 && 
                    parseFloat(o2Reference) > 0 &&
                    (trialNum === 1 || unifiedTrials[trialNum - 2] !== undefined);

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
                      {isComplete && unifiedTrials[trialNum - 1] && (
                        <div className="p-3 bg-muted rounded text-xs space-y-1">
                          <p><strong>CO:</strong> {unifiedTrials[trialNum - 1].co_avg.toFixed(2)} ppm</p>
                          <p><strong>CO₂:</strong> {unifiedTrials[trialNum - 1].co2_avg.toFixed(2)}%</p>
                          <p><strong>O₂:</strong> {unifiedTrials[trialNum - 1].o2_avg.toFixed(2)}%</p>
                        </div>
                      )}
                      <Button
                        onClick={() => startUnifiedCalibration(trialNum as 1 | 2 | 3)}
                        disabled={!canStart}
                        className="w-full"
                        variant={isComplete ? "outline" : "default"}
                      >
                        {calibrationStep === `trial${trialNum}` ? "Capturing..." : isComplete ? "Recapture" : "Start"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Results Section */}
          {(coData.t_value !== null || co2Data.t_value !== null || o2Data.t_value !== null) && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Step 3: Calibration Results</CardTitle>
                  <CardDescription>Statistical validation results for each gas sensor</CardDescription>
                </CardHeader>
              </Card>

              <div className="grid gap-4 md:grid-cols-3">
                {renderGasResults('CO', coData, <Activity className="w-5 h-5 text-red-500" />, '#ef4444')}
                {renderGasResults('CO2', co2Data, <Droplet className="w-5 h-5 text-orange-500" />, '#f97316')}
                {renderGasResults('O2', o2Data, <Wind className="w-5 h-5 text-primary" />, 'hsl(var(--primary))')}
              </div>
            </>
          )}

          {/* Reset Button */}
          <Button 
            onClick={resetAllCalibration}
            variant="outline"
            className="w-full"
            disabled={calibrationStep !== 'idle'}
          >
            Reset All Calibrations
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Calibration;
