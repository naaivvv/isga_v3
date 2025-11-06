import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Activity, Droplet, Wind } from "lucide-react";

interface CalibrationProgressProps {
  currentReadings: { co: number; co2: number; o2: number };
  captureProgress: number;
  readingsCollected: number;
  totalReadings: number;
}

export const CalibrationProgress = ({
  currentReadings,
  captureProgress,
  readingsCollected,
  totalReadings
}: CalibrationProgressProps) => {
  return (
    <Card className="border-primary">
      <CardHeader>
        <CardTitle>Capturing Sensor Data...</CardTitle>
        <CardDescription>
          Reading {readingsCollected} of {totalReadings}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={captureProgress} className="w-full" />
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-muted rounded-lg">
            <Activity className="w-6 h-6 mx-auto mb-2 text-red-500" />
            <p className="text-2xl font-bold">{currentReadings.co.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">CO (ppm)</p>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <Droplet className="w-6 h-6 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{currentReadings.co2.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">CO₂ (%)</p>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <Wind className="w-6 h-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{currentReadings.o2.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">O₂ (%)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
