import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useShareableCatalog, useToggleCatalogShareable,
  useCompanyEmployees, useAllActiveGrants, useSetGrant,
} from "@/hooks/useHRDocumentSharing";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Search, Shield, UserCheck } from "lucide-react";

const HRDocumentSharing = () => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2"><Shield className="h-5 w-5"/> Compartilhamento com Coordenadores</h2>
        <p className="text-sm text-muted-foreground">
          Controle quais tipos de documento e quais colaboradores ficam visíveis aos coordenadores para autorizações de embarque, viagem e acesso a estaleiros.
        </p>
      </div>
      <Tabs defaultValue="types">
        <TabsList>
          <TabsTrigger value="types">Tipos compartilháveis</TabsTrigger>
          <TabsTrigger value="employees">Autorizações por colaborador</TabsTrigger>
          <TabsTrigger value="log">Histórico de acessos</TabsTrigger>
        </TabsList>
        <TabsContent value="types" className="mt-4"><TypesTab/></TabsContent>
        <TabsContent value="employees" className="mt-4"><EmployeesTab/></TabsContent>
        <TabsContent value="log" className="mt-4"><LogTab/></TabsContent>
      </Tabs>
    </div>
  );
};

// ------ Types tab ------
const TypesTab = () => {
  const { data: catalog = [], isLoading } = useShareableCatalog();
  const toggle = useToggleCatalogShareable();
  const [q, setQ] = useState("");
  const filtered = catalog.filter(c => !q || c.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
          <Input placeholder="Buscar tipo…" value={q} onChange={e=>setQ(e.target.value)} className="pl-9 max-w-md"/>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? "Carregando…" : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="w-40">Compartilhável com coordenadores</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell><Badge variant="outline">{c.category}</Badge></TableCell>
                  <TableCell>
                    <Switch
                      checked={c.coordinator_shareable}
                      onCheckedChange={(v)=>toggle.mutate({ id: c.id, value: v })}
                    />
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

// ------ Employees tab ------
const EmployeesTab = () => {
  const { data: employees = [], isLoading } = useCompanyEmployees();
  const { data: catalog = [] } = useShareableCatalog();
  const { data: grants = [] } = useAllActiveGrants();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const shareableCatalog = useMemo(() => catalog.filter(c => c.coordinator_shareable), [catalog]);
  const grantsByEmp = useMemo(() => {
    const m = new Map<string, Set<string>>();
    grants.forEach(g => {
      if (!m.has(g.employee_id)) m.set(g.employee_id, new Set());
      m.get(g.employee_id)!.add(g.catalog_id);
    });
    return m;
  }, [grants]);

  const filtered = employees.filter(e =>
    !q || (e.full_name ?? "").toLowerCase().includes(q.toLowerCase())
       || (e.position ?? "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
          <Input placeholder="Buscar colaborador…" value={q} onChange={e=>setQ(e.target.value)} className="pl-9 max-w-md"/>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? "Carregando…" : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Autorizações ativas</TableHead>
                <TableHead className="w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(e => {
                const set = grantsByEmp.get(e.id) ?? new Set();
                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.full_name ?? e.email ?? "—"}</TableCell>
                    <TableCell>{e.position ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={set.size ? "default" : "secondary"}>
                        {set.size} / {shareableCatalog.length}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={()=>setSelected(e.id)}>
                        <UserCheck className="h-4 w-4 mr-1"/> Gerenciar
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Sheet open={!!selected} onOpenChange={(o)=>!o && setSelected(null)}>
        <SheetContent side="right" className="w-[520px] sm:max-w-[520px] overflow-y-auto">
          {selected && (
            <GrantEditor
              employeeId={selected}
              employeeName={employees.find(e=>e.id===selected)?.full_name ?? ""}
              shareableCatalog={shareableCatalog}
              active={grantsByEmp.get(selected) ?? new Set()}
              onClose={()=>setSelected(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </Card>
  );
};

const GrantEditor = ({ employeeId, employeeName, shareableCatalog, active, onClose }: {
  employeeId: string; employeeName: string;
  shareableCatalog: Array<{ id: string; name: string; category: string }>;
  active: Set<string>; onClose: ()=>void;
}) => {
  const setGrant = useSetGrant();
  return (
    <>
      <SheetHeader>
        <SheetTitle>Autorizações — {employeeName}</SheetTitle>
        <SheetDescription>
          Marque os tipos que os coordenadores poderão visualizar deste colaborador.
        </SheetDescription>
      </SheetHeader>
      <div className="mt-4 space-y-2">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => {
            shareableCatalog.forEach(c => {
              if (!active.has(c.id)) setGrant.mutate({ employee_id: employeeId, catalog_id: c.id, grant: true });
            });
          }}>Liberar todos</Button>
          <Button size="sm" variant="outline" onClick={() => {
            shareableCatalog.forEach(c => {
              if (active.has(c.id)) setGrant.mutate({ employee_id: employeeId, catalog_id: c.id, grant: false });
            });
          }}>Revogar todos</Button>
        </div>
        <div className="border rounded-md divide-y">
          {shareableCatalog.map(c => (
            <label key={c.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50">
              <Checkbox
                checked={active.has(c.id)}
                onCheckedChange={(v)=>setGrant.mutate({ employee_id: employeeId, catalog_id: c.id, grant: !!v })}
              />
              <div className="flex-1">
                <div className="text-sm font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.category}</div>
              </div>
            </label>
          ))}
          {shareableCatalog.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">
              Nenhum tipo foi marcado como compartilhável ainda. Ative na aba "Tipos compartilháveis".
            </div>
          )}
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={onClose}>Concluir</Button>
        </div>
      </div>
    </>
  );
};

// ------ Log tab ------
const LogTab = () => {
  const { data = [], isLoading } = useQuery({
    queryKey: ["hr-share-access-log"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_document_share_access_log")
        .select("*")
        .order("accessed_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Últimos 200 acessos</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? "Carregando…" : data.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nenhum acesso registrado ainda.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Coordenador</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((l:any)=>(
                <TableRow key={l.id}>
                  <TableCell className="text-xs">{new Date(l.accessed_at).toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-xs font-mono">{l.accessed_by?.slice(0,8)}</TableCell>
                  <TableCell className="text-xs font-mono">{l.document_id?.slice(0,8)}</TableCell>
                  <TableCell><Badge variant="outline">{l.action}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default HRDocumentSharing;
