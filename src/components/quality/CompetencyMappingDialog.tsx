import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQualityCompetencies } from "@/hooks/useQualityCompetencies";
import { useQualityCompetencyMappings, type EvidenceType } from "@/hooks/useQualityCompetencyMappings";
import type { CompetencyLevel } from "@/hooks/useQualityRoleRequirements";
import { useQualityDocuments } from "@/hooks/useQualityDocuments";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultCompetencyId?: string;
}

const TYPES: { value: EvidenceType; label: string }[] = [
  { value: "university_course", label: "Curso da Universidade" },
  { value: "university_trail", label: "Trilha da Universidade" },
  { value: "hr_certificate", label: "Certificado RH (por tipo de documento)" },
  { value: "acknowledgement", label: "Ciência de documento da Qualidade" },
];
const LEVELS: CompetencyLevel[] = ["basic", "intermediate", "advanced", "expert"];

const CompetencyMappingDialog = ({ open, onClose, defaultCompetencyId }: Props) => {
  const { profile } = useAuth();
  const { items: competencies } = useQualityCompetencies();
  const { upsert } = useQualityCompetencyMappings();
  const { documents } = useQualityDocuments();

  const [competencyId, setCompetencyId] = useState<string>(defaultCompetencyId ?? "");
  const [evidenceType, setEvidenceType] = useState<EvidenceType>("university_course");
  const [sourceId, setSourceId] = useState<string>("");
  const [sourceLabel, setSourceLabel] = useState<string>("");
  const [grantsLevel, setGrantsLevel] = useState<CompetencyLevel>("basic");

  useEffect(() => { if (defaultCompetencyId) setCompetencyId(defaultCompetencyId); }, [defaultCompetencyId]);

  const { data: courses = [] } = useQuery({
    queryKey: ["uni_courses_for_mapping", profile?.company_id],
    enabled: !!profile?.company_id && (evidenceType === "university_course"),
    queryFn: async () => {
      const { data } = await supabase
        .from("university_courses").select("id, title")
        .eq("company_id", profile!.company_id!)
        .order("title");
      return (data ?? []) as any[];
    },
  });
  const { data: trails = [] } = useQuery({
    queryKey: ["uni_trails_for_mapping", profile?.company_id],
    enabled: !!profile?.company_id && (evidenceType === "university_trail"),
    queryFn: async () => {
      const { data } = await supabase
        .from("university_trails").select("id, title")
        .eq("company_id", profile!.company_id!)
        .order("title");
      return (data ?? []) as any[];
    },
  });

  const docTypes = useMemo(() => {
    const set = new Set<string>();
    return Array.from(set);
  }, []);

  const submit = async () => {
    let label = sourceLabel;
    let sid: string | null = sourceId || null;
    if (evidenceType === "hr_certificate") {
      sid = null;
      label = sourceLabel.trim();
      if (!label) return;
    }
    await upsert.mutateAsync({
      competency_id: competencyId, evidence_type: evidenceType,
      source_id: sid as any, source_label: label, grants_level: grantsLevel,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo mapeamento de evidência</DialogTitle>
          <DialogDescription>Vincule uma evidência a uma competência e ao nível que ela concede.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Competência</Label>
            <Select value={competencyId} onValueChange={setCompetencyId}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                {competencies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Tipo de evidência</Label>
            <Select value={evidenceType} onValueChange={(v) => { setEvidenceType(v as EvidenceType); setSourceId(""); setSourceLabel(""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {evidenceType === "university_course" && (
            <div className="space-y-1">
              <Label>Curso</Label>
              <Select value={sourceId} onValueChange={(v) => { setSourceId(v); setSourceLabel(courses.find((c: any) => c.id === v)?.title ?? ""); }}>
                <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                <SelectContent>
                  {courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {evidenceType === "university_trail" && (
            <div className="space-y-1">
              <Label>Trilha</Label>
              <Select value={sourceId} onValueChange={(v) => { setSourceId(v); setSourceLabel(trails.find((t: any) => t.id === v)?.title ?? ""); }}>
                <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                <SelectContent>
                  {trails.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {evidenceType === "hr_certificate" && (
            <div className="space-y-1">
              <Label>Tipo de documento (technician_documents.document_type)</Label>
              <Input value={sourceLabel} onChange={(e) => setSourceLabel(e.target.value)} placeholder="ex.: NR-13" />
            </div>
          )}
          {evidenceType === "acknowledgement" && (
            <div className="space-y-1">
              <Label>Documento da Qualidade</Label>
              <Select value={sourceId} onValueChange={(v) => { setSourceId(v); setSourceLabel(documents.find((d: any) => d.id === v)?.title ?? ""); }}>
                <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                <SelectContent>
                  {documents.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.code} — {d.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label>Nível concedido</Label>
            <Select value={grantsLevel} onValueChange={(v) => setGrantsLevel(v as CompetencyLevel)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={!competencyId || upsert.isPending}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CompetencyMappingDialog;
