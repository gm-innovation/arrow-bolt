import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Lock, Plus, Trash2, CheckCircle2, Link2 } from "lucide-react";
import { useManagementReview, OUTPUT_LABELS } from "@/hooks/useManagementReview";
import { useUsers } from "@/hooks/useUsers";
import { useAuth } from "@/contexts/AuthContext";
import { format, parseISO } from "date-fns";
import ManagementReviewInputsPanel from "@/components/quality/ManagementReviewInputsPanel";
import ManagementReviewOutputDialog from "@/components/quality/ManagementReviewOutputDialog";
import ManagementReviewCloseDialog from "@/components/quality/ManagementReviewCloseDialog";
import ManagementReviewMinutesGenerator from "@/components/quality/ManagementReviewMinutesGenerator";

const ManagementReviewDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { users } = useUsers();
  const {
    review, outputs, participants,
    updateStatus, updateSummary,
    updateOutput, removeOutput,
    addParticipant, updateParticipant, removeParticipant,
  } = useManagementReview(id);
  const [summary, setSummary] = useState("");
  const [savingSummary, setSavingSummary] = useState(false);
  const [outputDialogOpen, setOutputDialogOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [newPart, setNewPart] = useState<{ user_id: string; role_in_meeting: "chair" | "member" | "guest" }>({
    user_id: "", role_in_meeting: "member",
  });

  if (!review || !id) {
    return <div className="p-6 text-muted-foreground">Carregando reunião...</div>;
  }

  const closed = review.status === "closed";
  const readOnly = closed;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/quality/management-review">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold">
              Análise Crítica — {format(parseISO(review.review_date), "dd/MM/yyyy")}
            </h2>
            <p className="text-sm text-muted-foreground">
              Período: {format(parseISO(review.period_start), "dd/MM/yyyy")} → {format(parseISO(review.period_end), "dd/MM/yyyy")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={closed ? "default" : review.status === "in_progress" ? "secondary" : "outline"}>
            {closed ? "Fechada" : review.status === "in_progress" ? "Em andamento" : "Rascunho"}
          </Badge>
          {review.status === "draft" && (
            <Button size="sm" variant="outline" onClick={() => updateStatus.mutate("in_progress")}>
              Iniciar
            </Button>
          )}
          {review.status === "in_progress" && (
            <Button size="sm" onClick={() => setCloseOpen(true)}>
              <Lock className="h-4 w-4 mr-2" /> Fechar reunião
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="participants">Participantes</TabsTrigger>
          <TabsTrigger value="inputs">Entradas</TabsTrigger>
          <TabsTrigger value="outputs">Saídas</TabsTrigger>
          <TabsTrigger value="minutes">Ata</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Resumo executivo</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                rows={6}
                placeholder="Resumo executivo da reunião (rascunho — torna-se imutável após o fechamento)..."
                defaultValue={review.summary ?? ""}
                onChange={(e) => setSummary(e.target.value)}
                disabled={readOnly}
              />
              {!readOnly && (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={savingSummary}
                    onClick={async () => {
                      setSavingSummary(true);
                      try { await updateSummary.mutateAsync(summary || review.summary || ""); } finally { setSavingSummary(false); }
                    }}
                  >
                    Salvar resumo
                  </Button>
                </div>
              )}
              <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                <p>Presidente: {review.chair?.full_name ?? "—"}</p>
                {closed && (
                  <>
                    <p>Fechada em: {review.closed_at ? format(parseISO(review.closed_at), "dd/MM/yyyy HH:mm") : "—"}</p>
                    <p>Próxima reunião prevista: {review.next_due_date ? format(parseISO(review.next_due_date), "dd/MM/yyyy") : "—"}</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="participants" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Participantes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {!readOnly && (
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Select value={newPart.user_id} onValueChange={(v) => setNewPart({ ...newPart, user_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecionar usuário" /></SelectTrigger>
                      <SelectContent>
                        {users.filter((u: any) => !participants.some((p) => p.user_id === u.id)).map((u: any) => (
                          <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Select value={newPart.role_in_meeting} onValueChange={(v: any) => setNewPart({ ...newPart, role_in_meeting: v })}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chair">Presidente</SelectItem>
                      <SelectItem value="member">Membro</SelectItem>
                      <SelectItem value="guest">Convidado</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={async () => {
                      if (!newPart.user_id) return;
                      await addParticipant.mutateAsync(newPart);
                      setNewPart({ user_id: "", role_in_meeting: "member" });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Adicionar
                  </Button>
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Presente</TableHead>
                    <TableHead>Confirmou</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participants.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.profile?.full_name}</TableCell>
                      <TableCell className="text-xs capitalize">{p.role_in_meeting}</TableCell>
                      <TableCell>
                        <Checkbox
                          checked={p.attended}
                          disabled={readOnly}
                          onCheckedChange={(v) => updateParticipant.mutate({ id: p.id, attended: !!v })}
                        />
                      </TableCell>
                      <TableCell>
                        {p.confirmed_at ? (
                          <Badge variant="secondary" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" /> {format(parseISO(p.confirmed_at), "dd/MM HH:mm")}
                          </Badge>
                        ) : p.user_id === user?.id && !readOnly ? (
                          <Button size="sm" variant="outline" onClick={() => updateParticipant.mutate({ id: p.id, confirmed_at: new Date().toISOString() })}>
                            Confirmar
                          </Button>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        {!readOnly && (
                          <Button size="icon" variant="ghost" onClick={() => removeParticipant.mutate(p.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inputs">
          <ManagementReviewInputsPanel reviewId={id} readOnly={readOnly} />
        </TabsContent>

        <TabsContent value="outputs" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Saídas</CardTitle>
              {!readOnly && (
                <Button size="sm" onClick={() => setOutputDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Nova saída
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {outputs.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">Nenhuma saída registrada.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Prazo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outputs.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="text-xs">{OUTPUT_LABELS[o.output_type]}</TableCell>
                        <TableCell className="max-w-xs">{o.description}</TableCell>
                        <TableCell>{o.responsible?.full_name ?? "—"}</TableCell>
                        <TableCell>{o.due_date ? format(parseISO(o.due_date), "dd/MM/yyyy") : "—"}</TableCell>
                        <TableCell>
                          <Select
                            value={o.status}
                            onValueChange={(v: any) => updateOutput.mutate({ id: o.id, status: v })}
                          >
                            <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Aberta</SelectItem>
                              <SelectItem value="in_progress">Em andamento</SelectItem>
                              <SelectItem value="done">Concluída</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {o.linked_action_plan_id ? (
                            <Link to="/quality/action-plans">
                              <Badge variant="secondary" className="gap-1 cursor-pointer">
                                <Link2 className="h-3 w-3" /> Vinculado
                              </Badge>
                            </Link>
                          ) : (
                            <Badge variant="outline" className="text-xs">— gera no fechamento</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!readOnly && !o.linked_action_plan_id && (
                            <Button size="icon" variant="ghost" onClick={() => removeOutput.mutate(o.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="minutes">
          {closed ? (
            <ManagementReviewMinutesGenerator reviewId={id} />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                A ata fica disponível após o fechamento da reunião.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <ManagementReviewOutputDialog reviewId={id} open={outputDialogOpen} onOpenChange={setOutputDialogOpen} />
      <ManagementReviewCloseDialog reviewId={id} open={closeOpen} onOpenChange={setCloseOpen} />
    </div>
  );
};

export default ManagementReviewDetail;
