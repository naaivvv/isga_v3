import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export interface GasCalibrationData {
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

export interface UnifiedTrialData {
  co_readings: number[];
  co2_readings: number[];
  o2_readings: number[];
  co_avg: number;
  co2_avg: number;
  o2_avg: number;
}

type CalibrationStep = 'idle' | 'trial1' | 'trial2' | 'trial3' | 'computing' | 'complete';
type GasType = 'CO' | 'CO2' | 'O2';

const BACKEND_URL = 'http://192.168.1.10/chrono-state/php-backend';

const createEmptyCalibrationData = (defaultRef = 0): GasCalibrationData => ({
  reference_value: defaultRef,
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

export const useCalibration = () => {
  const { toast } = useToast();

  const [coData, setCoData] = useState<GasCalibrationData>(createEmptyCalibrationData(0));
  const [co2Data, setCo2Data] = useState<GasCalibrationData>(createEmptyCalibrationData(0));
  const [o2Data, setO2Data] = useState<GasCalibrationData>(createEmptyCalibrationData(20.9));

  const [calibrationStep, setCalibrationStep] = useState<CalibrationStep>('idle');
  const [unifiedTrials, setUnifiedTrials] = useState<UnifiedTrialData[]>([]);

  const fetchSensorData = async () => {
    const response = await fetch(`${BACKEND_URL}/get_sensor_data.php`);
    const data = await response.json();
    return {
      co: parseFloat(data.co) || 0,
      co2: parseFloat(data.co2) || 0,
      o2: parseFloat(data.o2) || 0,
    };
  };

  const startTrial = async (
    trialNumber: 1 | 2 | 3,
    coReference: number,
    co2Reference: number,
    o2Reference: number
  ) => {
    if (isNaN(coReference) || isNaN(co2Reference) || isNaN(o2Reference)) {
      toast({
        title: "Reference Values Required",
        description: "Please set all reference values before starting calibration",
        variant: "destructive",
      });
      return { success: false, trialData: null };
    }

    const stepMap = { 1: 'trial1', 2: 'trial2', 3: 'trial3' } as const;
    setCalibrationStep(stepMap[trialNumber]);

    toast({
      title: `Unified Trial ${trialNumber} Started`,
      description: `Capturing all sensors simultaneously - 10 readings over 60 seconds...`,
    });

    try {
      const coReadings: number[] = [];
      const co2Readings: number[] = [];
      const o2Readings: number[] = [];
      const totalReadings = 10;
      const intervalMs = 6000;

      for (let i = 0; i < totalReadings; i++) {
        const sensorData = await fetchSensorData();
        coReadings.push(sensorData.co);
        co2Readings.push(sensorData.co2);
        o2Readings.push(sensorData.o2);

        if (i < totalReadings - 1) {
          await new Promise(resolve => setTimeout(resolve, intervalMs));
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
      setUnifiedTrials(prev => {
        const newTrials = [...prev];
        newTrials[trialNumber - 1] = trialData;
        return newTrials;
      });

      // Update individual gas data
      const updateGasData = (
        setter: React.Dispatch<React.SetStateAction<GasCalibrationData>>,
        readings: number[],
        avg: number
      ) => {
        setter(prev => {
          const updated = { ...prev };
          if (trialNumber === 1) {
            updated.trial_1_readings = readings;
            updated.trial_1_avg = avg;
          } else if (trialNumber === 2) {
            updated.trial_2_readings = readings;
            updated.trial_2_avg = avg;
          } else {
            updated.trial_3_readings = readings;
            updated.trial_3_avg = avg;
          }
          return updated;
        });
      };

      updateGasData(setCoData, coReadings, coAvg);
      updateGasData(setCo2Data, co2Readings, co2Avg);
      updateGasData(setO2Data, o2Readings, o2Avg);

      toast({
        title: `Trial ${trialNumber} Complete`,
        description: `CO: ${coAvg.toFixed(2)} ppm | CO₂: ${co2Avg.toFixed(2)}% | O₂: ${o2Avg.toFixed(2)}%`,
      });

      setCalibrationStep('idle');

      return { success: true, trialData };
    } catch (error) {
      console.error('Error during calibration:', error);
      toast({
        title: "Calibration Failed",
        description: "Failed to capture sensor data.",
        variant: "destructive",
      });
      setCalibrationStep('idle');
      return { success: false, trialData: null };
    }
  };

  const computeCalibration = async (
    coReference: number,
    co2Reference: number,
    o2Reference: number
  ) => {
    setCalibrationStep('computing');

    try {
      const saveGasCalibration = async (
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

        // Ensure proper datatypes for database
        const payload = {
          gas_type: gasType,
          reference_value: Number(referenceValue),
          trial_1_readings: data.trial_1_readings,
          trial_2_readings: data.trial_2_readings,
          trial_3_readings: data.trial_3_readings,
          trial_1_avg: Number(data.trial_1_avg),
          trial_2_avg: Number(data.trial_2_avg),
          trial_3_avg: Number(data.trial_3_avg),
          t_value: Number(tValue),
          passed: passed ? 1 : 0, // TINYINT(1) expects 1 or 0
          correction_slope: Number(correctionSlope),
          correction_intercept: Number(correctionIntercept),
        };

        const response = await fetch(`${BACKEND_URL}/save_unified_calibration.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to save ${gasType} calibration:`, errorText);
          throw new Error(`Failed to save ${gasType} calibration`);
        }

        const result = await response.json();
        console.log(`${gasType} calibration saved:`, result);

        return {
          ...data,
          reference_value: referenceValue,
          t_value: tValue,
          passed: passed,
          correction_slope: correctionSlope,
          correction_intercept: correctionIntercept,
        };
      };

      const [updatedCoData, updatedCo2Data, updatedO2Data] = await Promise.all([
        saveGasCalibration('CO', coData, coReference),
        saveGasCalibration('CO2', co2Data, co2Reference),
        saveGasCalibration('O2', o2Data, o2Reference),
      ]);

      setCoData(updatedCoData);
      setCo2Data(updatedCo2Data);
      setO2Data(updatedO2Data);

      const allPassed = updatedCoData.passed && updatedCo2Data.passed && updatedO2Data.passed;
      
      toast({
        title: allPassed ? "All Calibrations Passed ✓" : "Calibration Results",
        description: `CO: ${updatedCoData.passed ? '✓' : '✗'} | CO₂: ${updatedCo2Data.passed ? '✓' : '✗'} | O₂: ${updatedO2Data.passed ? '✓' : '✗'}`,
        variant: allPassed ? "default" : "destructive",
      });

      setCalibrationStep('complete');
      setTimeout(() => setCalibrationStep('idle'), 3000);

      return { success: true };
    } catch (error) {
      console.error('Error computing calibration:', error);
      toast({
        title: "Computation Error",
        description: "Failed to compute calibration results",
        variant: "destructive",
      });
      setCalibrationStep('idle');
      return { success: false };
    }
  };

  const resetCalibration = () => {
    setCoData(createEmptyCalibrationData(0));
    setCo2Data(createEmptyCalibrationData(0));
    setO2Data(createEmptyCalibrationData(20.9));
    setUnifiedTrials([]);
    setCalibrationStep('idle');

    toast({
      title: "Calibration Reset",
      description: "All calibration data cleared for all gases",
    });
  };

  return {
    coData,
    co2Data,
    o2Data,
    calibrationStep,
    unifiedTrials,
    startTrial,
    computeCalibration,
    resetCalibration,
    fetchSensorData,
  };
};
