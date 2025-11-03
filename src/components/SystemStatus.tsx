import { AlertCircle, CheckCircle, Clock, Calendar, XCircle, Zap } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useUptime } from "@/contexts/UptimeContext";
import { 
  sendESP32Command, 
  saveSchedule as saveScheduleApi,
  ScheduleConfig as ApiScheduleConfig // Renaming import to avoid conflict
} from "@/lib/api";

// --- Times copied from Scheduling.tsx ---
const FAN_TIME_MS = 10000;
const COMPRESSOR_TIME_MS = 10000;
const SENSOR_READ_TIME_MS = 10000;

interface SchedulingConfig {
  hours: number;
  minutes: number;
  active: boolean;
  updatedAt?: string;
}

// --- Helper function to dispatch timer updates ---
const dispatchTimeUpdate = (timeInSeconds: number) => {
  window.dispatchEvent(new CustomEvent('timeUpdated', { detail: timeInSeconds }));
};

const SystemStatus = () => {
  const { toast } = useToast();
  const { uptime: uptimeSeconds } = useUptime();
  const [connectionActive, setConnectionActive] = useState(false);
  
  // --- All state logic is moved here ---
  const [config, setConfig] = useState<SchedulingConfig>({
    hours: 0,
    minutes: 30,
    active: false,
  });
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [isReading, setIsReading] = useState<boolean>(false);

  // --- Helper to save configuration (used by executeReadingCycle) ---
  const saveConfig = async (newConfig: SchedulingConfig, silent = false) => {
    try {
      const apiConfig: ApiScheduleConfig = {
        hours: newConfig.hours,
        minutes: newConfig.minutes,
        active: newConfig.active ? 1 : 0,
      };
      await saveScheduleApi(apiConfig);
      setConfig({ ...newConfig, updatedAt: new Date().toISOString() });
    } catch (error) {
      console.error("Error saving schedule:", error);
    }
  };

  // --- All timer logic is moved here ---
  const executeReadingCycle = useCallback(async () => {
    if (!config.active) {
        console.log("Cycle aborted: Schedule is inactive.");
        setIsReading(false);
        setRemainingTime(0);
        return;
    }
    setIsReading(true);
    let commandsSuccessful = false;
    toast({ title: "Cycle Started", description: "Executing automatic sensor reading sequence..." });
    try {
      try {
        await sendESP32Command('fan', true);
        toast({ title: "Fan ON", description: "Starting ventilation." });
        await new Promise(resolve => setTimeout(resolve, FAN_TIME_MS));
        await sendESP32Command('fan', false);
        toast({ title: "Fan OFF", description: "Ventilation complete." });

        await sendESP32Command('compressor', true);
        toast({ title: "Compressor ON", description: "Starting gas sampling." });
        await new Promise(resolve => setTimeout(resolve, COMPRESSOR_TIME_MS));
        await sendESP32Command('compressor', false);
        toast({ title: "Compressor OFF", description: "Sampling complete." });

        toast({ title: "Reading Sensors", description: "Waiting for device to save data... (10s)" });
        await new Promise(resolve => setTimeout(resolve, SENSOR_READ_TIME_MS));
        
        commandsSuccessful = true;
        toast({ title: "Cycle Complete", description: "Device has saved its new reading.", duration: 4000 });
      } catch (error) {
        console.error("Hardware or API Error during reading cycle:", error);
        toast({ title: "Hardware Warning", description: "Failed to communicate with ESP32. Resetting countdown.", variant: "destructive" });
        await sendESP32Command('fan', false).catch(() => {});
        await sendESP32Command('compressor', false).catch(() => {});
      }
    } catch (error) {
      console.error("Critical Error in Cycle Execution:", error);
    } finally {
      setIsReading(false);
      if (config.active) {
        const totalSeconds = config.hours * 3600 + config.minutes * 60;
        setRemainingTime(totalSeconds);
        dispatchTimeUpdate(totalSeconds); // Broadcast update
        saveConfig({ ...config, active: true }, true); 
        const cycleStatus = commandsSuccessful ? "Commands Sent" : "Failed - Hardware Offline";
        toast({ title: `Cycle Finished (${cycleStatus})`, description: `Next reading in ${config.hours}h ${config.minutes}m`, duration: 3000 });
      } else {
        setRemainingTime(0);
        dispatchTimeUpdate(0); // Broadcast update
        console.log("Countdown reset aborted: Schedule was manually deactivated.");
      }
    }
  }, [config.hours, config.minutes, config.active, toast]); // saveConfig removed, using local version

  const handleCycleCompletion = useCallback(() => {
    if (!config.active) return;
    toast({ title: "Countdown Finished", description: "Time for the next automatic sensor reading." });
    executeReadingCycle();
  }, [config.active, executeReadingCycle, toast]);

  // --- Format uptime from context ---
  const formatUptime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // --- Check ESP32 connectivity ---
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const response = await fetch("http://192.168.0.111", { // Assume IP is correct
          method: "HEAD",
          signal: controller.signal,
        });
        clearTimeout(timeout);
        setConnectionActive(response.ok);
      } catch {
        setConnectionActive(false);
      }
    };
    checkConnection();
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, []);

  // --- Fetch scheduling status from backend (and calculate time) ---
  const fetchAndHandleSchedule = useCallback(async () => {
    try {
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

        // If remaining time is negative or the schedule was just activated, start fresh countdown
        if (remaining <= 0 || elapsedSeconds < 2) {
          remaining = totalSeconds;
        }
        
        setRemainingTime(remaining);
        dispatchTimeUpdate(remaining);
      } else {
        setRemainingTime(0);
        dispatchTimeUpdate(0);
        setIsReading(false);
      }
    } catch (error) {
      console.error("Error fetching scheduling status:", error);
    }
  }, []);

  // --- Effect to fetch schedule on load and listen for changes ---
  useEffect(() => {
    fetchAndHandleSchedule();
    
    // Listen for the event from Scheduling.tsx to force a refetch
    window.addEventListener('scheduleChanged', fetchAndHandleSchedule);
    
    return () => {
      window.removeEventListener('scheduleChanged', fetchAndHandleSchedule);
    };
  }, [fetchAndHandleSchedule]);

  // --- Master Countdown effect (moved from Scheduling.tsx) ---
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
            dispatchTimeUpdate(0);
            return 0;
          }
          const newTime = prev - 1;
          dispatchTimeUpdate(newTime); // Broadcast the new time
          return newTime;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [config.active, remainingTime, isReading, handleCycleCompletion]);

  // --- Helper to format time ---
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-card rounded-xl shadow-md p-6 mb-8">
      <h2 className="text-xl font-semibold text-card-foreground mb-6 flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-primary" />
        System Status
      </h2>

      <div className="flex flex-wrap gap-3">
        {/* Connection Status */}
        <Badge
          variant="outline"
          className={`px-3 py-1.5 ${
            connectionActive
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          {connectionActive ? (
            <CheckCircle className="w-4 h-4 mr-2" />
          ) : (
            <XCircle className="w-4 h-4 mr-2" />
          )}
          Connection: {connectionActive ? "Active" : "Inactive"}
        </Badge>

        {/* Uptime */}
        <Badge
          variant="outline"
          className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1.5"
        >
          <Clock className="w-4 h-4 mr-2" />
          Uptime: {formatUptime(uptimeSeconds)}
        </Badge>

        {/* Scheduling */}
        <Badge
          variant="outline"
          className={`px-3 py-1.5 ${
            config.active
              ? "bg-primary/10 text-primary border-primary/20"
              : "bg-muted text-muted-foreground border-border"
          }`}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Scheduling: {config.active ? "Active" : "Inactive"}
          
          {config.active && !isReading && remainingTime > 0 && (
            <span className="ml-2 font-mono">({formatTime(remainingTime)})</span>
          )}
          {config.active && isReading && (
            <span className="ml-2 font-mono flex items-center">
              <Zap className="w-4 h-4 mr-1 animate-pulse" />
              Executing...
            </span>
          )}
        </Badge>
      </div>
    </div>
  );
};

export default SystemStatus;