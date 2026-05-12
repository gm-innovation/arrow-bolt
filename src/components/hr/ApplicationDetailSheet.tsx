import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useApplicationNotes, downloadCv } from "@/hooks/useRecruitment";
import { Download, ExternalLink, Mail, Phone, MapPin, Briefcase, Trash2, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

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

const ApplicationDetailSheet = ({ application: a, open, onClose, onUpdate, onDelete }: Props) => {
  const { notes, addNote } = useApplicationNotes(a.id);
  const [newNote, setNewNote] = useState("");
  const navigate = useNavigate();

  const convertToOnboarding = () => {
    // Pré-popula via querystring; a tela de Admissão deve ler ?from_application=...
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
            <Button
              variant="outline"
              className="w-full"
              onClick={() => downloadCv(a.cv_file_url, a.cv_file_name || "cv.pdf")}
            >
              <Download className="h-4 w-4 mr-2" /> Baixar currículo ({a.cv_file_name})
            </Button>
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
