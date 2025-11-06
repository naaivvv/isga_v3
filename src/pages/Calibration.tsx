import { useState, useEffect } from "react";
import { Activity, Droplet, Wind, AlertCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import SystemStatus from "@/components/SystemStatus";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CalibrationReferenceInput } from "@/components/calibration/CalibrationReferenceInput";
import { CalibrationProgress } from "@/components/calibration/CalibrationProgress";
import { CalibrationTrialCard } from "@/components/calibration/CalibrationTrialCard";
import { CalibrationResultCard } from "@/components/calibration/CalibrationResultCard";
import { useCalibration } from "@/hooks/useCalibration";
import { useToast } from "@/hooks/use-toast";

const Calibration = () => {
  const { toast } = useToast();
  const {
    coData,
    co2Data,
    o2Data,
    calibrationStep,
    unifiedTrials,
    startTrial,
    computeCalibration,
    resetCalibration,
    fetchSensorData,
  } = useCalibration();

  const [coReference, setCoReference] = useState("0");
  const [co2Reference, setCo2Reference] = useState("0");
  const [o2Reference, setO2Reference] = useState("20.9");
  const [currentReadings, setCurrentReadings] = useState({ co: 0, co2: 0, o2: 0 });
  const [captureProgress, setCaptureProgress] = useState(0);
  const [readingsCollected, setReadingsCollected] = useState(0);

  // Real-time sensor reading during calibration
  useEffect(() => {
    if (calibrationStep === 'idle' || calibrationStep === 'computing' || calibrationStep === 'complete') {
      return;
    }

    let progressInterval: NodeJS.Timeout;
    let readingInterval: NodeJS.Timeout;

    const updateProgress = () => {
      const totalTime = 60000; // 60 seconds
      const interval = 100;
      let elapsed = 0;

      progressInterval = setInterval(() => {
        elapsed += interval;
        const progress = Math.min((elapsed / totalTime) * 100, 100);
        setCaptureProgress(progress);
        
        if (elapsed >= totalTime) {
          clearInterval(progressInterval);
        }
      }, interval);
    };

    const updateReadings = async () => {
      try {
        const data = await fetchSensorData();
        setCurrentReadings(data);
      } catch (error) {
        console.error('Error fetching sensor data:', error);
      }
    };

    updateProgress();
    updateReadings();
    readingInterval = setInterval(updateReadings, 1000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(readingInterval);
    };
  }, [calibrationStep, fetchSensorData]);

  const handleStartTrial = async (trialNumber: 1 | 2 | 3) => {
    setCaptureProgress(0);
    setReadingsCollected(0);

    const result = await startTrial(
      trialNumber,
      parseFloat(coReference),
      parseFloat(co2Reference),
      parseFloat(o2Reference)
    );

    if (result.success && trialNumber === 3 && unifiedTrials.length === 2) {
      // All 3 trials complete, compute results
      setTimeout(() => {
        handleComputeCalibration();
      }, 500);
    }
  };

  const handleComputeCalibration = async () => {
    await computeCalibration(
      parseFloat(coReference),
      parseFloat(co2Reference),
      parseFloat(o2Reference)
    );
  };

  const handleSaveReferences = () => {
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

    toast({
      title: "Reference Values Set",
      description: `CO: ${coVal} ppm | CO₂: ${co2Val}% | O₂: ${o2Val}%`,
    });
  };

  const isCalibrating = ['trial1', 'trial2', 'trial3', 'computing'].includes(calibrationStep);
  const allTrialsComplete = unifiedTrials.length === 3;
  const hasResults = coData.passed !== null && co2Data.passed !== null && o2Data.passed !== null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Sensor Calibration</h1>
          <p className="text-muted-foreground">
            Statistical calibration with 3 trials for CO, CO₂, and O₂ sensors
          </p>
        </header>

        <SystemStatus />

        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              </div>
              <div>
                <h4 className="font-semibold text-amber-900 mb-2">
                  Pre-Calibration Checklist
                </h4>
                <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                  <li>Ensure ESP32 is connected and powered on</li>
                  <li>Verify all sensors (CO, CO₂, O₂) are properly connected</li>
                  <li>Allow sensors to warm up for at least 5 minutes before calibration</li>
                  <li>Prepare laboratory-verified reference gas samples</li>
                  <li>Ensure stable environmental conditions (temperature, humidity)</li>
                  <li>Have calibration equipment and tools ready</li>
                  <li>Each trial will take 60 seconds to collect 10 readings</li>
                </ul>
                <p className="text-sm text-amber-800 mt-3 font-medium">
                  ⚠️ Do not interrupt the calibration process once started. Each trial must complete all readings for accurate results.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Calibration Process</AlertTitle>
          <AlertDescription>
            Set reference values → Complete 3 unified trials → Review statistical validation results
          </AlertDescription>
        </Alert>

        <div className="space-y-6">
          {/* Step 1: Reference Values */}
          <CalibrationReferenceInput
            coReference={coReference}
            co2Reference={co2Reference}
            o2Reference={o2Reference}
            onCoReferenceChange={setCoReference}
            onCo2ReferenceChange={setCo2Reference}
            onO2ReferenceChange={setO2Reference}
            onSave={handleSaveReferences}
            disabled={isCalibrating}
          />

          {/* Step 2: Trials */}
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Conduct Unified Trials</CardTitle>
              <CardDescription>
                Each trial captures CO, CO₂, and O₂ simultaneously (10 readings over 60 seconds)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isCalibrating && (
                <CalibrationProgress
                  currentReadings={currentReadings}
                  captureProgress={captureProgress}
                  readingsCollected={readingsCollected}
                  totalReadings={10}
                />
              )}

              <div className="grid gap-4 md:grid-cols-3">
                {[1, 2, 3].map((trialNum) => (
                  <CalibrationTrialCard
                    key={trialNum}
                    trialNumber={trialNum as 1 | 2 | 3}
                    trialData={unifiedTrials[trialNum - 1]}
                    onStart={() => handleStartTrial(trialNum as 1 | 2 | 3)}
                    disabled={
                      isCalibrating ||
                      (trialNum > 1 && unifiedTrials.length < trialNum - 1)
                    }
                    isActive={calibrationStep === `trial${trialNum}`}
                  />
                ))}
              </div>

              {allTrialsComplete && !hasResults && calibrationStep === 'idle' && (
                <Button
                  onClick={handleComputeCalibration}
                  className="w-full"
                  size="lg"
                >
                  Compute Calibration Results
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Step 3: Results */}
          {hasResults && (
            <Card>
              <CardHeader>
                <CardTitle>Step 3: Calibration Results</CardTitle>
                <CardDescription>
                  Statistical validation using t-test (critical value ±4.303, df=2, α=0.05)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <CalibrationResultCard
                    gasName="Carbon Monoxide (CO)"
                    gasType="CO"
                    icon={<Activity className="w-5 h-5 text-red-500" />}
                    data={coData}
                  />
                  <CalibrationResultCard
                    gasName="Carbon Dioxide (CO₂)"
                    gasType="CO2"
                    icon={<Droplet className="w-5 h-5 text-blue-500" />}
                    data={co2Data}
                  />
                  <CalibrationResultCard
                    gasName="Oxygen (O₂)"
                    gasType="O2"
                    icon={<Wind className="w-5 h-5 text-green-500" />}
                    data={o2Data}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reset Button */}
          <div className="flex justify-end">
            <Button
              onClick={resetCalibration}
              variant="outline"
              disabled={isCalibrating}
            >
              Reset All Calibration
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calibration;
