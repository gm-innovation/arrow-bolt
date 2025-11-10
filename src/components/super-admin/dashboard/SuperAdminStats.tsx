import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, FileText, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsProps {
  stats?: {
    totalCompanies: number;
    totalUsers: number;
    totalServiceOrders: number;
    activeCompanies: number;
  };
  isLoading?: boolean;
}

export function SuperAdminStats({ stats, isLoading }: StatsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statsData = [
    {
      title: "Total de Empresas",
      value: stats?.totalCompanies || 0,
      description: "Empresas cadastradas",
      icon: Building2,
      color: "text-blue-600",
    },
    {
      title: "Empresas Ativas",
      value: stats?.activeCompanies || 0,
      description: "Com pagamento em dia",
      icon: CheckCircle2,
      color: "text-green-600",
    },
    {
      title: "Total de Usuários",
      value: stats?.totalUsers || 0,
      description: "Usuários no sistema",
      icon: Users,
      color: "text-purple-600",
    },
    {
      title: "Ordens de Serviço",
      value: stats?.totalServiceOrders || 0,
      description: "Total de OS criadas",
      icon: FileText,
      color: "text-orange-600",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statsData.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
