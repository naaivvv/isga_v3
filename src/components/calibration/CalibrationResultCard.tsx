import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle } from "lucide-react";

interface CalibrationResult {
  reference_value: number;
  trial_1_avg: number;
  trial_2_avg: number;
  trial_3_avg: number;
  t_value: number | null;
  passed: boolean | null;
  correction_slope: number;
  correction_intercept: number;
}

interface CalibrationResultCardProps {
  gasName: string;
  gasType: 'CO' | 'CO2' | 'O2';
  icon: React.ReactNode;
  data: CalibrationResult;
}

export const CalibrationResultCard = ({
  gasName,
  gasType,
  icon,
  data
}: CalibrationResultCardProps) => {
  const unit = gasType === 'CO' ? 'ppm' : '%';
  const hasResults = data.passed !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {gasName}
          {hasResults && (
            <Badge variant={data.passed ? "default" : "destructive"} className="ml-2">
              {data.passed ? (
                <CheckCircle className="w-3 h-3 mr-1" />
              ) : (
                <XCircle className="w-3 h-3 mr-1" />
              )}
              {data.passed ? 'Passed' : 'Failed'}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Reference: {data.reference_value} {unit}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasResults ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-muted rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">Trial 1</p>
                <p className="text-sm font-bold">{data.trial_1_avg.toFixed(2)} {unit}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">Trial 2</p>
                <p className="text-sm font-bold">{data.trial_2_avg.toFixed(2)} {unit}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">Trial 3</p>
                <p className="text-sm font-bold">{data.trial_3_avg.toFixed(2)} {unit}</p>
              </div>
            </div>
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">t-value:</span>
                <span className="font-mono">{data.t_value?.toFixed(4) ?? 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Correction Slope:</span>
                <span className="font-mono">{data.correction_slope.toFixed(4)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Correction Intercept:</span>
                <span className="font-mono">{data.correction_intercept.toFixed(4)}</span>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            Complete all trials to see results
          </p>
        )}
      </CardContent>
    </Card>
  );
};
