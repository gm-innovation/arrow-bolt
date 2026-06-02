import { useEffect, useMemo, useState } from "react";
import { useJobApplications, useJobOpenings, downloadCv, useApplicationTags } from "@/hooks/useRecruitment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { Briefcase, Download, Plus, Search, Trash2, Pencil, Link2, ExternalLink, StickyNote, Tag as TagIcon, Upload, Image as ImageIcon } from "lucide-react";
import JobOpeningDialog from "@/components/hr/JobOpeningDialog";
import ApplicationDetailSheet from "@/components/hr/ApplicationDetailSheet";
import HROnboarding from "@/pages/hr/Onboarding";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
  const [tagFilter, setTagFilter] = useState("all");
  const [notesOnly, setNotesOnly] = useState(false);
  const [openingDialog, setOpeningDialog] = useState<any | null>(null);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const { tags } = useApplicationTags();

  const { profile } = useAuth();
  const { data: companyInfo, refetch: refetchCompany } = useQuery({
    queryKey: ["company-public-slug", profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("public_site_slug, public_intake_enabled, public_site_base_url, logo_url, name")
        .eq("id", profile!.company_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });
  const slug = companyInfo?.public_site_slug || "";
  const intakeEnabled = companyInfo?.public_intake_enabled ?? false;
  const configuredBase = (companyInfo as any)?.public_site_base_url as string | null | undefined;

  const normalizeBase = (raw?: string | null) => {
    if (!raw) return "";
    let v = raw.trim();
    if (!v) return "";
    if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
    return v.replace(/\/+$/, "");
  };

  const careerLinkBase = `${normalizeBase(configuredBase) || window.location.origin}/carreiras/`;
  const careerUrl = slug ? `${careerLinkBase}${slug}` : "";
  const canUseLink = !!slug && intakeEnabled;

  const [baseUrlDraft, setBaseUrlDraft] = useState<string>("");
  const [savingBase, setSavingBase] = useState(false);
  // sync draft once companyInfo loads
  useEffect(() => {
    if (configuredBase !== undefined) setBaseUrlDraft(configuredBase || "");
  }, [configuredBase]);

  const saveBaseUrl = async () => {
    setSavingBase(true);
    const normalized = normalizeBase(baseUrlDraft) || null;
    const { error } = await supabase
      .from("companies")
      .update({ public_site_base_url: normalized } as any)
      .eq("id", profile!.company_id);
    setSavingBase(false);
    if (error) {
      toast({ title: "Não foi possível salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Domínio público atualizado" });
    refetchCompany();
  };

  // ---- Company logo upload ----
  const currentLogo = (companyInfo as any)?.logo_url as string | null | undefined;
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleLogoUpload = async (file: File | null) => {
    if (!file || !profile?.company_id) return;
    if (!/^image\/(png|jpe?g|webp|svg\+xml)$/.test(file.type)) {
      toast({ title: "Formato inválido", description: "Use PNG, JPG, WEBP ou SVG.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Imagem acima de 2MB", variant: "destructive" });
      return;
    }
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${profile.company_id}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("company-logos")
        .upload(path, file, { upsert: true, cacheControl: "0" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("company-logos").getPublicUrl(path);
      const { error: updErr } = await supabase
        .from("companies")
        .update({ logo_url: pub.publicUrl })
        .eq("id", profile.company_id);
      if (updErr) throw updErr;
      toast({ title: "Logo atualizada" });
      refetchCompany();
    } catch (err: any) {
      toast({ title: "Falha no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploadingLogo(false);
    }
  };


  const filtered = useMemo(() => {
    return applications.filter((a: any) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (openingFilter === "spontaneous" && a.job_opening_id) return false;
      if (openingFilter !== "all" && openingFilter !== "spontaneous" && a.job_opening_id !== openingFilter) return false;
      if (tagFilter !== "all") {
        const tagIds = (a.tag_assignments || []).map((ta: any) => ta.tag?.id).filter(Boolean);
        if (tagFilter === "none" ? tagIds.length > 0 : !tagIds.includes(tagFilter)) return false;
      }
      if (notesOnly) {
        const cnt = a.notes_count?.[0]?.count ?? 0;
        if (cnt === 0) return false;
      }
      if (search) {
        const s = search.toLowerCase();
        const tagNames = (a.tag_assignments || []).map((ta: any) => ta.tag?.name?.toLowerCase() || "").join(" ");
        if (!a.full_name?.toLowerCase().includes(s) && !a.email?.toLowerCase().includes(s) && !tagNames.includes(s)) return false;
      }
      return true;
    });
  }, [applications, statusFilter, openingFilter, tagFilter, notesOnly, search]);

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
          <TabsTrigger value="admissions">Admissões</TabsTrigger>
          <TabsTrigger value="link">Link público</TabsTrigger>
          <TabsTrigger value="page">Página de carreiras</TabsTrigger>
        </TabsList>

        <TabsContent value="candidates" className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar nome, e-mail ou marcação"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={openingFilter} onValueChange={setOpeningFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as vagas</SelectItem>
                <SelectItem value="spontaneous">Espontâneas</SelectItem>
                {openings.map((o: any) => (
                  <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Marcações" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as marcações</SelectItem>
                <SelectItem value="none">Sem marcação</SelectItem>
                {tags.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                      {t.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={notesOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setNotesOnly((v) => !v)}
              className="gap-1"
            >
              <StickyNote className="h-4 w-4" /> Com notas
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidato</TableHead>
                    <TableHead>Vaga</TableHead>
                    <TableHead>Marcações</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Recebido</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">Carregando...</TableCell></TableRow>
                  )}
                  {!isLoading && filtered.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">Nenhum candidato</TableCell></TableRow>
                  )}
                  {filtered.map((a: any) => {
                    const appTags = (a.tag_assignments || []).map((ta: any) => ta.tag).filter(Boolean);
                    const notesCount = a.notes_count?.[0]?.count ?? 0;
                    return (
                      <TableRow key={a.id} className="cursor-pointer" onClick={() => setSelectedApp(a)}>
                        <TableCell>
                          <div className="font-medium flex items-center gap-2">
                            {a.full_name}
                            {notesCount > 0 && (
                              <Badge variant="secondary" className="gap-1 h-5 px-1.5 text-xs">
                                <StickyNote className="h-3 w-3" />
                                {notesCount}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">{a.email}</div>
                        </TableCell>
                        <TableCell>
                          {a.job_opening?.title || <span className="text-muted-foreground italic">Espontânea</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {appTags.slice(0, 3).map((t: any) => (
                              <Badge
                                key={t.id}
                                variant="outline"
                                className="text-xs"
                                style={{ backgroundColor: `${t.color}20`, borderColor: t.color, color: t.color }}
                              >
                                {t.name}
                              </Badge>
                            ))}
                            {appTags.length > 3 && (
                              <Badge variant="outline" className="text-xs">+{appTags.length - 3}</Badge>
                            )}
                            {appTags.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                          </div>
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
                    );
                  })}
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

        <TabsContent value="admissions">
          <HROnboarding />
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
                Aponte o CTA "Saiba mais" do site para a URL abaixo:
              </p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={careerUrl || "—"}
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  disabled={!canUseLink}
                  onClick={() => {
                    navigator.clipboard.writeText(careerUrl);
                    toast({ title: "Link copiado" });
                  }}
                >
                  Copiar
                </Button>
                <Button
                  variant="outline"
                  disabled={!canUseLink}
                  onClick={() => window.open(careerUrl, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-1" /> Abrir
                </Button>
              </div>
              {!slug && (
                <p className="text-xs text-destructive">
                  Empresa ainda sem slug público configurado. Solicite ao Super Admin.
                </p>
              )}
              {slug && !intakeEnabled && (
                <p className="text-xs text-destructive">
                  Recebimento público de candidaturas está desativado. Solicite ao Super Admin para habilitar.
                </p>
              )}

              <div className="pt-3 border-t space-y-2">
                <p className="text-xs font-medium">Domínio público do site</p>
                <p className="text-xs text-muted-foreground">
                  URL base usada para montar o link das candidaturas. Ex.: <code className="bg-muted px-1 rounded">https://arrow.googlemarineinnovation.com.br</code>
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://seudominio.com.br"
                    value={baseUrlDraft}
                    onChange={(e) => setBaseUrlDraft(e.target.value)}
                    className="font-mono text-xs"
                  />
                  <Button variant="outline" disabled={savingBase} onClick={saveBaseUrl}>
                    {savingBase ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
                {!configuredBase && (
                  <p className="text-xs text-amber-600">
                    Sem domínio configurado: o link está usando <code className="bg-muted px-1 rounded">{window.location.origin}</code>.
                  </p>
                )}
              </div>

              <div className="pt-3 border-t space-y-2">
                <p className="text-xs font-medium flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5" /> Logo da empresa
                </p>
                <p className="text-xs text-muted-foreground">
                  Exibida no topo da página pública de carreiras. PNG, JPG, WEBP ou SVG, até 2MB.
                </p>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {currentLogo ? (
                      <img src={currentLogo} alt="Logo" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="relative flex-1">
                    <Button type="button" variant="outline" disabled={uploadingLogo} className="w-full justify-start">
                      <Upload className="h-4 w-4 mr-2" />
                      {uploadingLogo ? "Enviando..." : currentLogo ? "Substituir logo" : "Enviar logo"}
                    </Button>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="opacity-0 absolute inset-0 cursor-pointer"
                      disabled={uploadingLogo}
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        handleLogoUpload(f);
                        e.target.value = "";
                      }}
                    />
                  </div>
                </div>
                {!currentLogo && (
                  <p className="text-xs text-amber-600">
                    Sem logo configurada: a página de carreiras está usando um placeholder.
                  </p>
                )}
              </div>


              <p className="text-xs text-muted-foreground">
                Alternativamente, o site pode integrar diretamente via API enviando POST para
                <code className="ml-1 text-xs bg-muted px-1 rounded">/functions/v1/public-job-application</code>.
              </p>

            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="page" className="space-y-4">
          <CareersPageEditor />
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
