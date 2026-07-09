import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface Row {
  employee_id: string;
  full_name: string;
  cpf: string;
  position: string;
  hire_date: string;
  status: string;
  hours_normal: number;
  hours_extra: number;
  hours_night: number;
  hours_standby: number;
  absence_days_by_type: Record<string, number>;
  vacation_days_in_period: number;
  sold_days: number;
  advance_13th: boolean;
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const absenceLabels: Record<string, string> = {
  vacation: "Férias",
  sick_leave: "Atestado",
  personal: "Abono",
  maternity: "Maternidade",
  paternity: "Paternidade",
  bereavement: "Luto",
  unpaid: "Sem remuneração",
  other: "Outros",
};

export default function PayrollExport() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const { toast } = useToast();

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["hr-payroll-export", year, month],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("hr-payroll-export", {
        body: { year, month },
      });
      if (error) throw error;
      return data as { period: { startDate: string; endDate: string }; rows: Row[] };
    },
    enabled: false,
  });

  const rows = data?.rows ?? [];

  const absenceTypes = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => Object.keys(r.absence_days_by_type ?? {}).forEach((t) => set.add(t)));
    return Array.from(set);
  }, [rows]);

  const buildSheet = () => {
    return rows.map((r) => {
      const base: Record<string, any> = {
        "Nome": r.full_name,
        "CPF": r.cpf,
        "Cargo": r.position,
        "Admissão": r.hire_date,
        "Status": r.status,
        "Horas Normais": r.hours_normal,
        "Horas Extras": r.hours_extra,
        "Horas Noturnas": r.hours_night,
        "Sobreaviso": r.hours_standby,
        "Dias de Férias no Mês": r.vacation_days_in_period,
        "Abono Pecuniário (dias)": r.sold_days,
        "Adiantamento 13º": r.advance_13th ? "Sim" : "Não",
      };
      absenceTypes.forEach((t) => {
        base[`Ausência: ${absenceLabels[t] ?? t} (dias)`] = r.absence_days_by_type?.[t] ?? 0;
      });
      return base;
    });
  };

  const exportXlsx = () => {
    if (!rows.length) return;
    const ws = XLSX.utils.json_to_sheet(buildSheet());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Folha");
    XLSX.writeFile(wb, `folha_${year}_${String(month).padStart(2, "0")}.xlsx`);
  };

  const exportCsv = () => {
    if (!rows.length) return;
    const sheet = buildSheet();
    const headers = Object.keys(sheet[0]);
    const csv = [
      headers.join(";"),
      ...sheet.map((r) => headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(";")),
    ].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `folha_${year}_${String(month).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerate = async () => {
    try {
      await refetch();
      toast({ title: "Dados carregados", description: "Confira a prévia antes de exportar." });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-3xl font-bold">Exportação para Folha de Pagamento</h1>
        <p className="text-muted-foreground mt-1">
          Consolide horas trabalhadas, ausências e férias do período para envio à folha.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Período de referência</CardTitle>
          <CardDescription>Selecione mês e ano de fechamento</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label>Mês</Label>
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Ano</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerate} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Gerar prévia
          </Button>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>
              <Download className="h-4 w-4 mr-2" /> CSV
            </Button>
            <Button onClick={exportXlsx} disabled={!rows.length}>
              <FileSpreadsheet className="h-4 w-4 mr-2" /> XLSX
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prévia dos dados</CardTitle>
          <CardDescription>
            {data ? `${rows.length} colaboradores · ${data.period.startDate} a ${data.period.endDate}` : "Gere a prévia para visualizar"}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {rows.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">Nenhum dado carregado ainda.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead className="text-right">Normais</TableHead>
                  <TableHead className="text-right">Extras</TableHead>
                  <TableHead className="text-right">Noturnas</TableHead>
                  <TableHead className="text-right">Sobreaviso</TableHead>
                  <TableHead className="text-right">Férias (dias)</TableHead>
                  <TableHead className="text-right">Abono (dias)</TableHead>
                  <TableHead>Ausências</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.employee_id}>
                    <TableCell className="font-medium">{r.full_name}</TableCell>
                    <TableCell>{r.position || "-"}</TableCell>
                    <TableCell className="text-right">{r.hours_normal.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{r.hours_extra.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{r.hours_night.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{r.hours_standby.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{r.vacation_days_in_period}</TableCell>
                    <TableCell className="text-right">{r.sold_days}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(r.absence_days_by_type ?? {}).map(([t, d]) => (
                          <Badge key={t} variant="secondary">
                            {absenceLabels[t] ?? t}: {d}d
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
