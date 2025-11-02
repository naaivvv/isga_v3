import { useState, useEffect, useCallback } from "react";
import { Calendar, Clock, Play, Square, Timer, Zap } from "lucide-react";
import Navbar from "@/components/Navbar";
import SystemStatus from "@/components/SystemStatus";
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
// Import only the functions we actually need
import { 
  sendESP32Command, 
  saveSchedule as saveScheduleApi 
} from "@/lib/api";

// Configuration for pre-reading sequence times (in milliseconds)
const FAN_TIME_MS = 10000;
const COMPRESSOR_TIME_MS = 10000;
const SENSOR_READ_TIME_MS = 10000; // This is the wait time for the ESP32 to send its data

interface SchedulingConfig {
  hours: number;
  minutes: number;
  active: boolean;
  updatedAt?: string;
}

const Scheduling = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState<SchedulingConfig>({
    hours: 0,
    minutes: 30,
    active: false,
  });
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [isReading, setIsReading] = useState<boolean>(false);

  // --- Helper to save configuration to backend (using the imported API function) ---
  const saveConfig = async (newConfig: SchedulingConfig, silent = false) => {
    try {
      await saveScheduleApi({
        hours: newConfig.hours,
        minutes: newConfig.minutes,
        active: newConfig.active ? 1 : 0,
      });
      // Update local state immediately
      setConfig({ ...newConfig, updatedAt: new Date().toISOString() });

      if (!silent) {
        // Trigger refresh event
        setTimeout(() => {
          window.dispatchEvent(new Event("schedulingUpdated"));
        }, 500);
      }
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
  const handleDeactivate = (silent = false) => {
    const newConfig = { ...config, active: false };
    setConfig(newConfig); 
    setIsReading(false); 
    setRemainingTime(0);
    saveConfig(newConfig, true); 

    if (!silent) {
      toast({
        title: "Scheduling Deactivated",
        description: "Automatic sensor readings have been stopped.",
      });
    }
  };


  // --- Execute the Sensor Reading Cycle ---
  const executeReadingCycle = useCallback(async () => {
    if (!config.active) {
        console.log("Cycle aborted: Schedule is inactive.");
        setIsReading(false);
        setRemainingTime(0);
        return;
    }

    setIsReading(true);
    let commandsSuccessful = false;

    toast({
      title: "Cycle Started",
      description: "Executing automatic sensor reading sequence...",
    });

    try {
      // --- Start of ESP32 Control Sequence ---
      
      try {
        // 1. Turn on Fan for 10 seconds
        await sendESP32Command('fan', true);
        toast({ title: "Fan ON", description: "Starting ventilation." });
        await new Promise(resolve => setTimeout(resolve, FAN_TIME_MS));
        await sendESP32Command('fan', false);
        toast({ title: "Fan OFF", description: "Ventilation complete." });

        // 2. Turn on Compressor for 10 seconds
        await sendESP32Command('compressor', true);
        toast({ title: "Compressor ON", description: "Starting gas sampling." });
        await new Promise(resolve => setTimeout(resolve, COMPRESSOR_TIME_MS));
        await sendESP32Command('compressor', false);
        toast({ title: "Compressor OFF", description: "Sampling complete." });

        // 3. Wait for Sensor Reading
        // During this 10-second window, the ESP32's 10-second loop 
        // will fire and it will send its data to sensor_value.php
        toast({
          title: "Reading Sensors",
          description: "Waiting for device to save data... (10s)",
        });
        await new Promise(resolve => setTimeout(resolve, SENSOR_READ_TIME_MS));
        
        // We assume the commands were sent successfully.
        // The ESP32 is responsible for the actual data.
        commandsSuccessful = true;

        toast({
          title: "Cycle Complete",
          description: "Device has saved its new reading.",
          duration: 4000,
        });

      } catch (error) {
        // Hardware or API Error catch
        console.error("Hardware or API Error during reading cycle:", error);
        toast({
          title: "Hardware Warning",
          description: "Failed to communicate with ESP32. Resetting countdown.",
          variant: "destructive",
        });
        // Attempt to ensure devices are turned off anyway
        await sendESP32Command('fan', false).catch(() => {});
        await sendESP32Command('compressor', false).catch(() => {});
      }
      
      // --- End of Sequence ---

    } catch (error) {
      // General error catch
      console.error("Critical Error in Cycle Execution:", error);
    } finally {
      setIsReading(false);
      
      // Only restart the countdown if the schedule is still active.
      if (config.active) {
        // 4. Restart Countdown on the client
        const totalSeconds = config.hours * 3600 + config.minutes * 60;
        setRemainingTime(totalSeconds);
        
        // Update DB to reset the 'updated_at' timestamp
        saveConfig({ ...config, active: true }, true); 
        
        const cycleStatus = commandsSuccessful ? "Commands Sent" : "Failed - Hardware Offline";
        toast({
          title: `Cycle Finished (${cycleStatus})`,
          description: `Next reading in ${config.hours}h ${config.minutes}m`,
          duration: 3000,
        });
      } else {
        // If config.active is false (manually stopped)
        setRemainingTime(0);
        console.log("Countdown reset aborted: Schedule was manually deactivated.");
      }
    }
  }, [config.hours, config.minutes, config.active, toast, saveConfig]);

  // --- Handle Cycle Completion (Trigger the reading cycle) ---
  const handleCycleCompletion = () => {
    if (!config.active) return;
    
    toast({
      title: "Countdown Finished",
      description: "Time for the next automatic sensor reading.",
    });
    executeReadingCycle();
  };


  // --- Fetch schedule from backend ---
  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        // Make sure this URL is correct
        const response = await fetch("http://192.168.1.10/chrono-state/php-backend/get_schedule.php");
        const data = await response.json();

        const active = data.active === "1" || data.active === 1;
        const hours = Number(data.hours) || 0;
        const minutes = Number(data.minutes) || 0;
        const updatedAt = data.updated_at;

        setConfig({ hours, minutes, active, updatedAt });

        if (active && updatedAt) {
          const totalSeconds = hours * 3600 + minutes * 60;
          const now = new Date();
          const updatedTime = new Date(updatedAt.replace(" ", "T")); 
          const elapsedSeconds = Math.floor((now.getTime() - updatedTime.getTime()) / 1000);
          let remaining = totalSeconds - elapsedSeconds;

          if (remaining > 0) {
            setRemainingTime(remaining);
          } else {
            setRemainingTime(0);
          }
        } else {
          setRemainingTime(0);
        }
      } catch (error) {
        console.error("Error fetching schedule:", error);
      }
    };

    fetchSchedule();
  }, []); 

  // --- Countdown effect ---
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (config.active && remainingTime <= 1 && !isReading) {
      if (remainingTime === 0) {
          handleCycleCompletion();
          return () => { if (timer) clearInterval(timer); };
      }
    }

    if (config.active && remainingTime > 0 && !isReading) {
      timer = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            clearInterval(timer!);
            handleCycleCompletion(); 
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [config.active, remainingTime, isReading, handleCycleCompletion]);

  // --- Convert seconds to HH:MM:SS ---
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // --- Activate Scheduling ---
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

    const totalSeconds = config.hours * 3600 + config.minutes * 60;
    setRemainingTime(totalSeconds);

    toast({
      title: "Scheduling Activated",
      description: `Sensors will run every ${config.hours}h ${config.minutes}m. Starting countdown...`,
    });
  };

  // --- Handle input changes ---
  const handleHoursChange = (value: string) => {
    const hours = Math.max(0, Math.min(23, parseInt(value) || 0));
    saveConfig({ ...config, hours }, true); // Silent save for input changes
  };

  const handleMinutesChange = (value: string) => {
    const minutes = Math.max(0, Math.min(59, parseInt(value) || 0));
    saveConfig({ ...config, minutes }, true); // Silent save for input changes
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

        <div className="grid gap-6 md:grid-cols-2">
          {/* Left panel */}
          <Card>
            <CardHeader>
              {/* ... (rest of the JSX is unchanged) ... */}
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
                  onClick={() => handleDeactivate(false)}
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

          {/* Right panel */}
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