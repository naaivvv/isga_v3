import { useEffect, useState } from "react";
import { Activity, Droplet, Wind } from "lucide-react";
import Navbar from "@/components/Navbar";
import SystemStatus from "@/components/SystemStatus";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const Index = () => {
  const [coLevel, setCoLevel] = useState(0);
  const [co2Level, setCo2Level] = useState(0);
  const [o2Level, setO2Level] = useState(0);

  useEffect(() => {
    const fetchSensorData = async () => {
      try {
        const response = await fetch("http://192.168.1.10/chrono-state/php-backend/get_sensor_data.php");
        const data = await response.json();

        // ✅ Ensure values are numeric
        const co = Number(data.co) || 0;
        const co2ppm = Number(data.co2) || 0;
        const o2 = Number(data.o2) || 0;

        // ✅ Convert CO2 ppm → percent
        const co2percent = co2ppm / 10000;

        setCoLevel(co);
        setCo2Level(co2percent);
        setO2Level(o2);
      } catch (error) {
        console.error("Error fetching sensor data:", error);
      }
    };

    fetchSensorData();
    const interval = setInterval(fetchSensorData, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Industrial Stack Gas Analyzer - Real-time monitoring and control system
          </p>
        </header>

        <SystemStatus />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* CO Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-red-500" />
                  Carbon Monoxide (CO)
                </span>
              </CardTitle>
              <CardDescription>Current CO levels</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-foreground">
                    {coLevel.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground">ppm</span>
                </div>
                <Progress value={coLevel} className="h-2" />
                <p className="text-sm text-muted-foreground">Safe limit: 50 ppm</p>
              </div>
            </CardContent>
          </Card>

          {/* CO2 Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Droplet className="w-5 h-5 text-orange-500" />
                  Carbon Dioxide (CO₂)
                </span>
              </CardTitle>
              <CardDescription>Current CO₂ levels</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                  {/* ✅ Display CO2 in percent */}
                  <span className="text-4xl font-bold text-foreground">
                    {co2Level.toFixed(2)}
                  </span>
                  <span className="text-muted-foreground">%</span>
                </div>

                {/* ✅ Progress based on 5% max CO2 (adjust as needed) */}
                <Progress value={(co2Level / 5) * 100} className="h-2" />

                <p className="text-sm text-muted-foreground">Safe limit: ≤ 0.5%</p>
              </div>
            </CardContent>
          </Card>

          {/* O2 Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Wind className="w-5 h-5 text-primary" />
                  Oxygen (O₂)
                </span>
              </CardTitle>
              <CardDescription>Current O₂ levels</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-foreground">
                    {o2Level.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground">%</span>
                </div>
                <Progress value={(o2Level / 21) * 100} className="h-2" />
                <p className="text-sm text-muted-foreground">Normal: 19.5–23.5%</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
