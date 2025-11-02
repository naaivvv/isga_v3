import { useState, useEffect } from "react";
import { Calendar, Clock, Play, Square } from "lucide-react";
import Navbar from "@/components/Navbar";
import SystemStatus from "@/components/SystemStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface SchedulingConfig {
  hours: number;
  minutes: number;
  active: boolean;
}

const Scheduling = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState<SchedulingConfig>({
    hours: 0,
    minutes: 30,
    active: false,
  });

  useEffect(() => {
    // Load saved configuration
    const saved = localStorage.getItem("schedulingConfig");
    if (saved) {
      setConfig(JSON.parse(saved));
    }
  }, []);

  const saveConfig = (newConfig: SchedulingConfig) => {
    localStorage.setItem("schedulingConfig", JSON.stringify(newConfig));
    setConfig(newConfig);
    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event("schedulingUpdated"));
  };

  const handleActivate = () => {
    if (config.hours === 0 && config.minutes === 0) {
      toast({
        title: "Invalid Configuration",
        description: "Please set at least 1 minute for the scheduling interval.",
        variant: "destructive",
      });
      return;
    }

    const newConfig = { ...config, active: true };
    saveConfig(newConfig);
    toast({
      title: "Scheduling Activated",
      description: `Sensors will run every ${config.hours}h ${config.minutes}m`,
    });
  };

  const handleDeactivate = () => {
    const newConfig = { ...config, active: false };
    saveConfig(newConfig);
    toast({
      title: "Scheduling Deactivated",
      description: "Automatic sensor readings have been stopped.",
    });
  };

  const handleHoursChange = (value: string) => {
    const hours = Math.max(0, Math.min(23, parseInt(value) || 0));
    saveConfig({ ...config, hours });
  };

  const handleMinutesChange = (value: string) => {
    const minutes = Math.max(0, Math.min(59, parseInt(value) || 0));
    saveConfig({ ...config, minutes });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Scheduling</h1>
          <p className="text-muted-foreground">Configure automatic sensor reading intervals</p>
        </header>

        <SystemStatus />

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Interval Configuration
              </CardTitle>
              <CardDescription>
                Set how often the sensors should take readings automatically
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hours">Hours</Label>
                  <Input
                    id="hours"
                    type="number"
                    min="0"
                    max="23"
                    value={config.hours}
                    onChange={(e) => handleHoursChange(e.target.value)}
                    className="text-lg"
                    disabled={config.active}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minutes">Minutes</Label>
                  <Input
                    id="minutes"
                    type="number"
                    min="0"
                    max="59"
                    value={config.minutes}
                    onChange={(e) => handleMinutesChange(e.target.value)}
                    className="text-lg"
                    disabled={config.active}
                  />
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Interval Summary</p>
                <p className="text-lg font-semibold text-foreground">
                  {config.hours > 0 && `${config.hours} hour${config.hours !== 1 ? "s" : ""}`}
                  {config.hours > 0 && config.minutes > 0 && " and "}
                  {config.minutes > 0 && `${config.minutes} minute${config.minutes !== 1 ? "s" : ""}`}
                  {config.hours === 0 && config.minutes === 0 && "Not configured"}
                </p>
              </div>

              {!config.active ? (
                <Button onClick={handleActivate} className="w-full" size="lg">
                  <Play className="w-4 h-4 mr-2" />
                  Activate Scheduling
                </Button>
              ) : (
                <Button onClick={handleDeactivate} variant="destructive" className="w-full" size="lg">
                  <Square className="w-4 h-4 mr-2" />
                  Deactivate Scheduling
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Current Status
              </CardTitle>
              <CardDescription>Active scheduling configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Status</span>
                  <span
                    className={`text-sm font-semibold px-3 py-1 rounded-full ${
                      config.active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {config.active ? "Active" : "Inactive"}
                  </span>
                </div>
                {config.active && (
                  <>
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-muted-foreground">Reading Interval</span>
                        <span className="text-sm font-semibold text-foreground">
                          {config.hours}h {config.minutes}m
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-3 text-sm text-muted-foreground">
                <p className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Sensors will automatically take readings at the configured interval</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>You can modify the interval when scheduling is inactive</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Manual control is still available regardless of scheduling status</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Scheduling;
