import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus } from "lucide-react";
import { useQualityDocumentRequiredCourses } from "@/hooks/useQualityDocumentRequiredCourses";

const DocumentPrerequisitesEditor = () => {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  const { data: documents = [] } = useQuery({
    queryKey: ["q_docs_simple", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_documents")
        .select("id, code, title, status")
        .eq("company_id", companyId!)
        .order("code");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["u_courses_simple", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("university_courses")
        .select("id, title")
        .eq("company_id", companyId!)
        .order("title");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: trails = [] } = useQuery({
    queryKey: ["u_trails_simple", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("university_trails")
        .select("id, title")
        .eq("company_id", companyId!)
        .order("title");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [docId, setDocId] = useState<string>("");
  const [kind, setKind] = useState<"course" | "trail">("course");
  const [refId, setRefId] = useState<string>("");

  const { items, add, remove } = useQualityDocumentRequiredCourses();

  const docMap = useMemo(() => new Map(documents.map((d: any) => [d.id, d])), [documents]);
  const courseMap = useMemo(() => new Map(courses.map((c: any) => [c.id, c])), [courses]);
  const trailMap = useMemo(() => new Map(trails.map((t: any) => [t.id, t])), [trails]);

  const handleAdd = () => {
    if (!docId || !refId) return;
    add.mutate(
      kind === "course"
        ? { document_id: docId, course_id: refId }
        : { document_id: docId, trail_id: refId },
      { onSuccess: () => { setRefId(""); } },
    );
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div className="md:col-span-2">
            <Label className="text-xs">Documento</Label>
            <Select value={docId} onValueChange={setDocId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {documents.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>{d.code} — {d.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Tipo</Label>
            <Select value={kind} onValueChange={(v) => { setKind(v as any); setRefId(""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="course">Curso</SelectItem>
                <SelectItem value="trail">Trilha</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{kind === "course" ? "Curso" : "Trilha"}</Label>
            <Select value={refId} onValueChange={setRefId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {(kind === "course" ? courses : trails).map((x: any) => (
                  <SelectItem key={x.id} value={x.id}>{x.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAdd} disabled={!docId || !refId}>
            <Plus className="h-4 w-4 mr-1" />Adicionar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum pré-requisito cadastrado.</p>
          ) : (
            <ul className="divide-y">
              {items.map((it) => {
                const doc: any = docMap.get(it.document_id);
                const label = it.course_id
                  ? (courseMap.get(it.course_id) as any)?.title ?? it.course_id
                  : (trailMap.get(it.trail_id!) as any)?.title ?? it.trail_id;
                return (
                  <li key={it.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <div className="font-medium">{doc ? `${doc.code} — ${doc.title}` : it.document_id}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <Badge variant="outline">{it.course_id ? "Curso" : "Trilha"}</Badge>
                        {label}
                        {it.is_mandatory && <Badge variant="warning">Obrigatório</Badge>}
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => remove.mutate(it.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentPrerequisitesEditor;
