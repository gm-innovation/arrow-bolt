import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Trash2, Plus } from "lucide-react";

interface Props {
  documentId: string;
}

const DocumentPermissionsPanel = ({ documentId }: Props) => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: perms = [] } = useQuery({
    queryKey: ["qd_permissions", documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_document_permissions")
        .select("*, user:profiles!quality_document_permissions_user_id_fkey(id, full_name, email)")
        .eq("document_id", documentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: candidates = [] } = useQuery({
    queryKey: ["qd_perm_candidates", search],
    queryFn: async () => {
      const term = search.trim();
      if (term.length < 2) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .or(`full_name.ilike.%${term}%,email.ilike.%${term}%`)
        .limit(20);
      if (error) return [];
      return data as any[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["qd_permissions", documentId] });

  const grant = async (user_id: string) => {
    const { error } = await supabase
      .from("quality_document_permissions")
      .insert({ document_id: documentId, user_id, can_view: true });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      invalidate();
      setSearch("");
    }
  };

  const update = async (id: string, patch: any) => {
    const { error } = await supabase.from("quality_document_permissions").update(patch).eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else invalidate();
  };

  const revoke = async (id: string) => {
    const { error } = await supabase.from("quality_document_permissions").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else invalidate();
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-2">
          <Input
            placeholder="Buscar colaborador por nome ou email (mínimo 2 caracteres)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {candidates.length > 0 && (
            <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
              {candidates
                .filter((c) => !perms.some((p) => p.user_id === c.id))
                .map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-2 text-sm">
                    <div>
                      <p className="font-medium">{c.full_name}</p>
                      <p className="text-xs text-muted-foreground">{c.email}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => grant(c.id)}>
                      <Plus className="h-4 w-4 mr-1" /> Conceder
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </div>

        {perms.length === 0 ? (
          <p className="text-muted-foreground text-center py-4 text-sm">
            Nenhuma permissão concedida. Documento permanece restrito ao Master da Qualidade
            (e visível se marcado como "visibilidade ampliada").
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead className="text-center">Visualizar</TableHead>
                <TableHead className="text-center">Imprimir</TableHead>
                <TableHead className="text-center">Baixar</TableHead>
                <TableHead className="text-center">Cópia controlada</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perms.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <p className="font-medium">{p.user?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{p.user?.email}</p>
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox checked={p.can_view} onCheckedChange={(v) => update(p.id, { can_view: !!v })} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox checked={p.can_print} onCheckedChange={(v) => update(p.id, { can_print: !!v })} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox checked={p.can_download} onCheckedChange={(v) => update(p.id, { can_download: !!v })} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={p.receives_controlled_copy}
                      onCheckedChange={(v) => update(p.id, { receives_controlled_copy: !!v })}
                    />
                  </TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => revoke(p.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentPermissionsPanel;
