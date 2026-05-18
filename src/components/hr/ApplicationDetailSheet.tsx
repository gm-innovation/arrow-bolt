import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useApplicationNotes, downloadCv, extractCvData, saveExtractedCv, getCvSignedUrl } from "@/hooks/useRecruitment";
import { Download, ExternalLink, Mail, Phone, MapPin, Briefcase, Trash2, UserPlus, Sparkles, Loader2, GraduationCap, Building2 } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import TagPicker from "./TagPicker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const STATUS_OPTIONS = [
  { value: "new", label: "Novo" },
  { value: "screening", label: "Em análise" },
  { value: "interview", label: "Entrevista" },
  { value: "approved", label: "Aprovado" },
  { value: "rejected", label: "Reprovado" },
  { value: "hired", label: "Contratado" },
];

interface Props {
  application: any;
  open: boolean;
  onClose: () => void;
  onUpdate: (patch: any) => void;
  onDelete: () => void;
}

const fetchAsBase64 = async (signedUrl: string): Promise<{ base64: string; isPdf: boolean }> => {
  const res = await fetch(signedUrl);
  const blob = await res.blob();
  const isPdf = blob.type === "application/pdf" || signedUrl.toLowerCase().includes(".pdf");
  if (isPdf) {
    const buf = await blob.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d")!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: context, viewport, canvas }).promise;
    return { base64: canvas.toDataURL("image/png").split(",")[1], isPdf: true };
  }
  const reader = new FileReader();
  const base64 = await new Promise<string>((resolve, reject) => {
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  return { base64, isPdf: false };
};

const ApplicationDetailSheet = ({ application: a, open, onClose, onUpdate, onDelete }: Props) => {
  const { notes, addNote } = useApplicationNotes(a.id);
  const [newNote, setNewNote] = useState("");
  const [extracting, setExtracting] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const assignedTags = (a.tag_assignments || [])
    .map((ta: any) => ta.tag)
    .filter(Boolean);

  const extracted = a.cv_extracted_data;

  const handleExtract = async () => {
    if (!a.cv_file_url) return;
    setExtracting(true);
    try {
      const signedUrl = await getCvSignedUrl(a.cv_file_url);
      const { base64 } = await fetchAsBase64(signedUrl);
      const data = await extractCvData(base64, a.cv_file_name || "cv");
      await saveExtractedCv(a.id, data);
      toast({ title: "Currículo analisado", description: "Dados extraídos com sucesso." });
      qc.invalidateQueries({ queryKey: ["job-applications"] });
    } catch (e: any) {
      toast({ title: "Erro na extração", description: e.message, variant: "destructive" });
    } finally {
      setExtracting(false);
    }
  };

  const convertToOnboarding = () => {
    navigate(
      `/hr/onboarding?from_application=${a.id}&name=${encodeURIComponent(a.full_name)}&email=${encodeURIComponent(a.email)}`
    );
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{a.full_name}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline"><Mail className="h-3 w-3 mr-1" />{a.email}</Badge>
            {a.phone && <Badge variant="outline"><Phone className="h-3 w-3 mr-1" />{a.phone}</Badge>}
            {(a.city || a.state) && (
              <Badge variant="outline"><MapPin className="h-3 w-3 mr-1" />{[a.city, a.state].filter(Boolean).join("/")}</Badge>
            )}
            {a.job_opening && (
              <Badge variant="secondary"><Briefcase className="h-3 w-3 mr-1" />{a.job_opening.title}</Badge>
            )}
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Marcações</p>
            <TagPicker applicationId={a.id} assignedTags={assignedTags} />
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Select value={a.status} onValueChange={(v) => onUpdate({ status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Recebido em</p>
              <p className="font-medium">{format(new Date(a.created_at), "dd/MM/yyyy HH:mm")}</p>
            </div>
            {a.area_of_interest && (
              <div>
                <p className="text-xs text-muted-foreground">Área de interesse</p>
                <p className="font-medium">{a.area_of_interest}</p>
              </div>
            )}
            {a.salary_expectation && (
              <div>
                <p className="text-xs text-muted-foreground">Pretensão</p>
                <p className="font-medium">R$ {Number(a.salary_expectation).toLocaleString("pt-BR")}</p>
              </div>
            )}
            {a.availability && (
              <div>
                <p className="text-xs text-muted-foreground">Disponibilidade</p>
                <p className="font-medium">{a.availability}</p>
              </div>
            )}
            {a.linkedin_url && (
              <div>
                <p className="text-xs text-muted-foreground">LinkedIn</p>
                <a href={a.linkedin_url} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  Abrir <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>

          {a.cover_letter && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Carta de apresentação</p>
              <div className="text-sm bg-muted/50 p-3 rounded whitespace-pre-wrap">{a.cover_letter}</div>
            </div>
          )}

          {a.cv_file_url && (
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => downloadCv(a.cv_file_url, a.cv_file_name || "cv.pdf")}
              >
                <Download className="h-4 w-4 mr-2" /> Baixar currículo
              </Button>
              <Button
                variant="default"
                className="flex-1"
                onClick={handleExtract}
                disabled={extracting}
              >
                {extracting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {extracted ? "Reanalisar com IA" : "Analisar com IA"}
              </Button>
            </div>
          )}

          {extracted && (
            <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">Currículo analisado</p>
              </div>
              {extracted.summary && (
                <p className="text-sm text-muted-foreground italic">{extracted.summary}</p>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {extracted.current_position && (
                  <div><span className="text-muted-foreground">Cargo atual:</span> <span className="font-medium">{extracted.current_position}</span></div>
                )}
                {extracted.years_of_experience != null && (
                  <div><span className="text-muted-foreground">Experiência:</span> <span className="font-medium">{extracted.years_of_experience} anos</span></div>
                )}
              </div>
              {extracted.skills?.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Habilidades</p>
                  <div className="flex flex-wrap gap-1">
                    {extracted.skills.map((s: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {extracted.languages?.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Idiomas</p>
                  <div className="flex flex-wrap gap-1">
                    {extracted.languages.map((l: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">{l}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {extracted.experiences?.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Building2 className="h-3 w-3" /> Experiências</p>
                  <ul className="space-y-1.5">
                    {extracted.experiences.map((e: any, i: number) => (
                      <li key={i} className="text-xs">
                        <span className="font-medium">{e.role}</span>
                        {e.company && <> · {e.company}</>}
                        {e.period && <span className="text-muted-foreground"> ({e.period})</span>}
                        {e.description && <p className="text-muted-foreground">{e.description}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {extracted.education?.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><GraduationCap className="h-3 w-3" /> Formação</p>
                  <ul className="space-y-1">
                    {extracted.education.map((e: any, i: number) => (
                      <li key={i} className="text-xs">
                        <span className="font-medium">{e.degree}</span>
                        {e.institution && <> · {e.institution}</>}
                        {e.period && <span className="text-muted-foreground"> ({e.period})</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {extracted.certifications?.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Certificações</p>
                  <div className="flex flex-wrap gap-1">
                    {extracted.certifications.map((c: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">{c}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <Separator />

          <div>
            <p className="text-sm font-medium mb-2">Notas internas</p>
            <div className="space-y-2 mb-3">
              <Textarea
                rows={2}
                placeholder="Adicionar nota..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              />
              <Button
                size="sm"
                disabled={!newNote.trim()}
                onClick={() => {
                  addNote.mutate(newNote, { onSuccess: () => setNewNote("") });
                }}
              >
                Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {notes.map((n: any) => (
                <div key={n.id} className="text-sm bg-muted/50 p-2 rounded">
                  <p className="whitespace-pre-wrap">{n.note}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(n.created_at), "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
              ))}
              {notes.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhuma nota ainda.</p>
              )}
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap gap-2">
            {a.status === "approved" && (
              <Button onClick={convertToOnboarding}>
                <UserPlus className="h-4 w-4 mr-2" /> Iniciar admissão
              </Button>
            )}
            <Button variant="destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-2" /> Excluir
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ApplicationDetailSheet;
