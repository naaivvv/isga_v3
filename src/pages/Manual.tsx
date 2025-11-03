import { useState, useEffect } from "react";
import { Fan, Gauge } from "lucide-react";
import Navbar from "@/components/Navbar";
import SystemStatus from "@/components/SystemStatus";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
// Import the sendESP32Command function from api.ts
import { sendESP32Command } from "@/lib/api";

const Manual = () => {
  const { toast } = useToast();
  const [fanActive, setFanActive] = useState(false);
  const [compressorActive, setCompressorActive] = useState(false);

  // Fetch initial states from database
  useEffect(() => {
    const fetchStates = async () => {
      try {
        // This URL should be correct, pointing to your PHP backend
        const response = await fetch(
          "http://192.168.1.10/chrono-state/php-backend/get_sensor_data.php",
        );
        const data = await response.json();
        setFanActive(data.fan === 1);
        setCompressorActive(data.compressor === 1);
      } catch (error) {
        console.error("Error fetching device states:", error);
      }
    };
    fetchStates();
  }, []);

  const handleFanToggle = async () => {
    const newState = !fanActive;

    try {
      // Use the imported function from api.ts
      await sendESP32Command("fan", newState);

      setFanActive(newState);
      toast({
        title: newState ? "Fan Started" : "Fan Stopped",
        description: newState
          ? "Ventilation fan is now running"
          : "Ventilation fan has been stopped",
      });
    } catch (error) {
      console.error("Error sending command:", error);
      toast({
        title: "Error",
        description: "Failed to control fan. Check ESP32 connection.",
        variant: "destructive",
      });
    }
  };

  const handleCompressorToggle = async () => {
    const newState = !compressorActive;

    try {
      // Use the imported function from api.ts
      await sendESP32Command("compressor", newState);

      setCompressorActive(newState);
      toast({
        title: newState ? "Compressor Started" : "Compressor Stopped",
        description: newState
          ? "Air compressor is now running"
          : "Air compressor has been stopped",
      });
    } catch (error) {
      console.error("Error sending command:", error);
      toast({
        title: "Error",
        description: "Failed to control compressor. Check ESP32 connection.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Manual Control</h1>
          <p className="text-muted-foreground">
            Direct system operation interface
          </p>
        </header>

        <SystemStatus />

        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Fan Control */}
              <Card
                className={`transition-all border-2 ${
                  fanActive ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          fanActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <Fan
                          className={`w-6 h-6 ${fanActive ? "animate-spin" : ""}`}
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          Ventilation Fan
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Air circulation system
                        </p>
                      </div>
                    </div>
                    <Badge variant={fanActive ? "default" : "secondary"}>
                      {fanActive ? "Running" : "Stopped"}
                    </Badge>
                  </div>
                  <Button
                    onClick={handleFanToggle}
                    className="w-full"
                    variant={fanActive ? "destructive" : "default"}
                  >
                    {fanActive ? "Stop Fan" : "Start Fan"}
                  </Button>
                </CardContent>
              </Card>

              {/* Compressor Control */}
              <Card
                className={`transition-all border-2 ${
                  compressorActive
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          compressorActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <Gauge className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          Air Compressor
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Gas sampling system
                        </p>
                      </div>
                    </div>
                    <Badge variant={compressorActive ? "default" : "secondary"}>
                      {compressorActive ? "Running" : "Stopped"}
                    </Badge>
                  </div>
                  <Button
                    onClick={handleCompressorToggle}
                    className="w-full"
                    variant={compressorActive ? "destructive" : "default"}
                  >
                    {compressorActive ? "Stop Compressor" : "Start Compressor"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-6 border-amber-200 bg-amber-50">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5"></div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-amber-900 mb-1">
                      Safety Notice
                    </h4>
                    <p className="text-sm text-amber-800">
                      Manual controls override automatic scheduling. Ensure
                      proper safety protocols are followed when operating system
                      components manually. Monitor gas levels continuously
                      during manual operation.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Manual;