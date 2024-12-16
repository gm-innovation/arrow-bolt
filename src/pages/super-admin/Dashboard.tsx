import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Ship, CreditCard } from "lucide-react";

const SuperAdminDashboard = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
            <Building2 className="h-4 w-4 text-navy-bright" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">25</div>
            <p className="text-xs text-muted-foreground">+2 from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-navy-bright" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">+15% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <Ship className="h-4 w-4 text-navy-bright" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">342</div>
            <p className="text-xs text-muted-foreground">+5% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-navy-bright" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$54,232</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;