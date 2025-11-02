import { AlertCircle, CheckCircle, Clock, Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

const SystemStatus = () => {
  const [uptime, setUptime] = useState("00:00:00");
  const [schedulingActive, setSchedulingActive] = useState(false);

  useEffect(() => {
    // Update uptime
    let seconds = 0;
    const interval = setInterval(() => {
      seconds++;
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      setUptime(
        `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Load scheduling status from database
    const updateSchedulingStatus = async () => {
      try {
        const response = await fetch('http://192.168.0.100/projectgas/get_schedule.php');
        const config = await response.json();
        setSchedulingActive(config.active === 1);
      } catch (error) {
        console.error('Error fetching scheduling status:', error);
      }
    };

    updateSchedulingStatus();

    // Listen for scheduling updates
    window.addEventListener("schedulingUpdated", updateSchedulingStatus);

    return () => {
      window.removeEventListener("schedulingUpdated", updateSchedulingStatus);
    };
  }, []);

  return (
    <div className="bg-card rounded-xl shadow-md p-6 mb-8">
      <h2 className="text-xl font-semibold text-card-foreground mb-6 flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-primary" />
        System Status
      </h2>
      <div className="flex flex-wrap gap-3">
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1.5">
          <CheckCircle className="w-4 h-4 mr-2" />
          Connection: Active
        </Badge>
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1.5">
          <Clock className="w-4 h-4 mr-2" />
          Uptime: {uptime}
        </Badge>
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
