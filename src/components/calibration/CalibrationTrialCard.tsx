import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Droplet, Wind } from "lucide-react";

interface TrialData {
  co_avg: number;
  co2_avg: number;
  o2_avg: number;
}

interface CalibrationTrialCardProps {
  trialNumber: 1 | 2 | 3;
  trialData: TrialData | undefined;
  onStart: () => void;
  disabled: boolean;
  isActive: boolean;
}

export const CalibrationTrialCard = ({
  trialNumber,
  trialData,
  onStart,
  disabled,
  isActive
}: CalibrationTrialCardProps) => {
  const isComplete = trialData !== undefined;

  return (
    <Card className={isActive ? "border-primary" : ""}>
      <CardHeader>
        <CardTitle>Trial {trialNumber}</CardTitle>
        <CardDescription>
          {isComplete ? "Completed" : "10 readings over 60 seconds"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isComplete ? (
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-muted rounded-lg">
              <Activity className="w-4 h-4 mx-auto mb-1 text-red-500" />
              <p className="text-sm font-bold">{trialData.co_avg.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">CO (ppm)</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <Droplet className="w-4 h-4 mx-auto mb-1 text-blue-500" />
              <p className="text-sm font-bold">{trialData.co2_avg.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">CO₂ (%)</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <Wind className="w-4 h-4 mx-auto mb-1 text-green-500" />
              <p className="text-sm font-bold">{trialData.o2_avg.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">O₂ (%)</p>
            </div>
          </div>
        ) : (
          <Button
            onClick={onStart}
            disabled={disabled}
            className="w-full"
            variant={isActive ? "default" : "outline"}
          >
            Start Trial {trialNumber}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
