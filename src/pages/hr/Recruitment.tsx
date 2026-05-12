import { useMemo, useState } from "react";
import { useJobApplications, useJobOpenings, downloadCv } from "@/hooks/useRecruitment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { Briefcase, Download, Plus, Search, Trash2, Pencil, Link2 } from "lucide-react";
import JobOpeningDialog from "@/components/hr/JobOpeningDialog";
import ApplicationDetailSheet from "@/components/hr/ApplicationDetailSheet";
import { toast } from "@/hooks/use-toast";

const STATUS_LABEL: Record<string, string> = {
  new: "Novo",
  screening: "Em análise",
  interview: "Entrevista",
  approved: "Aprovado",
  rejected: "Reprovado",
  hired: "Contratado",
};
const STATUS_VARIANT: Record<string, any> = {
  new: "default",
  screening: "secondary",
  interview: "secondary",
  approved: "default",
  rejected: "destructive",
  hired: "default",
};

const HRRecruitment = () => {
  const { applications, isLoading, updateApplication, deleteApplication } = useJobApplications();
  const { openings, upsertOpening, deleteOpening } = useJobOpenings();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openingFilter, setOpeningFilter] = useState("all");
  const [openingDialog, setOpeningDialog] = useState<any | null>(null);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);

  const careerLinkBase = `${window.location.origin}/carreiras/`;

  const filtered = useMemo(() => {
    return applications.filter((a: any) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (openingFilter === "spontaneous" && a.job_opening_id) return false;
      if (openingFilter !== "all" && openingFilter !== "spontaneous" && a.job_opening_id !== openingFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!a.full_name?.toLowerCase().includes(s) && !a.email?.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [applications, statusFilter, openingFilter, search]);

  const countByStatus = useMemo(() => {
    const acc: Record<string, number> = {};
    applications.forEach((a: any) => (acc[a.status] = (acc[a.status] || 0) + 1));
    return acc;
  }, [applications]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Recrutamento</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie vagas e candidatos recebidos pelo site.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {(["new", "screening", "interview", "approved"] as const).map((s) => (
          <Card key={s}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{STATUS_LABEL[s]}</p>
              <p className="text-2xl font-semibold">{countByStatus[s] || 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="candidates">
        <TabsList>
          <TabsTrigger value="candidates">Candidatos</TabsTrigger>
          <TabsTrigger value="openings">Vagas</TabsTrigger>
          <TabsTrigger value="link">Link público</TabsTrigger>
        </TabsList>

        <TabsContent value="candidates" className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar nome ou e-mail"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={openingFilter} onValueChange={setOpeningFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as vagas</SelectItem>
                <SelectItem value="">Espontâneas</SelectItem>
                {openings.map((o: any) => (
                  <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidato</TableHead>
                    <TableHead>Vaga</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Recebido</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">Carregando...</TableCell></TableRow>
                  )}
                  {!isLoading && filtered.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">Nenhum candidato</TableCell></TableRow>
                  )}
                  {filtered.map((a: any) => (
                    <TableRow key={a.id} className="cursor-pointer" onClick={() => setSelectedApp(a)}>
                      <TableCell>
                        <div className="font-medium">{a.full_name}</div>
                        <div className="text-xs text-muted-foreground">{a.email}</div>
                      </TableCell>
                      <TableCell>
                        {a.job_opening?.title || <span className="text-muted-foreground italic">Espontânea</span>}
                      </TableCell>
                      <TableCell>{[a.city, a.state].filter(Boolean).join("/") || "—"}</TableCell>
                      <TableCell>{format(new Date(a.created_at), "dd/MM/yyyy")}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[a.status] || "default"}>{STATUS_LABEL[a.status] || a.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {a.cv_file_url && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); downloadCv(a.cv_file_url, a.cv_file_name || "cv.pdf"); }}
                          >
                            <Download className="h-4 w-4" />
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

        <TabsContent value="openings" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setOpeningDialog({})}>
              <Plus className="h-4 w-4 mr-1" /> Nova vaga
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Candidatos</TableHead>
                    <TableHead>Ativa</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {openings.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">Nenhuma vaga cadastrada</TableCell></TableRow>
                  )}
                  {openings.map((o: any) => {
                    const count = applications.filter((a: any) => a.job_opening_id === o.id).length;
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="font-medium">{o.title}</TableCell>
                        <TableCell>{o.area || "—"}</TableCell>
                        <TableCell>{o.location || "—"}</TableCell>
                        <TableCell>{o.employment_type || "—"}</TableCell>
                        <TableCell>{count}</TableCell>
                        <TableCell>
                          <Switch
                            checked={o.is_active}
                            onCheckedChange={(v) => upsertOpening.mutate({ id: o.id, is_active: v })}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => setOpeningDialog(o)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                if (confirm(`Excluir a vaga "${o.title}"?`)) deleteOpening.mutate(o.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="link" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Link2 className="h-4 w-4" /> Link público para o site
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Aponte o CTA "Saiba mais" do site para a URL abaixo (substitua <code className="text-xs bg-muted px-1 rounded">SLUG</code> pelo slug público da empresa):
              </p>
              <div className="flex gap-2">
                <Input readOnly value={`${careerLinkBase}SLUG`} className="font-mono text-xs" />
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(`${careerLinkBase}SLUG`);
                    toast({ title: "Link copiado" });
                  }}
                >
                  Copiar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Alternativamente, o site pode integrar diretamente via API enviando POST para
                <code className="ml-1 text-xs bg-muted px-1 rounded">/functions/v1/public-job-application</code>.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {openingDialog !== null && (
        <JobOpeningDialog
          opening={openingDialog}
          onClose={() => setOpeningDialog(null)}
          onSave={(data) => {
            upsertOpening.mutate(data, { onSuccess: () => setOpeningDialog(null) });
          }}
        />
      )}

      {selectedApp && (
        <ApplicationDetailSheet
          application={selectedApp}
          open={!!selectedApp}
          onClose={() => setSelectedApp(null)}
          onUpdate={(patch) => updateApplication.mutate({ id: selectedApp.id, ...patch })}
          onDelete={() => {
            if (confirm("Excluir esta candidatura?")) {
              deleteApplication.mutate(selectedApp.id);
              setSelectedApp(null);
            }
          }}
        />
      )}
    </div>
  );
};

export default HRRecruitment;
