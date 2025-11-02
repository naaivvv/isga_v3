import Navbar from "@/components/Navbar";
import SystemStatus from "@/components/SystemStatus";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Calibration = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Calibration</h1>
          <p className="text-muted-foreground">System calibration and configuration</p>
        </header>

        <SystemStatus />

        <Card>
          <CardHeader>
            <CardTitle>Calibration Tools</CardTitle>
            <CardDescription>Coming soon - Calibration interface</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This page will provide tools for calibrating the gas analyzer sensors.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Calibration;
