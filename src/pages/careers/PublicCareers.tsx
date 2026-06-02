import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  MapPin,
  CheckCircle2,
  Upload,
  ArrowLeft,
  Briefcase,
  ArrowRight,
} from "lucide-react";
import lecsorLogoBlack from "@/assets/lecsor-logo-black.png.asset.json";
import lecsorLogoGrey from "@/assets/lecsor-logo-grey.png.asset.json";

type Opening = {
  id: string;
  title: string;
  area: string | null;
  description: string | null;
  location: string | null;
  employment_type: string | null;
};

// Locked brand tokens for the public careers surface.
// Kept inline because this page is standalone and must not inherit the app theme.
const NAVY_900 = "#0f1b3d";
const NAVY_700 = "#1e3a5f";
const NAVY_400 = "#3b6fa0";
const PAPER = "#e8edf3";

const fontFamilyHead = { fontFamily: "'Space Grotesk', sans-serif" };
const fontFamilyBody = { fontFamily: "'DM Sans', sans-serif" };

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
  const [companyName, setCompanyName] = useState<string>("");
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [companyWebsite, setCompanyWebsite] = useState<string | null>(null);
  const [openings, setOpenings] = useState<Opening[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Opening | null>(null);
  const [spontaneous, setSpontaneous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [areaFilter, setAreaFilter] = useState<string>("all");

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
      try {
        const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-careers-info?slug=${encodeURIComponent(slug)}`;
        const res = await fetch(endpoint, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        const data = await res.json();
        if (!data?.enabled || !data?.company) {
          setLoading(false);
          return;
        }
        setCompanyId(data.company.id);
        setCompanyName(data.company.name || "");
        setCompanyWebsite(data.company.website_url || null);
        if (data.company.logo_url) {
          const logo = data.company.logo_url.startsWith("http")
            ? data.company.logo_url
            : supabase.storage.from("company-logos").getPublicUrl(data.company.logo_url).data.publicUrl;
          setCompanyLogo(logo);
        }
        const jobs: Opening[] = data.openings || [];
        setOpenings(jobs);
        if (preselected) {
          const j = jobs.find((o) => o.id === preselected);
          if (j) setSelected(j);
        }
      } catch (e) {
        console.error("careers info fetch failed", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, preselected]);

  const showForm = useMemo(() => !!selected || spontaneous, [selected, spontaneous]);

  const areas = useMemo(() => {
    const set = new Set<string>();
    openings.forEach((o) => o.area && set.add(o.area));
    return Array.from(set);
  }, [openings]);

  const visibleOpenings = useMemo(() => {
    if (areaFilter === "all") return openings;
    return openings.filter((o) => o.area === areaFilter);
  }, [openings, areaFilter]);

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

  // -------- Shell with fonts ----------
  const FontsLink = () => (
    <link
      href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
  );

  if (loading) {
    return (
      <div className="h-full overflow-y-auto flex items-center justify-center p-4" style={{ background: PAPER }}>
        <FontsLink />
        <Skeleton className="h-64 w-full max-w-2xl" />
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="h-full overflow-y-auto flex items-center justify-center p-4" style={{ background: PAPER }}>
        <FontsLink />
        <Card className="max-w-md text-center border-0 shadow-lg">
          <CardContent className="p-10">
            <h2 className="text-lg font-semibold mb-2" style={{ ...fontFamilyHead, color: NAVY_900 }}>
              Página indisponível
            </h2>
            <p className="text-sm" style={{ ...fontFamilyBody, color: `${NAVY_700}99` }}>
              Este link de carreiras não está ativo no momento.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="h-full overflow-y-auto flex items-center justify-center p-4" style={{ background: PAPER }}>
        <FontsLink />
        <Card className="max-w-md text-center border-0 shadow-lg">
          <CardContent className="p-10">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4" style={{ color: NAVY_400 }} />
            <h2 className="text-xl font-bold mb-2" style={{ ...fontFamilyHead, color: NAVY_900 }}>
              Candidatura enviada!
            </h2>
            <p className="text-sm" style={{ ...fontFamilyBody, color: `${NAVY_700}99` }}>
              Recebemos seu currículo. Nosso time de RH entrará em contato se houver fit com a oportunidade.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayName = companyName || "Nossa empresa";

  // -------- Form view ----------
  if (showForm) {
    return (
      <div className="h-full overflow-y-auto" style={{ background: PAPER, color: NAVY_900 }}>
        <FontsLink />

        {/* Nav */}
        <nav className="bg-white border-b" style={{ borderColor: `${NAVY_900}1A` }}>
          <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {companyLogo ? (
                <img src={companyLogo} alt={displayName} className="h-10 w-auto object-contain" />
              ) : (
                <div
                  className="w-10 h-10 flex items-center justify-center rounded-sm"
                  style={{ background: NAVY_900 }}
                >
                  <div className="w-5 h-5 rotate-45" style={{ border: `2px solid ${NAVY_400}` }} />
                </div>
              )}
              <span className="text-xl font-bold tracking-tight" style={{ ...fontFamilyHead, color: NAVY_900 }}>
                {displayName}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelected(null);
                setSpontaneous(false);
                setParams({});
              }}
              style={{ ...fontFamilyBody, color: NAVY_700 }}
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar para vagas
            </Button>
          </div>
        </nav>

        <main className="max-w-3xl mx-auto px-6 py-12">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle style={{ ...fontFamilyHead, color: NAVY_900 }}>
                {selected ? `Candidatar-se: ${selected.title}` : "Candidatura espontânea"}
              </CardTitle>
              {selected?.description && (
                <p className="text-sm whitespace-pre-wrap" style={{ ...fontFamilyBody, color: `${NAVY_700}B3` }}>
                  {selected.description}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4" style={fontFamilyBody}>
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
                  <p className="text-xs mt-1" style={{ color: `${NAVY_700}99` }}>Tamanho máximo: 5MB</p>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 font-bold text-sm tracking-widest uppercase transition-colors disabled:opacity-60"
                  style={{ ...fontFamilyHead, background: NAVY_900, color: "white" }}
                  onMouseEnter={(e) => ((e.currentTarget.style.background = NAVY_400))}
                  onMouseLeave={(e) => ((e.currentTarget.style.background = NAVY_900))}
                >
                  {submitting ? "Enviando..." : "Enviar candidatura"}
                </button>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // -------- Listing view ----------
  return (
    <div className="h-full overflow-y-auto" style={{ background: PAPER, color: NAVY_900 }}>
      <FontsLink />

      {/* Nav */}
      <nav className="bg-white border-b" style={{ borderColor: `${NAVY_900}1A` }}>
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {companyLogo ? (
              <img src={companyLogo} alt={displayName} className="h-10 w-auto object-contain" />
            ) : (
              <div
                className="w-10 h-10 flex items-center justify-center rounded-sm"
                style={{ background: NAVY_900 }}
              >
                <div className="w-5 h-5 rotate-45" style={{ border: `2px solid ${NAVY_400}` }} />
              </div>
            )}
            <span className="text-xl md:text-2xl font-bold tracking-tight" style={{ ...fontFamilyHead, color: NAVY_900 }}>
              {displayName}
            </span>
          </div>
          {companyWebsite && (
            <a
              href={companyWebsite}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium transition-colors hover:underline"
              style={{ ...fontFamilyBody, color: NAVY_700 }}
            >
              Voltar para o site
            </a>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-24" style={{ background: NAVY_900 }}>
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="careers-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke={NAVY_400} strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#careers-grid)" />
          </svg>
        </div>
        <div
          className="absolute bottom-0 right-0 w-1/3 h-full opacity-40 pointer-events-none"
          style={{ background: `linear-gradient(to left, ${NAVY_700}, transparent)` }}
        />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="max-w-2xl">
            <span
              className="inline-block text-white text-xs font-bold px-3 py-1 mb-6 tracking-widest uppercase"
              style={{ ...fontFamilyBody, background: NAVY_400 }}
            >
              Carreiras
            </span>
            <h1
              className="text-4xl md:text-6xl font-bold text-white leading-tight mb-6"
              style={fontFamilyHead}
            >
              Faça parte do <br />
              <span style={{ color: NAVY_400 }}>nosso time.</span>
            </h1>
            <p
              className="text-base md:text-lg leading-relaxed"
              style={{ ...fontFamilyBody, color: `${PAPER}CC` }}
            >
              Valorizamos pessoas comprometidas com excelência. Explore as oportunidades abaixo e venha construir junto com a {displayName}.
            </p>
          </div>
        </div>
      </section>

      {/* Jobs */}
      <main className="max-w-7xl mx-auto px-6 py-16 md:py-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <h2 className="text-3xl font-bold" style={{ ...fontFamilyHead, color: NAVY_900 }}>
              Vagas abertas
            </h2>
            <p className="mt-2" style={{ ...fontFamilyBody, color: `${NAVY_700}B3` }}>
              {openings.length === 0
                ? "Nenhuma vaga ativa no momento — envie sua candidatura espontânea abaixo."
                : "Explore as oportunidades disponíveis no momento."}
            </p>
          </div>
          {areas.length > 0 && (
            <div className="flex gap-2 flex-wrap" style={fontFamilyBody}>
              <button
                onClick={() => setAreaFilter("all")}
                className="px-4 py-2 rounded text-sm font-medium border transition-colors"
                style={{
                  background: areaFilter === "all" ? "white" : "transparent",
                  borderColor: areaFilter === "all" ? `${NAVY_900}1A` : `${NAVY_900}0D`,
                  color: areaFilter === "all" ? NAVY_900 : `${NAVY_900}99`,
                  boxShadow: areaFilter === "all" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                }}
              >
                Todas
              </button>
              {areas.map((a) => (
                <button
                  key={a}
                  onClick={() => setAreaFilter(a)}
                  className="px-4 py-2 rounded text-sm font-medium border transition-colors"
                  style={{
                    background: areaFilter === a ? "white" : "transparent",
                    borderColor: areaFilter === a ? `${NAVY_900}1A` : `${NAVY_900}0D`,
                    color: areaFilter === a ? NAVY_900 : `${NAVY_900}99`,
                    boxShadow: areaFilter === a ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                  }}
                >
                  {a}
                </button>
              ))}
            </div>
          )}
        </div>

        {visibleOpenings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleOpenings.map((o, idx) => {
              const topColor = idx % 2 === 0 ? NAVY_400 : NAVY_700;
              return (
                <div
                  key={o.id}
                  className="bg-white p-8 shadow-sm hover:shadow-xl transition-all group"
                  style={{ borderTop: `4px solid ${topColor}` }}
                >
                  <div className="flex justify-between items-start mb-6">
                    {o.area ? (
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-1"
                        style={{
                          ...fontFamilyBody,
                          color: topColor,
                          background: `${topColor}1A`,
                        }}
                      >
                        {o.area}
                      </span>
                    ) : (
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 inline-flex items-center gap-1"
                        style={{ ...fontFamilyBody, color: NAVY_700, background: `${NAVY_700}1A` }}
                      >
                        <Briefcase className="h-3 w-3" /> Vaga
                      </span>
                    )}
                    <span
                      className="text-xs font-medium uppercase"
                      style={{ ...fontFamilyBody, color: `${NAVY_700}66` }}
                    >
                      Cód: {o.id.slice(0, 4).toUpperCase()}
                    </span>
                  </div>
                  <h3
                    className="text-xl font-bold mb-4 transition-colors"
                    style={{ ...fontFamilyHead, color: NAVY_900 }}
                  >
                    {o.title}
                  </h3>
                  <div className="space-y-3 mb-8" style={fontFamilyBody}>
                    {o.location && (
                      <div className="flex items-center text-sm" style={{ color: `${NAVY_700}B3` }}>
                        <MapPin className="w-4 h-4 mr-2" />
                        {o.location}
                      </div>
                    )}
                    {o.employment_type && (
                      <div className="flex items-center text-sm" style={{ color: `${NAVY_700}B3` }}>
                        <Briefcase className="w-4 h-4 mr-2" />
                        {o.employment_type}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setSelected(o)}
                    className="w-full py-4 text-white font-bold text-sm tracking-widest uppercase transition-colors flex items-center justify-center gap-2"
                    style={{ ...fontFamilyHead, background: NAVY_900 }}
                    onMouseEnter={(e) => ((e.currentTarget.style.background = NAVY_400))}
                    onMouseLeave={(e) => ((e.currentTarget.style.background = NAVY_900))}
                  >
                    Candidatar-se
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : openings.length > 0 ? (
          <p className="text-sm" style={{ ...fontFamilyBody, color: `${NAVY_700}99` }}>
            Nenhuma vaga na área selecionada.
          </p>
        ) : null}

        {/* Spontaneous CTA */}
        <div
          className="mt-20 rounded-2xl overflow-hidden shadow-2xl relative"
          style={{ background: NAVY_900 }}
        >
          <div
            className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none"
            style={{ background: NAVY_400, filter: "blur(120px)", opacity: 0.2 }}
          />
          <div className="px-8 py-12 md:p-16 flex flex-col md:flex-row items-center justify-between relative z-10 gap-8">
            <div className="max-w-xl text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4" style={fontFamilyHead}>
                Não encontrou sua vaga?
              </h2>
              <p className="text-base md:text-lg" style={{ ...fontFamilyBody, color: `${PAPER}B3` }}>
                Estamos sempre em busca de profissionais excepcionais. Envie seu currículo para nosso banco de talentos e entraremos em contato assim que surgir uma oportunidade com seu perfil.
              </p>
            </div>
            <button
              onClick={() => setSpontaneous(true)}
              className="text-white px-8 md:px-10 py-4 md:py-5 font-bold text-sm tracking-widest uppercase transition-all shadow-lg whitespace-nowrap"
              style={{ ...fontFamilyHead, background: NAVY_400 }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = PAPER;
                e.currentTarget.style.color = NAVY_900;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = NAVY_400;
                e.currentTarget.style.color = "white";
              }}
            >
              Candidatura espontânea
            </button>
          </div>
        </div>
      </main>

      <footer className="py-10 border-t text-center" style={{ borderColor: `${NAVY_900}0D` }}>
        <p className="text-sm" style={{ ...fontFamilyBody, color: `${NAVY_700}66` }}>
          © {new Date().getFullYear()} {displayName}. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
};

export default PublicCareers;
