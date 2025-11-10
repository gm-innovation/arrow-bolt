import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, MoreHorizontal, Building2, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { ChangePlanDialog } from "@/components/super-admin/subscriptions/ChangePlanDialog";
import { ChangeStatusDialog } from "@/components/super-admin/subscriptions/ChangeStatusDialog";
import { exportToCSV, formatDateForExport } from "@/lib/exportUtils";

const Subscriptions = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [changePlanSub, setChangePlanSub] = useState<any>(null);
  const [changeStatusSub, setChangeStatusSub] = useState<any>(null);
  const [cancelSubId, setCancelSubId] = useState<string | null>(null);

  const { subscriptions, isLoading, cancelSubscription } = useSubscriptions();

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((sub) => {
      const matchesSearch = sub.company_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesPlan = !planFilter || sub.subscription_plan === planFilter;
      const matchesStatus =
        !statusFilter ||
        (statusFilter === "paid" && sub.payment_status === "paid") ||
        (statusFilter === "pending" && sub.payment_status === "pending") ||
        (statusFilter === "overdue" && sub.payment_status === "overdue");

      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [subscriptions, searchTerm, planFilter, statusFilter]);

  const handleExport = () => {
    const exportData = filteredSubscriptions.map((sub) => ({
      empresa: sub.company_name,
      email: sub.email || "",
      telefone: sub.phone || "",
      plano: sub.subscription_plan || "Sem plano",
      status_pagamento: sub.payment_status || "",
      data_criacao: formatDateForExport(sub.created_at),
    }));

    exportToCSV(exportData, "assinaturas");
  };

  const handleCancelSubscription = async () => {
    if (cancelSubId) {
      await cancelSubscription(cancelSubId);
      setCancelSubId(null);
    }
  };

  const getPlanLabel = (plan: string | null) => {
    switch (plan) {
      case "basic":
        return "Basic";
      case "professional":
        return "Professional";
      case "enterprise":
        return "Enterprise";
      default:
        return "Sem plano";
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "paid":
        return (
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Pago
          </div>
        );
      case "pending":
        return (
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            Pendente
          </div>
        );
      case "overdue":
        return (
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            Atrasado
          </div>
        );
      default:
        return (
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
            Sem status
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Assinaturas</h1>
          <p className="text-muted-foreground">
            Gerencie os planos e pagamentos das empresas
          </p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar Lista
          </Button>
        </div>
      </div>

      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <Input
            placeholder="Buscar por empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-[200px]">
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Todos os planos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="basic">Basic</SelectItem>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-[200px]">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="overdue">Atrasado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(planFilter || statusFilter || searchTerm) && (
          <Button
            variant="outline"
            onClick={() => {
              setPlanFilter("");
              setStatusFilter("");
              setSearchTerm("");
            }}
          >
            Limpar Filtros
          </Button>
        )}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Status de Pagamento</TableHead>
              <TableHead>Data de Criação</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-5 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredSubscriptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <CreditCard className="h-8 w-8" />
                    <p>Nenhuma assinatura encontrada</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredSubscriptions.map((subscription) => (
                <TableRow key={subscription.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {subscription.company_name}
                      </div>
                      {subscription.email && (
                        <span className="text-xs text-muted-foreground">
                          {subscription.email}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {getPlanLabel(subscription.subscription_plan)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(subscription.payment_status)}
                  </TableCell>
                  <TableCell>
                    {format(new Date(subscription.created_at), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setChangePlanSub(subscription)}
                        >
                          Alterar Plano
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setChangeStatusSub(subscription)}
                        >
                          Alterar Status de Pagamento
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setCancelSubId(subscription.id)}
                        >
                          Cancelar Assinatura
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ChangePlanDialog
        subscription={changePlanSub}
        open={!!changePlanSub}
        onOpenChange={(open) => !open && setChangePlanSub(null)}
      />

      <ChangeStatusDialog
        subscription={changeStatusSub}
        open={!!changeStatusSub}
        onOpenChange={(open) => !open && setChangeStatusSub(null)}
      />

      <AlertDialog
        open={!!cancelSubId}
        onOpenChange={(open) => !open && setCancelSubId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Cancelamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar esta assinatura? O plano será
              removido e o status será alterado para pendente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar Cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Subscriptions;
