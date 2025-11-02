import { useState } from "react";
import { Fan, Droplets, Flame, CircleDot, Sliders } from "lucide-react";
import Navbar from "@/components/Navbar";
import SystemStatus from "@/components/SystemStatus";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const Manual = () => {
  const { toast } = useToast();
  const [fanActive, setFanActive] = useState(false);
  const [pumpActive, setPumpActive] = useState(false);
  const [heaterActive, setHeaterActive] = useState(false);
  const [valveOpen, setValveOpen] = useState(false);

  const handleFanToggle = () => {
    setFanActive(!fanActive);
    toast({
      title: fanActive ? "Fan Stopped" : "Fan Started",
      description: fanActive ? "Ventilation fan has been stopped" : "Ventilation fan is now running",
    });
  };

  const handlePumpToggle = () => {
    setPumpActive(!pumpActive);
    toast({
      title: pumpActive ? "Pump Stopped" : "Pump Started",
      description: pumpActive ? "Sample pump has been stopped" : "Sample pump is now running",
    });
  };

  const handleHeaterToggle = () => {
    setHeaterActive(!heaterActive);
    toast({
      title: heaterActive ? "Heater Off" : "Heater On",
      description: heaterActive ? "Sample heater has been turned off" : "Sample heater is now active",
    });
  };

  const handleValveToggle = () => {
    setValveOpen(!valveOpen);
    toast({
      title: valveOpen ? "Valve Closed" : "Valve Opened",
      description: valveOpen ? "Gas valve has been closed" : "Gas valve is now open",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Manual Control</h1>
          <p className="text-muted-foreground">Direct system operation interface</p>
        </header>

        <SystemStatus />

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-primary" />
              Manual Controls
            </CardTitle>
            <CardDescription>Control individual system components manually</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Fan Control */}
              <Card className={`transition-all border-2 ${fanActive ? "border-primary bg-primary/5" : "border-border"}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${fanActive ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        <Fan className={`w-6 h-6 ${fanActive ? "animate-spin" : ""}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Ventilation Fan</h3>
                        <p className="text-sm text-muted-foreground">Air circulation system</p>
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

              {/* Pump Control */}
              <Card className={`transition-all border-2 ${pumpActive ? "border-primary bg-primary/5" : "border-border"}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${pumpActive ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        <Droplets className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Sample Pump</h3>
                        <p className="text-sm text-muted-foreground">Gas sampling system</p>
                      </div>
                    </div>
                    <Badge variant={pumpActive ? "default" : "secondary"}>
                      {pumpActive ? "Running" : "Stopped"}
                    </Badge>
                  </div>
                  <Button
                    onClick={handlePumpToggle}
                    className="w-full"
                    variant={pumpActive ? "destructive" : "default"}
                  >
                    {pumpActive ? "Stop Pump" : "Start Pump"}
                  </Button>
                </CardContent>
              </Card>

              {/* Heater Control */}
              <Card className={`transition-all border-2 ${heaterActive ? "border-primary bg-primary/5" : "border-border"}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${heaterActive ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        <Flame className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Sample Heater</h3>
                        <p className="text-sm text-muted-foreground">Temperature control</p>
                      </div>
                    </div>
                    <Badge variant={heaterActive ? "default" : "secondary"}>
                      {heaterActive ? "Active" : "Off"}
                    </Badge>
                  </div>
                  <Button
                    onClick={handleHeaterToggle}
                    className="w-full"
                    variant={heaterActive ? "destructive" : "default"}
                  >
                    {heaterActive ? "Turn Off" : "Turn On"}
                  </Button>
                </CardContent>
              </Card>

              {/* Valve Control */}
              <Card className={`transition-all border-2 ${valveOpen ? "border-primary bg-primary/5" : "border-border"}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${valveOpen ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        <CircleDot className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Gas Valve</h3>
                        <p className="text-sm text-muted-foreground">Flow control valve</p>
                      </div>
                    </div>
                    <Badge variant={valveOpen ? "default" : "secondary"}>
                      {valveOpen ? "Open" : "Closed"}
                    </Badge>
                  </div>
                  <Button
                    onClick={handleValveToggle}
                    className="w-full"
                    variant={valveOpen ? "destructive" : "default"}
                  >
                    {valveOpen ? "Close Valve" : "Open Valve"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Safety Notice */}
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5"></div>
              </div>
              <div>
                <h4 className="font-semibold text-amber-900 mb-1">Safety Notice</h4>
                <p className="text-sm text-amber-800">
                  Manual controls override automatic scheduling. Ensure proper safety protocols are followed
                  when operating system components manually. Monitor gas levels continuously during manual operation.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Manual;
