import { useState, useEffect } from "react";
import { Calendar, Clock, Play, Square, Timer, Zap } from "lucide-react";
import Navbar from "@/components/Navbar";
import SystemStatus from "@/components/SystemStatus";
import SensorDataCards from "@/components/SensorDataCards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
// Import only the save function
import { saveSchedule as saveScheduleApi, ScheduleConfig as ApiScheduleConfig } from "@/lib/api";

interface SchedulingConfig {
  hours: number;
  minutes: number;
  active: boolean;
}

// --- New helper function to dispatch state changes ---
const dispatchScheduleChange = () => {
  window.dispatchEvent(new Event('scheduleChanged'));
};

const Scheduling = () => {
  const { toast } = useToast();
  // This config is just for displaying in the input fields
  const [config, setConfig] = useState<SchedulingConfig>({
    hours: 0,
    minutes: 30,
    active: false,
  });
  
  // This state is now controlled by the listener
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [isReading, setIsReading] = useState<boolean>(false); // This will be faked by timer=0

  // --- Helper to save configuration to backend ---
  const saveConfig = async (newConfig: SchedulingConfig, silent = false) => {
    try {
      const apiConfig: ApiScheduleConfig = {
        hours: newConfig.hours,
        minutes: newConfig.minutes,
        active: newConfig.active ? 1 : 0,
      };
      await saveScheduleApi(apiConfig);
      setConfig(newConfig); // Update local inputs

      // Always dispatch the event so SystemStatus can update immediately
      dispatchScheduleChange();
    } catch (error) {
      console.error("Error saving schedule:", error);
      toast({
        title: "Error",
        description: "Failed to save schedule to database",
        variant: "destructive",
      });
    }
  };
  
  // --- Deactivate Scheduling (Manual Stop) ---
  const handleDeactivate = async () => {
    const newConfig = { ...config, active: false };
    setConfig(newConfig);
    await saveConfig(newConfig);
    
    toast({
      title: "Scheduling Deactivated",
      description: "Automatic sensor readings have been stopped.",
    });
  };

  // --- Activate Scheduling ---
  const handleActivate = async () => {
    if (config.hours === 0 && config.minutes === 0) {
      toast({
        title: "Invalid Configuration",
        description: "Please set at least 1 minute for the scheduling interval.",
        variant: "destructive",
      });
      return;
    }
    const newConfig = { ...config, active: true };
    await saveConfig(newConfig);

    toast({
      title: "Scheduling Activated",
      description: `Sensors will run every ${config.hours}h ${config.minutes}m. Starting countdown...`,
    });
  };

  // --- Fetch schedule from backend (SIMPLE version) ---
  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const response = await fetch("http://192.168.1.10/isga_v3/php-backend/get_schedule.php");
        const data = await response.json();
        const active = data.active === "1" || data.active === 1;
        const hours = Number(data.hours) || 0;
        const minutes = Number(data.minutes) || 0;
        setConfig({ hours, minutes, active });
      } catch (error) {
        console.error("Error fetching schedule:", error);
      }
    };

    fetchSchedule();
    // Also listen for changes (e.g., if deactivated from another tab)
    window.addEventListener('scheduleChanged', fetchSchedule);
    return () => {
      window.removeEventListener('scheduleChanged', fetchSchedule);
    };
  }, []); 

  // --- New listener for timer synchronization ---
  useEffect(() => {
    const handleTimeUpdate = (event: CustomEvent) => {
      const newTime = event.detail;
      setRemainingTime(newTime);
      // If time is 0 but schedule is active, it's reading
      if (newTime === 0 && config.active) {
        setIsReading(true);
      } else {
        setIsReading(false);
      }
    };
    window.addEventListener('timeUpdated', handleTimeUpdate as EventListener);
    return () => {
      window.removeEventListener('timeUpdated', handleTimeUpdate as EventListener);
    };
  }, [config.active]); // Re-run if config.active changes

  // --- Convert seconds to HH:MM:SS ---
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // --- Handle input changes ---
  const handleHoursChange = (value: string) => {
    const hours = Math.max(0, Math.min(23, parseInt(value) || 0));
    setConfig(prev => ({ ...prev, hours }));
  };

  const handleMinutesChange = (value: string) => {
    const minutes = Math.max(0, Math.min(59, parseInt(value) || 0));
    setConfig(prev => ({ ...prev, minutes }));
  };
  
  // --- Save on blur ---
  const handleSaveOnBlur = () => {
    saveConfig(config);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Scheduling</h1>
          <p className="text-muted-foreground">
            Configure automatic sensor reading intervals
          </p>
        </header>

        <SystemStatus />

        <SensorDataCards />

        <div className="grid gap-6 md:grid-cols-2">
          {/* Left panel */}
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
                    onBlur={handleSaveOnBlur} // Save when user clicks away
                    className="text-lg"
                    disabled={config.active || isReading}
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
                    onBlur={handleSaveOnBlur} // Save when user clicks away
                    className="text-lg"
                    disabled={config.active || isReading}
                  />
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">
                  Interval Summary
                </p>
                <p className="text-lg font-semibold text-foreground">
                  {config.hours > 0 && `${config.hours} hour${config.hours !== 1 ? "s" : ""}`}
                  {config.hours > 0 && config.minutes > 0 && " and "}
                  {config.minutes > 0 && `${config.minutes} minute${config.minutes !== 1 ? "s" : ""}`}
                  {config.hours === 0 && config.minutes === 0 && "Not configured"}
                </p>
              </div>

              {!config.active ? (
                <Button onClick={handleActivate} className="w-full" size="lg" disabled={isReading}>
                  <Play className="w-4 h-4 mr-2" />
                  Activate Scheduling
                </Button>
              ) : (
                <Button
                  onClick={handleDeactivate}
                  variant="destructive"
                  className="w-full"
                  size="lg"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Deactivate Scheduling
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Right panel (now listens for updates) */}
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
                  <span className="text-sm font-medium text-muted-foreground">
                    Status
                  </span>
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

                {/* Reading Status */}
                {isReading && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground flex items-center gap-2 animate-pulse">
                        <Zap className="w-4 h-4 text-primary" /> **EXECUTING READING CYCLE**
                      </span>
                    </div>
                  </div>
                )}


                {/* Countdown */}
                {config.active && !isReading && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <Timer className="w-4 h-4 text-primary" /> Time Remaining
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {formatTime(remainingTime)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Scheduling;