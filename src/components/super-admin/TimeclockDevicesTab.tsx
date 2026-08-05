import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, RefreshCw, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useTimeclockDevices } from "@/hooks/useTimeclockDevices";
import type { TimeclockDevice } from "@/hooks/useHRTimesheet";

interface Company { id: string; name: string }

export default function TimeclockDevicesTab({ companies }: { companies: Company[] }) {
  const [companyId, setCompanyId] = useState<string>("");
  const [dialog, setDialog] = useState<Partial<TimeclockDevice> | null>(null);
  const { devices, syncLogs, saveDevice, syncPunches } = useTimeclockDevices(companyId || null);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Relógios de ponto (Control iD)</CardTitle>
          <CardDescription>
            Configuração da conexão com os equipamentos biométricos. A senha do relógio nunca é digitada aqui —
            informe apenas o nome do segredo do sistema onde ela está guardada (ex.: CONTROL_ID_PASSWORD).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="sm:w-80">
              <Label>Empresa</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
              >
                <option value="">Selecione…</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <Button
              disabled={!companyId}
              onClick={() => setDialog({ vendor: "control_id", integration_kind: "api", is_active: true, username: "admin", password_secret_name: "CONTROL_ID_PASSWORD" })}
            >
              <Plus className="h-4 w-4 mr-2" /> Novo relógio
            </Button>
          </div>

          {!companyId ? (
            <div className="flex items-center gap-2 rounded-md border border-dashed p-6 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4" /> Selecione uma empresa para ver e configurar os relógios.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Endereço</TableHead>
                  <TableHead>Segredo da senha</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead>Última sincronização</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(devices.data ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum relógio cadastrado para esta empresa.
                    </TableCell>
                  </TableRow>
                )}
                {(devices.data ?? []).map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="text-muted-foreground">{d.base_url}</TableCell>
                    <TableCell className="font-mono text-xs">{d.password_secret_name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={d.is_active ? "default" : "secondary"}>{d.is_active ? "Ativo" : "Inativo"}</Badge>
                    </TableCell>
                    <TableCell>{d.last_sync_at ? format(new Date(d.last_sync_at), "dd/MM/yyyy HH:mm") : "—"}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => syncPunches.mutate(d.id)} disabled={syncPunches.isPending}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDialog(d)}>Editar</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {companyId && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de sincronizações</CardTitle>
            <CardDescription>Últimas 20 execuções de leitura das batidas.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Início</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Lidas</TableHead>
                  <TableHead>Importadas</TableHead>
                  <TableHead>Erro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(syncLogs.data ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhuma sincronização registrada.
                    </TableCell>
                  </TableRow>
                )}
                {(syncLogs.data ?? []).map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{format(new Date(l.started_at), "dd/MM/yyyy HH:mm")}</TableCell>
                    <TableCell>
                      <Badge variant={l.status === "success" ? "default" : "destructive"}>{l.status}</Badge>
                    </TableCell>
                    <TableCell>{l.punches_read ?? 0}</TableCell>
                    <TableCell>{l.punches_inserted ?? 0}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[280px] truncate">
                      {l.error_message ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialog?.id ? "Editar relógio" : "Novo relógio"}</DialogTitle>
          </DialogHeader>
          {dialog && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                saveDevice.mutate(
                  {
                    id: dialog.id,
                    name: String(fd.get("name") ?? ""),
                    base_url: String(fd.get("base_url") ?? ""),
                    username: String(fd.get("username") ?? "") || null,
                    password_secret_name: String(fd.get("password_secret_name") ?? "") || null,
                    vendor: dialog.vendor ?? "control_id",
                    integration_kind: dialog.integration_kind ?? "api",
                    is_active: fd.get("is_active") === "on",
                    notes: String(fd.get("notes") ?? "") || null,
                  },
                  { onSuccess: () => setDialog(null) },
                );
              }}
            >
              <div>
                <Label>Nome</Label>
                <Input name="name" defaultValue={dialog.name ?? ""} required />
              </div>
              <div>
                <Label>Endereço (base URL)</Label>
                <Input name="base_url" defaultValue={dialog.base_url ?? ""} placeholder="http://192.168.0.10" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Usuário</Label>
                  <Input name="username" defaultValue={dialog.username ?? "admin"} />
                </div>
                <div>
                  <Label>Nome do segredo da senha</Label>
                  <Input name="password_secret_name" defaultValue={dialog.password_secret_name ?? "CONTROL_ID_PASSWORD"} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch name="is_active" defaultChecked={dialog.is_active ?? true} />
                <Label>Ativo</Label>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea name="notes" defaultValue={dialog.notes ?? ""} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialog(null)}>Cancelar</Button>
                <Button type="submit" disabled={saveDevice.isPending}>Salvar</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
