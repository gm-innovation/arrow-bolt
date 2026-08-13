import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { VacationGrant } from "@/hooks/useVacations";

const normalize = (v: string) =>
  v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function GrantsTable({
  grants,
  isLoading,
  canManage,
  onEdit,
  onDelete,
}: {
  grants: VacationGrant[];
  isLoading?: boolean;
  canManage?: boolean;
  onEdit?: (grant: VacationGrant) => void;
  onDelete?: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [toDelete, setToDelete] = useState<VacationGrant | null>(null);

  const rows = useMemo(() => {
    const term = normalize(search.trim());
    if (!term) return grants;
    return grants.filter((g) => normalize(g.employee?.full_name ?? "").includes(term));
  }, [grants, search]);

  return (
    <div className="space-y-3">
      <Input
        placeholder="Buscar colaborador..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Colaborador</TableHead>
            <TableHead>Período gozado</TableHead>
            <TableHead className="text-center">Dias</TableHead>
            <TableHead className="text-center">Abono</TableHead>
            <TableHead>Pagamento</TableHead>
            <TableHead>Observações</TableHead>
            {canManage && <TableHead className="text-right">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={canManage ? 7 : 6} className="py-8 text-center text-muted-foreground">
                Carregando...
              </TableCell>
            </TableRow>
          )}
          {!isLoading && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={canManage ? 7 : 6} className="py-8 text-center text-muted-foreground">
                Nenhuma férias gozada registrada.
              </TableCell>
            </TableRow>
          )}
          {rows.map((g) => (
            <TableRow key={g.id}>
              <TableCell className="font-medium">
                {g.employee?.full_name ?? "—"}
                {g.employee?.position && (
                  <div className="text-xs text-muted-foreground">{g.employee.position}</div>
                )}
              </TableCell>
              <TableCell className="text-sm">
                {format(parseISO(g.data_inicio_gozo), "dd/MM/yyyy")} →{" "}
                {format(parseISO(g.data_fim_gozo), "dd/MM/yyyy")}
              </TableCell>
              <TableCell className="text-center">{g.quantidade_dias}</TableCell>
              <TableCell className="text-center">{g.dias_abono}</TableCell>
              <TableCell className="text-sm">
                {g.data_pagamento ? format(parseISO(g.data_pagamento), "dd/MM/yyyy") : "—"}
              </TableCell>
              <TableCell className="max-w-[16rem] truncate text-sm text-muted-foreground">
                {g.observacoes ?? "—"}
              </TableCell>
              {canManage && (
                <TableCell className="space-x-1 text-right whitespace-nowrap">
                  <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => onEdit?.(g)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Excluir"
                    onClick={() => setToDelete(g)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro de férias gozadas?</AlertDialogTitle>
            <AlertDialogDescription>
              Os períodos aquisitivos de {toDelete?.employee?.full_name ?? "o colaborador"} serão
              recalculados sem esse gozo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toDelete) onDelete?.(toDelete.id);
                setToDelete(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
