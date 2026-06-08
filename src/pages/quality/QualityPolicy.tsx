import { useState, useEffect, useMemo } from "react";
import { useQualityPolicy } from "@/hooks/useQualityPolicy";
import { useQualityPolicyDeptAcks } from "@/hooks/useQualityPolicyDeptAcks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ShieldCheck, AlertTriangle, History, Users } from "lucide-react";
import { diffLines } from "@/lib/textDiff";

export default function QualityPolicy() {
  const {
    policyText, policyVersion, publishedAt,
    acks, versions, isMaster, publish,
  } = useQualityPolicy();
  const { data: deptAcks = [] } = useQualityPolicyDeptAcks(policyVersion);
  const [draft, setDraft] = useState(policyText ?? "");
  const [compareVersion, setCompareVersion] = useState<number | "current">("current");

  useEffect(() => {
    setDraft(policyText ?? "");
  }, [policyText]);

  const adherenceTotal = acks.length;
  const previousVersion = useMemo(
    () => versions.find((v) => v.version === policyVersion - 1),
    [versions, policyVersion],
  );

  const compareTarget = useMemo(() => {
    if (compareVersion === "current") return previousVersion;
    return versions.find((v) => v.version === compareVersion) ?? null;
  }, [compareVersion, previousVersion, versions]);

  const diff = useMemo(() => {
    if (!compareTarget) return [];
    return diffLines(compareTarget.text, policyText ?? "");
  }, [compareTarget, policyText]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" /> Política da Qualidade
        </h2>
        <p className="text-sm text-muted-foreground">
          Texto publicado para toda a empresa. Publicar uma nova versão zera a ciência dos colaboradores.
        </p>
      </div>

      <Tabs defaultValue="editor">
        <TabsList>
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="diff">
            <History className="h-3 w-3 mr-1" />Histórico & diff
          </TabsTrigger>
          <TabsTrigger value="adherence">
            <Users className="h-3 w-3 mr-1" />Adesão por departamento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-3 mt-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base">Versão atual</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline">v{policyVersion}</Badge>
                {publishedAt && (
                  <span className="text-xs text-muted-foreground">
                    Publicada em {new Date(publishedAt).toLocaleString("pt-BR")}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={12}
                placeholder="Escreva a Política da Qualidade aqui…"
                disabled={!isMaster}
              />
              {!isMaster && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Apenas o Master pode editar e publicar a Política da Qualidade.
                </p>
              )}
              <div className="flex justify-end">
                <Button
                  onClick={() => publish.mutate(draft)}
                  disabled={!isMaster || publish.isPending || !draft.trim() || draft === policyText}
                >
                  Publicar nova versão
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Adesão (total)</CardTitle></CardHeader>
            <CardContent className="text-sm">
              {adherenceTotal} colaborador(es) registraram ciência da versão {policyVersion}.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diff" className="space-y-3 mt-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base">Comparação com versão anterior</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Comparar com</span>
                <Select
                  value={String(compareVersion)}
                  onValueChange={(v) => setCompareVersion(v === "current" ? "current" : Number(v))}
                >
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Anterior imediata</SelectItem>
                    {versions.map((v) => (
                      <SelectItem key={v.id} value={String(v.version)}>
                        v{v.version} · {new Date(v.published_at).toLocaleDateString("pt-BR")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {!compareTarget ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma versão anterior disponível para comparação.
                </p>
              ) : (
                <div className="rounded-md border font-mono text-xs overflow-x-auto">
                  {diff.length === 0 ? (
                    <p className="p-3 text-muted-foreground">Sem diferenças.</p>
                  ) : (
                    diff.map((d, idx) => {
                      const cls =
                        d.op === "added"
                          ? "bg-emerald-500/10 text-emerald-800 border-l-2 border-emerald-500"
                          : d.op === "removed"
                          ? "bg-destructive/10 text-destructive border-l-2 border-destructive line-through"
                          : "text-muted-foreground border-l-2 border-transparent";
                      const prefix = d.op === "added" ? "+ " : d.op === "removed" ? "− " : "  ";
                      return (
                        <div key={idx} className={`px-3 py-0.5 whitespace-pre-wrap ${cls}`}>
                          {prefix}{d.text || " "}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Todas as versões</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Versão</TableHead>
                    <TableHead>Publicada em</TableHead>
                    <TableHead>Caracteres</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell><Badge>v{policyVersion} (atual)</Badge></TableCell>
                    <TableCell>{publishedAt ? new Date(publishedAt).toLocaleString("pt-BR") : "—"}</TableCell>
                    <TableCell>{(policyText ?? "").length}</TableCell>
                  </TableRow>
                  {versions.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell><Badge variant="outline">v{v.version}</Badge></TableCell>
                      <TableCell>{new Date(v.published_at).toLocaleString("pt-BR")}</TableCell>
                      <TableCell>{v.text.length}</TableCell>
                    </TableRow>
                  ))}
                  {versions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                        Sem versões anteriores arquivadas.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adherence" className="space-y-3 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Ciência por departamento — versão {policyVersion}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Departamento</TableHead>
                    <TableHead className="text-right">Cobertura</TableHead>
                    <TableHead className="w-48">Progresso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deptAcks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                        Sem departamentos configurados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    deptAcks.map((d) => {
                      const pct = d.total_members > 0
                        ? Math.round((d.acknowledged / d.total_members) * 100)
                        : 0;
                      return (
                        <TableRow key={`${d.department_id ?? "none"}`}>
                          <TableCell className="font-medium">{d.department_name}</TableCell>
                          <TableCell className="text-right">
                            {d.acknowledged} / {d.total_members}
                            <span className="text-muted-foreground ml-2">({pct}%)</span>
                          </TableCell>
                          <TableCell>
                            <Progress value={pct} />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
