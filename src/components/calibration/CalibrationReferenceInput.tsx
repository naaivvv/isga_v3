import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Droplet, Wind } from "lucide-react";

interface CalibrationReferenceInputProps {
  coReference: string;
  co2Reference: string;
  o2Reference: string;
  onCoReferenceChange: (value: string) => void;
  onCo2ReferenceChange: (value: string) => void;
  onO2ReferenceChange: (value: string) => void;
  onSave: () => void;
  disabled: boolean;
}

export const CalibrationReferenceInput = ({
  coReference,
  co2Reference,
  o2Reference,
  onCoReferenceChange,
  onCo2ReferenceChange,
  onO2ReferenceChange,
  onSave,
  disabled
}: CalibrationReferenceInputProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 1: Set Reference Values</CardTitle>
        <CardDescription>
          Enter the laboratory-verified reference values for all gases
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="co-ref" className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-red-500" />
              CO (ppm)
            </Label>
            <Input
              id="co-ref"
              type="number"
              step="0.01"
              value={coReference}
              onChange={(e) => onCoReferenceChange(e.target.value)}
              disabled={disabled}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="co2-ref" className="flex items-center gap-2">
              <Droplet className="w-4 h-4 text-blue-500" />
              CO₂ (%)
            </Label>
            <Input
              id="co2-ref"
              type="number"
              step="0.01"
              value={co2Reference}
              onChange={(e) => onCo2ReferenceChange(e.target.value)}
              disabled={disabled}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="o2-ref" className="flex items-center gap-2">
              <Wind className="w-4 h-4 text-green-500" />
              O₂ (%)
            </Label>
            <Input
              id="o2-ref"
              type="number"
              step="0.01"
              value={o2Reference}
              onChange={(e) => onO2ReferenceChange(e.target.value)}
              disabled={disabled}
              placeholder="20.9"
            />
          </div>
        </div>
        <Button onClick={onSave} className="mt-4 w-full" disabled={disabled}>
          Set Reference Values
        </Button>
      </CardContent>
    </Card>
  );
};
