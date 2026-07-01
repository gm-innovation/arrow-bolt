import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQualityDocumentTypes } from "@/hooks/useQualityDocumentTypes";
import { useQualitySettings } from "@/hooks/useQualitySettings";
import { Plus, Trash2, Settings as SettingsIcon, FileText, Clock } from "lucide-react";

const blankForm = {
  code_prefix: "",
  name: "",
  description: "",
  default_classification: "",
  default_review_interval_months: "" as string | number,
  default_control_mode: "controlled" as "controlled" | "uncontrolled",
};

const QualitySettings = () => {
  const { types, create, update, remove, isLoading } = useQualityDocumentTypes();
  const { cycles, upsert: upsertSettings, requireActiveProcessDocument, enablePushNotifications } = useQualitySettings();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...blankForm });

  const [cyclesForm, setCyclesForm] = useState({
    org_context_months: 12,
    interested_parties_months: 12,
    critical_review_months: 12,
    document_review_months: 12,
    alert_window_days: 30,
  });

  useEffect(() => {
    if (cycles) setCyclesForm(cycles);
  }, [cycles]);

  const submit = async () => {
    if (!form.code_prefix || !form.name) return;
    await create.mutateAsync({
      code_prefix: form.code_prefix.toUpperCase(),
      name: form.name,
      description: form.description || null,
      default_classification: form.default_classification || null,
      default_review_interval_months: form.default_review_interval_months
        ? Number(form.default_review_interval_months)
        : null,
      default_control_mode: form.default_control_mode,
    });
    setForm({ ...blankForm });
    setOpen(false);
  };

  const saveCycles = () => {
    upsertSettings.mutate({ review_cycles: cyclesForm });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-6 w-6" /> Parâmetros do SGQ
        </h2>
        <p className="text-muted-foreground">
          Catálogo de tipos de documento, ciclos de revisão e ajustes do Sistema de Gestão da Qualidade.
        </p>
      </div>

      <Tabs defaultValue="types">
        <TabsList>
          <TabsTrigger value="types"><FileText className="h-4 w-4 mr-2" /> Tipos de Documento</TabsTrigger>
          <TabsTrigger value="cycles"><Clock className="h-4 w-4 mr-2" /> Ciclos de Revisão</TabsTrigger>
        </TabsList>

        <TabsContent value="types" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tipos de Documento</CardTitle>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" /> Novo Tipo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Novo tipo de documento</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Prefixo *</Label>
                        <Input
                          placeholder="PR, IT, MN, ESCOPO_SGQ..."
                          value={form.code_prefix}
                          onChange={(e) => setForm({ ...form, code_prefix: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Nome *</Label>
                        <Input
                          placeholder="Procedimento"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>Descrição</Label>
                      <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Classificação padrão</Label>
                        <Input
                          placeholder="Interno"
                          value={form.default_classification}
                          onChange={(e) => setForm({ ...form, default_classification: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Intervalo de revisão (meses)</Label>
                        <Input
                          type="number"
                          value={form.default_review_interval_months}
                          onChange={(e) =>
                            setForm({ ...form, default_review_interval_months: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>Cópia (padrão)</Label>
                      <select
                        className="w-full border rounded-md h-10 px-3 text-sm bg-background"
                        value={form.default_control_mode}
                        onChange={(e) =>
                          setForm({ ...form, default_control_mode: e.target.value as any })
                        }
                      >
                        <option value="controlled">Controlada</option>
                        <option value="uncontrolled">Não controlada</option>
                      </select>
                      <p className="text-xs text-muted-foreground">
                        Aplica-se a novos documentos deste tipo. Pode ser sobrescrito por documento.
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={submit} disabled={!form.code_prefix || !form.name}>
                      Criar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center py-6 text-muted-foreground">Carregando...</p>
              ) : types.length === 0 ? (
                <p className="text-center py-6 text-muted-foreground">
                  Nenhum tipo cadastrado. Comece criando "PR — Procedimento", "IT — Instrução de Trabalho",
                  "MN — Manual", "RQ — Registro", "ESCOPO_SGQ — Escopo do SGQ" etc.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Prefixo</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Classificação</TableHead>
                      <TableHead>Revisão (meses)</TableHead>
                      <TableHead>Cópia padrão</TableHead>
                      <TableHead className="text-center">Ativo</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {types.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono">{t.code_prefix}</TableCell>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell>{t.default_classification || "—"}</TableCell>
                        <TableCell>{t.default_review_interval_months ?? "—"}</TableCell>
                        <TableCell>
                          <select
                            className="border rounded-md h-8 px-2 text-xs bg-background"
                            value={t.default_control_mode ?? "controlled"}
                            onChange={(e) =>
                              update.mutate({
                                id: t.id,
                                default_control_mode: e.target.value as any,
                              })
                            }
                          >
                            <option value="controlled">Controlada</option>
                            <option value="uncontrolled">Não controlada</option>
                          </select>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={t.is_active}
                            onCheckedChange={(v) => update.mutate({ id: t.id, is_active: v })}
                          />
                        </TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" onClick={() => remove.mutate(t.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cycles" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Ciclos de Revisão</CardTitle>
              <p className="text-xs text-muted-foreground">
                Frequência padrão por entidade do SGQ e janela de alerta compartilhada com a expiração de documentos do GED.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Contexto da Organização (meses)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={cyclesForm.org_context_months}
                    onChange={(e) => setCyclesForm({ ...cyclesForm, org_context_months: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Partes Interessadas (meses)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={cyclesForm.interested_parties_months}
                    onChange={(e) =>
                      setCyclesForm({ ...cyclesForm, interested_parties_months: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Análise Crítica pela Direção (meses)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={cyclesForm.critical_review_months}
                    onChange={(e) =>
                      setCyclesForm({ ...cyclesForm, critical_review_months: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Revisão de Documentos do GED (meses)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={cyclesForm.document_review_months}
                    onChange={(e) =>
                      setCyclesForm({ ...cyclesForm, document_review_months: Number(e.target.value) || 0 })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Usado para calcular a "Próxima revisão" automaticamente ao publicar uma nova versão.
                  </p>
                </div>
                <div className="space-y-1">
                  <Label>Janela de alerta antes do vencimento (dias)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={cyclesForm.alert_window_days}
                    onChange={(e) =>
                      setCyclesForm({ ...cyclesForm, alert_window_days: Number(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={saveCycles}>Salvar ciclos</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Regras estruturais</CardTitle>
              <p className="text-xs text-muted-foreground">
                Regras de governança que protegem a coerência entre processo e documento controlado.
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between gap-4 border rounded p-3">
                <div>
                  <Label className="text-sm">Processo só fica ativo com documento válido</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Quando ativado, um processo só pode receber status <span className="font-mono">active</span> se{" "}
                    <code>current_document_id</code> apontar para um documento publicado/aprovado e dentro da
                    validade. Recomendado.
                  </p>
                </div>
                <Switch
                  checked={requireActiveProcessDocument}
                  onCheckedChange={(v) => upsertSettings.mutate({ require_active_process_document: v })}
                />
              </div>

              <div className="flex items-start justify-between gap-4 border rounded p-3 mt-3">
                <div>
                  <Label className="text-sm">Habilitar notificações push de alertas SGQ</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Quando ativado, alertas críticos (calibração vencendo, documentos para revisar,
                    eficácia de melhorias atrasada etc.) são enviados como notificação push para
                    os celulares. <strong>Pode gerar ruído.</strong> Recomendamos manter desligado
                    e usar o dashboard + notificações internas.
                  </p>
                </div>
                <Switch
                  checked={enablePushNotifications}
                  onCheckedChange={(v) => upsertSettings.mutate({ enable_push_notifications: v })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default QualitySettings;
