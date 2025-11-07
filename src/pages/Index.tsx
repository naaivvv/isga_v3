import { useEffect, useState } from "react";
import { Activity, Droplet, Wind } from "lucide-react";
import Navbar from "@/components/Navbar";
import SystemStatus from "@/components/SystemStatus";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";

interface CalibrationData {
  correction_slope: number;
  correction_intercept: number;
  passed: number;
}

interface HistoricalData {
  timestamp: string;
  co: number;
  co2: number;
  o2: number;
}

const Index = () => {
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  
  // Calibration correction factors
  const [coCalibration, setCoCalibration] = useState<CalibrationData>({ correction_slope: 1, correction_intercept: 0, passed: 0 });
  const [co2Calibration, setCo2Calibration] = useState<CalibrationData>({ correction_slope: 1, correction_intercept: 0, passed: 0 });
  const [o2Calibration, setO2Calibration] = useState<Calibisga_v3{ correction_slope: 1, correction_intercept: 0, passed: 0 });

  // Load calibration data on mount
  useEffect(() => {
    const fetchCalibration = async () => {
      try {
        const response = await fetch("http://192.168.1.10/chrono-state/php-backend/get_unified_calibration.php");
        const data = await response.json();
        
        if (data.CO) {
          setCoCalibration({
            correction_slope: data.CO.correction_slope || 1,
            correction_intercept: data.CO.correction_intercept || 0,
            passed: data.CO.passed || 0
          });
        }
        if (data.CO2) {
          setCo2Calibration({
            correction_slope: data.CO2.correction_slope || 1,
            correction_intercept: data.CO2.correction_intercept || 0,
            passed: data.CO2.passed || 0
          });
        }
        if (data.O2) {
          setO2Calibration({
            correction_slope: data.O2.correction_slope || 1,
            correction_intercept: data.O2.correction_intercept || 0,
            passed: data.O2.passed || 0
          });
        }
      } catch (error) {
        console.error("Error fetching calibration data:", error);
      }
    };
    fetchCalibration();
  }, []);isga_v3

  // Fetch historical sensor data and apply calibration
  useEffect(() => {
    const fetchHistoricalData = async () => {
      try {
        const response = await fetch("http://192.168.1.10/chrono-state/php-backend/get_sensor_history.php");
        const data: HistoricalData[] = await response.json();

        // Apply calibration to historical data
        const calibratedData = data.map(item => {
          const coRaw = Number(item.co) || 0;
          const co2ppmRaw = Number(item.co2) || 0;
          const o2Raw = Number(item.o2) || 0;

          // Convert CO2 ppm → percent
          const co2percentRaw = co2ppmRaw / 10000;

          // Apply linear regression calibration
          const coCalibrated = coRaw * coCalibration.correction_slope + coCalibration.correction_intercept;
          const co2Calibrated = co2percentRaw * co2Calibration.correction_slope + co2Calibration.correction_intercept;
          const o2Calibrated = o2Raw * o2Calibration.correction_slope + o2Calibration.correction_intercept;

          return {
            timestamp: item.timestamp,
            co: coCalibrated,
            co2: co2Calibrated,
            o2: o2Calibrated,
          };
        });

        setHistoricalData(calibratedData);
      } catch (error) {
        console.error("Error fetching historical data:", error);
      }
    };

    fetchHistoricalData();
    const interval = setInterval(fetchHistoricalData, 5000);
    return () => clearInterval(interval);
  }, [coCalibration, co2Calibration, o2Calibration]);

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CO Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-red-500" />
                Carbon Monoxide (CO)
              </CardTitle>
              <CardDescription>Historical CO levels (ppm)</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  co: {
                    label: "CO",
                    color: "hsl(var(--chart-1))",
                  },
                }}
                className="h-[200px] w-full"
              >
                <LineChart data={historicalData} width={400} height={200}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="timestamp" 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="co" 
                    stroke="hsl(var(--chart-1))" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* CO2 Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Droplet className="w-5 h-5 text-orange-500" />
                Carbon Dioxide (CO₂)
              </CardTitle>
              <CardDescription>Historical CO₂ levels (%)</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  co2: {
                    label: "CO₂",
                    color: "hsl(var(--chart-2))",
                  },
                }}
                className="h-[200px] w-full"
              >
                <LineChart data={historicalData} width={400} height={200}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="timestamp" 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="co2" 
                    stroke="hsl(var(--chart-2))" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* O2 Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wind className="w-5 h-5 text-primary" />
                Oxygen (O₂)
              </CardTitle>
              <CardDescription>Historical O₂ levels (%)</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  o2: {
                    label: "O₂",
                    color: "hsl(var(--chart-3))",
                  },
                }}
                className="h-[200px] w-full"
              >
                <LineChart data={historicalData} width={400} height={200}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="timestamp" 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="o2" 
                    stroke="hsl(var(--chart-3))" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
