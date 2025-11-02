import Navbar from "@/components/Navbar";
import SystemStatus from "@/components/SystemStatus";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Manual = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Manual Control</h1>
          <p className="text-muted-foreground">Direct system operation interface</p>
        </header>

        <SystemStatus />

        <Card>
          <CardHeader>
            <CardTitle>Manual Controls</CardTitle>
            <CardDescription>Coming soon - Manual control interface</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This page will allow you to manually control the gas analyzer system.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Manual;
