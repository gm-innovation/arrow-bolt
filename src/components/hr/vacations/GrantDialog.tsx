import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  daysBetween,
  useSaveVacationGrant,
  VacationGrant,
} from "@/hooks/useVacations";
import { toast } from "sonner";

function useEmployeeOptions() {
  return useQuery({
    queryKey: ["employee-options-for-hr"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, position, direct_manager_id, status")
        .eq("status", "active")
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as unknown as {
        id: string;
        full_name: string | null;
        position: string | null;
      }[];
    },
  });
}

const normalize = (v: string) =>
  v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Cadastro da última férias gozada. Ao salvar, o banco recalcula os períodos
 * aquisitivos do colaborador (direito, usados, proporcional, limite de gozo).
 */
export function GrantDialog({
  trigger,
  grant,
  employeeId: fixedEmployeeId,
  open: controlledOpen,
  onOpenChange,
}: {
  trigger?: React.ReactNode;
  grant?: VacationGrant | null;
  employeeId?: string;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  const { profile } = useAuth();
  const employees = useEmployeeOptions();
  const save = useSaveVacationGrant();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [employeeId, setEmployeeId] = useState(grant?.employee_id ?? fixedEmployeeId ?? "");
  const [search, setSearch] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [start, setStart] = useState(grant?.data_inicio_gozo ?? "");
  const [end, setEnd] = useState(grant?.data_fim_gozo ?? "");
  const [days, setDays] = useState<string>(grant ? String(grant.quantidade_dias) : "");
  const [abono, setAbono] = useState<string>(grant ? String(grant.dias_abono) : "0");
  const [payment, setPayment] = useState(grant?.data_pagamento ?? "");
  const [notes, setNotes] = useState(grant?.observacoes ?? "");

  useEffect(() => {
    if (!open) return;
    setEmployeeId(grant?.employee_id ?? fixedEmployeeId ?? "");
    setStart(grant?.data_inicio_gozo ?? "");
    setEnd(grant?.data_fim_gozo ?? "");
    setDays(grant ? String(grant.quantidade_dias) : "");
    setAbono(grant ? String(grant.dias_abono) : "0");
    setPayment(grant?.data_pagamento ?? "");
    setNotes(grant?.observacoes ?? "");
    setSearch("");
    setListOpen(false);
  }, [open, grant, fixedEmployeeId]);

  const selected = useMemo(
    () => (employees.data ?? []).find((e) => e.id === employeeId) ?? null,
    [employees.data, employeeId]
  );

  const filtered = useMemo(() => {
    const term = normalize(search.trim());
    const list = employees.data ?? [];
    if (!term) return list.slice(0, 40);
    return list
      .filter((e) => normalize(`${e.full_name ?? ""} ${e.position ?? ""}`).includes(term))
      .slice(0, 40);
  }, [employees.data, search]);

  const computedDays = start && end ? daysBetween(start, end) : 0;
  useEffect(() => {
    if (start && end) setDays(String(daysBetween(start, end)));
  }, [start, end]);

  const invalidRange = !!start && !!end && new Date(end) < new Date(start);

  const handleSave = () => {
    if (!employeeId) return toast.error("Selecione o colaborador");
    if (!start || !end) return toast.error("Informe o início e o fim do gozo");
    if (invalidRange) return toast.error("A data fim não pode ser anterior à data de início");
    if (!profile?.company_id) return toast.error("Empresa não identificada");
    const qtd = Number(days) || computedDays;
    if (qtd <= 0) return toast.error("Quantidade de dias inválida");

    save.mutate(
      {
        id: grant?.id,
        employee_id: employeeId,
        company_id: profile.company_id,
        data_inicio_gozo: start,
        data_fim_gozo: end,
        quantidade_dias: qtd,
        dias_abono: Number(abono) || 0,
        data_pagamento: payment || null,
        observacoes: notes.trim() || null,
        registrado_por: profile.id,
      },
      { onSuccess: () => setOpen(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>
            {grant ? "Editar férias gozadas" : "Registrar última férias"}
          </DialogTitle>
          <DialogDescription>
            Ao salvar, o sistema recalcula os períodos aquisitivos, proporcional, direito e limite
            de gozo do colaborador.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {!fixedEmployeeId && !grant && (
            <div className="space-y-2">
              <Label>Colaborador</Label>
              {selected && !listOpen ? (
                <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>{selected.full_name}</span>
                  <Button variant="ghost" size="sm" onClick={() => setListOpen(true)}>
                    Trocar
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    placeholder="Buscar colaborador..."
                    value={search}
                    onFocus={() => setListOpen(true)}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setListOpen(true);
                    }}
                  />
                  {listOpen && (
                    <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border p-1">
                      {filtered.length === 0 && (
                        <p className="px-2 py-3 text-sm text-muted-foreground">
                          Nenhum colaborador encontrado.
                        </p>
                      )}
                      {filtered.map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                          onClick={() => {
                            setEmployeeId(e.id);
                            setListOpen(false);
                          }}
                        >
                          {e.full_name}
                          {e.position && (
                            <span className="block text-xs text-muted-foreground">{e.position}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {(fixedEmployeeId || grant) && (
            <p className="text-sm text-muted-foreground">
              Colaborador: <span className="font-medium text-foreground">{selected?.full_name ?? grant?.employee?.full_name ?? "—"}</span>
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="grant-start">Início do gozo</Label>
              <Input id="grant-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grant-end">Fim do gozo</Label>
              <Input id="grant-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          {invalidRange && (
            <p className="text-sm text-destructive">A data fim não pode ser anterior ao início.</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="grant-days">Dias gozados</Label>
              <Input
                id="grant-days"
                type="number"
                min={1}
                value={days}
                onChange={(e) => setDays(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grant-abono">Dias vendidos (abono)</Label>
              <Input
                id="grant-abono"
                type="number"
                min={0}
                value={abono}
                onChange={(e) => setAbono(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="grant-payment">Data de pagamento (opcional)</Label>
            <Input
              id="grant-payment"
              type="date"
              value={payment}
              onChange={(e) => setPayment(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="grant-notes">Observações</Label>
            <Textarea
              id="grant-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex.: férias concedidas conforme acordo com a diretoria"
            />
          </div>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={save.isPending}>
            {grant ? "Salvar alterações" : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
