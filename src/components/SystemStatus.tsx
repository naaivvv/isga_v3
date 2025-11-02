import { AlertCircle, CheckCircle, Clock, Calendar, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

const SystemStatus = () => {
  const [uptime, setUptime] = useState("00:00:00");
  const [schedulingActive, setSchedulingActive] = useState(false);
  const [connectionActive, setConnectionActive] = useState(false);

  // --- Simulated uptime timer ---
  useEffect(() => {
    let seconds = 0;
    const interval = setInterval(() => {
      seconds++;
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      setUptime(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s
          .toString()
          .padStart(2, "0")}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // --- Check ESP32 connectivity ---
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const response = await fetch("http://192.168.0.111", {
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

  // --- Fetch scheduling status from backend ---
  useEffect(() => {
    const updateSchedulingStatus = async () => {
      try {
        const response = await fetch("http://192.168.1.10/chrono-state/php-backend/get_schedule.php");
        const config = await response.json();
        const isActive = config.active == 1; // <-- loose equality
        setSchedulingActive(isActive);
      } catch (error) {
        console.error("Error fetching scheduling status:", error);
      }
    };

    updateSchedulingStatus();
    const interval = setInterval(updateSchedulingStatus, 5000); // <-- poll every 5s
    return () => clearInterval(interval);
  }, []);

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
          Uptime: {uptime}
        </Badge>

        {/* Scheduling */}
        <Badge
          variant="outline"
          className={`px-3 py-1.5 ${
            schedulingActive
              ? "bg-primary/10 text-primary border-primary/20"
              : "bg-muted text-muted-foreground border-border"
          }`}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Scheduling: {schedulingActive ? "Active" : "Inactive"}
        </Badge>
      </div>
    </div>
  );
};

export default SystemStatus;
