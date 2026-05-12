import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Briefcase, MapPin, CheckCircle2, Upload, ArrowLeft } from "lucide-react";

type Opening = {
  id: string;
  title: string;
  area: string | null;
  description: string | null;
  location: string | null;
  employment_type: string | null;
};

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] || "");
    r.onerror = reject;
    r.readAsDataURL(file);
  });

const PublicCareers = () => {
  const { slug } = useParams<{ slug: string }>();
  const [params, setParams] = useSearchParams();
  const preselected = params.get("vaga");

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [openings, setOpenings] = useState<Opening[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Opening | null>(null);
  const [spontaneous, setSpontaneous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // form
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    linkedin_url: "",
    area_of_interest: "",
    salary_expectation: "",
    availability: "",
    cover_letter: "",
    website: "", // honeypot
  });
  const [cv, setCv] = useState<File | null>(null);

  useEffect(() => {
    (async () => {
      if (!slug) return;
      const { data: company } = await (supabase as any)
        .from("companies")
        .select("id, logo_url, public_intake_enabled")
        .eq("public_site_slug", slug)
        .maybeSingle();

      if (!company || !company.public_intake_enabled) {
        setLoading(false);
        return;
      }
      setCompanyId(company.id);
      if (company.logo_url) {
        const url = company.logo_url.startsWith("http")
          ? company.logo_url
          : supabase.storage.from("corp-documents").getPublicUrl(company.logo_url).data.publicUrl;
        setCompanyLogo(url);
      }

      const { data: jobs } = await (supabase as any)
        .from("job_openings")
        .select("id, title, area, description, location, employment_type")
        .eq("company_id", company.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      setOpenings(jobs || []);

      if (preselected && jobs) {
        const j = jobs.find((o: Opening) => o.id === preselected);
        if (j) setSelected(j);
      }
      setLoading(false);
    })();
  }, [slug, preselected]);

  const showForm = useMemo(() => !!selected || spontaneous, [selected, spontaneous]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cv) {
      toast({ title: "Anexe seu currículo (PDF, DOC ou DOCX)", variant: "destructive" });
      return;
    }
    if (cv.size > 5 * 1024 * 1024) {
      toast({ title: "Currículo acima de 5MB", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const cv_base64 = await fileToBase64(cv);
      const payload: any = {
        company_slug: slug,
        job_opening_id: selected?.id ?? null,
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone || null,
        city: form.city || null,
        state: form.state || null,
        linkedin_url: form.linkedin_url || null,
        area_of_interest: form.area_of_interest || selected?.area || null,
        salary_expectation: form.salary_expectation
          ? Number(form.salary_expectation.replace(/\D/g, "")) || null
          : null,
        availability: form.availability || null,
        cover_letter: form.cover_letter || null,
        cv_base64,
        cv_file_name: cv.name,
        cv_mime_type: cv.type || "application/pdf",
        website: form.website,
      };

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-job-application`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || "Falha no envio");
      setDone(true);
    } catch (err: any) {
      toast({ title: "Não foi possível enviar", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full overflow-y-auto bg-background flex items-center justify-center p-4">
        <Skeleton className="h-64 w-full max-w-2xl" />
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="h-full overflow-y-auto bg-background flex items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <CardContent className="p-8">
            <h2 className="text-lg font-semibold mb-2">Página indisponível</h2>
            <p className="text-sm text-muted-foreground">
              Este link de carreiras não está ativo no momento.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="h-full overflow-y-auto bg-background flex items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <CardContent className="p-8">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Candidatura enviada!</h2>
            <p className="text-sm text-muted-foreground">
              Recebemos seu currículo. Nosso time de RH entrará em contato se houver fit com a oportunidade.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-background">
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center gap-4">
          {companyLogo && (
            <img src={companyLogo} alt="Logo" className="h-12 w-auto object-contain" />
          )}
          <div>
            <h1 className="text-xl font-semibold">Faça parte do nosso time</h1>
            <p className="text-sm text-muted-foreground">
              Valorizamos pessoas comprometidas com excelência. Vem com a gente.
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {!showForm && (
          <>
            {openings.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-3">Vagas abertas</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {openings.map((o) => (
                    <Card
                      key={o.id}
                      className="cursor-pointer hover:border-primary transition"
                      onClick={() => setSelected(o)}
                    >
                      <CardHeader>
                        <CardTitle className="text-base flex items-start gap-2">
                          <Briefcase className="h-4 w-4 mt-1 shrink-0" />
                          <span>{o.title}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm text-muted-foreground">
                        {o.area && <Badge variant="secondary">{o.area}</Badge>}
                        {o.location && (
                          <p className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {o.location}
                          </p>
                        )}
                        {o.employment_type && <p>{o.employment_type}</p>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            <Card>
              <CardContent className="p-6 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="font-medium">Não encontrou a vaga ideal?</h3>
                  <p className="text-sm text-muted-foreground">
                    Envie sua candidatura espontânea — vamos guardar para futuras oportunidades.
                  </p>
                </div>
                <Button onClick={() => setSpontaneous(true)}>Candidatura espontânea</Button>
              </CardContent>
            </Card>
          </>
        )}

        {showForm && (
          <Card>
            <CardHeader>
              <Button
                variant="ghost"
                size="sm"
                className="w-fit -ml-2"
                onClick={() => {
                  setSelected(null);
                  setSpontaneous(false);
                  setParams({});
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <CardTitle>{selected ? `Candidatar-se: ${selected.title}` : "Candidatura espontânea"}</CardTitle>
              {selected?.description && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selected.description}</p>
              )}
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* honeypot */}
                <input
                  type="text"
                  name="website"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  className="hidden"
                  tabIndex={-1}
                  autoComplete="off"
                />

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nome completo *</Label>
                    <Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                  </div>
                  <div>
                    <Label>E-mail *</Label>
                    <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div>
                    <Label>LinkedIn</Label>
                    <Input placeholder="https://" value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} />
                  </div>
                  <div>
                    <Label>Cidade</Label>
                    <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  </div>
                  <div>
                    <Label>UF</Label>
                    <Input maxLength={2} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} />
                  </div>
                  {!selected && (
                    <div className="md:col-span-2">
                      <Label>Área de interesse</Label>
                      <Input value={form.area_of_interest} onChange={(e) => setForm({ ...form, area_of_interest: e.target.value })} />
                    </div>
                  )}
                  <div>
                    <Label>Pretensão salarial (R$)</Label>
                    <Input value={form.salary_expectation} onChange={(e) => setForm({ ...form, salary_expectation: e.target.value })} />
                  </div>
                  <div>
                    <Label>Disponibilidade</Label>
                    <Select value={form.availability} onValueChange={(v) => setForm({ ...form, availability: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="imediata">Imediata</SelectItem>
                        <SelectItem value="15_dias">Em até 15 dias</SelectItem>
                        <SelectItem value="30_dias">Em até 30 dias</SelectItem>
                        <SelectItem value="a_combinar">A combinar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Carta de apresentação</Label>
                  <Textarea
                    rows={4}
                    placeholder="Conte um pouco sobre você e por que quer essa oportunidade..."
                    value={form.cover_letter}
                    onChange={(e) => setForm({ ...form, cover_letter: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Currículo (PDF, DOC, DOCX) *</Label>
                  <div className="relative">
                    <Button type="button" variant="outline" className="w-full justify-start">
                      <Upload className="h-4 w-4 mr-2" />
                      {cv ? cv.name : "Selecionar arquivo"}
                    </Button>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="opacity-0 absolute inset-0 cursor-pointer"
                      onChange={(e) => setCv(e.target.files?.[0] || null)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Tamanho máximo: 5MB</p>
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Enviando..." : "Enviar candidatura"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default PublicCareers;
