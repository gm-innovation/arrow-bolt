import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useCoordinatorEmployeeDocs, useMyPackages, useCreatePackage, getSignedDocUrl, PURPOSE_LABELS } from "@/hooks/useHRDocumentSharing";
import { Search, Download, FileText, PackagePlus, ShieldAlert, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const EmployeeDocuments = () => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Documentos dos Colaboradores</h2>
        <p className="text-sm text-muted-foreground">
          Documentos autorizados pelo RH para uso em autorizações de embarque, acesso a estaleiros, viagens e hospedagens.
        </p>
      </div>
      <Tabs defaultValue="directory">
        <TabsList>
          <TabsTrigger value="directory">Colaboradores</TabsTrigger>
          <TabsTrigger value="packages">Meus pacotes</TabsTrigger>
        </TabsList>
        <TabsContent value="directory" className="mt-4"><Directory/></TabsContent>
        <TabsContent value="packages" className="mt-4"><MyPackages/></TabsContent>
      </Tabs>
    </div>
  );
};

const Directory = () => {
  const { data = [], isLoading } = useCoordinatorEmployeeDocs();
  const [q, setQ] = useState("");
  const [pkgOpen, setPkgOpen] = useState(false);
  const [selected, setSelected] = useState<Array<{ employee_id: string; document_id: string; catalog_id: string; requires_grant: boolean; label: string }>>([]);

  const filtered = useMemo(() => data.filter((e: any) =>
    !q ||
    (e.full_name ?? "").toLowerCase().includes(q.toLowerCase()) ||
    (e.position ?? "").toLowerCase().includes(q.toLowerCase())
  ), [data, q]);

  const toggle = (payload: typeof selected[number]) => {
    setSelected(prev => {
      const i = prev.findIndex(p => p.document_id === payload.document_id);
      if (i >= 0) { const c = [...prev]; c.splice(i,1); return c; }
      return [...prev, payload];
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
            <Input placeholder="Buscar colaborador ou cargo…" value={q} onChange={e=>setQ(e.target.value)} className="pl-9"/>
          </div>
          <Button disabled={selected.length===0} onClick={()=>setPkgOpen(true)}>
            <PackagePlus className="h-4 w-4 mr-2"/> Criar pacote ({selected.length})
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && "Carregando…"}
        {!isLoading && filtered.length === 0 && (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <ShieldAlert className="h-4 w-4"/> Nenhum colaborador com documentos autorizados pelo RH ainda.
          </div>
        )}
        {filtered.map((emp: any) => (
          <Card key={emp.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{emp.full_name ?? emp.email ?? "—"}</span>
                <span className="text-xs font-normal text-muted-foreground">{emp.position ?? ""}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Emissão</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="w-32">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emp.items.map((it: any) => {
                    const doc = it.document;
                    const cat = it.catalog;
                    const checked = doc ? selected.some(s => s.document_id === doc.id) : false;
                    const download = async () => {
                      if (!doc) return;
                      try {
                        const url = await getSignedDocUrl({
                          document_id: doc.id, file_path: doc.file_path,
                          action: "download", employee_id: emp.id,
                        });
                        window.open(url, "_blank");
                      } catch (e:any) { toast.error("Erro ao baixar", { description: e.message }); }
                    };
                    return (
                      <TableRow key={cat.id}>
                        <TableCell>
                          <Checkbox
                            disabled={!doc}
                            checked={checked}
                            onCheckedChange={()=>doc && toggle({
                              employee_id: emp.id, document_id: doc.id, catalog_id: cat.id,
                              requires_grant: false, label: `${emp.full_name} — ${cat.name}`,
                            })}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{cat.name}</TableCell>
                        <TableCell className="text-xs">{doc?.issue_date ?? "—"}</TableCell>
                        <TableCell className="text-xs">{doc?.expiry_date ?? "—"}</TableCell>
                        <TableCell>
                          {!doc ? <Badge variant="destructive">Sem arquivo</Badge>
                            : doc.expiry_date && new Date(doc.expiry_date) < new Date()
                              ? <Badge variant="destructive">Vencido</Badge>
                              : <Badge>Disponível</Badge>}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" disabled={!doc} onClick={download}>
                            <Download className="h-4 w-4 mr-1"/> Baixar
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </CardContent>
      <PackageDialog open={pkgOpen} onOpenChange={setPkgOpen} items={selected} clear={()=>setSelected([])}/>
    </Card>
  );
};

const PackageDialog = ({ open, onOpenChange, items, clear }: {
  open: boolean; onOpenChange: (v:boolean)=>void;
  items: Array<{ employee_id: string; document_id: string; catalog_id: string; requires_grant: boolean; label: string }>;
  clear: ()=>void;
}) => {
  const create = useCreatePackage();
  const [purpose, setPurpose] = useState("shipyard_entry");
  const [recipient, setRecipient] = useState("");
  const [justification, setJustification] = useState("");
  const [expires, setExpires] = useState<string>("");

  const submit = async () => {
    if (!recipient.trim()) { toast.error("Informe o destinatário"); return; }
    try {
      await create.mutateAsync({
        recipient_name: recipient.trim(),
        purpose,
        justification: justification || undefined,
        expires_at: expires ? new Date(expires + "T23:59:59").toISOString() : null,
        items: items.map(({ employee_id, document_id, catalog_id, requires_grant }) => ({ employee_id, document_id, catalog_id, requires_grant })),
      });
      clear(); onOpenChange(false);
      setRecipient(""); setJustification(""); setExpires("");
    } catch { /* toast in hook */ }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo pacote de compartilhamento</DialogTitle>
          <DialogDescription>Registro auditável do envio destes documentos.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Finalidade</label>
            <Select value={purpose} onValueChange={setPurpose}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>
                {Object.entries(PURPOSE_LABELS).map(([k,v])=>(<SelectItem key={k} value={k}>{v}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Destinatário</label>
            <Input placeholder="Ex.: Estaleiro Wilson Sons — Guarujá" value={recipient} onChange={e=>setRecipient(e.target.value)}/>
          </div>
          <div>
            <label className="text-sm font-medium flex items-center gap-1"><CalendarIcon className="h-3 w-3"/> Expira em</label>
            <Input type="date" value={expires} onChange={e=>setExpires(e.target.value)}/>
          </div>
          <div>
            <label className="text-sm font-medium">Justificativa</label>
            <Textarea rows={3} value={justification} onChange={e=>setJustification(e.target.value)} placeholder="Contexto de uso deste pacote…"/>
          </div>
          <div className="border rounded-md p-2 max-h-40 overflow-y-auto text-sm">
            <div className="font-medium mb-1">{items.length} documento(s):</div>
            {items.map(i => (
              <div key={i.document_id} className="text-xs text-muted-foreground flex items-center gap-1">
                <FileText className="h-3 w-3"/> {i.label}
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={()=>onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={create.isPending}>Criar pacote</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const MyPackages = () => {
  const { data = [], isLoading } = useMyPackages();
  return (
    <Card>
      <CardContent className="pt-4">
        {isLoading ? "Carregando…" : data.length === 0 ? (
          <div className="text-sm text-muted-foreground">Você ainda não criou nenhum pacote.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Criado em</TableHead>
                <TableHead>Destinatário</TableHead>
                <TableHead>Finalidade</TableHead>
                <TableHead>Documentos</TableHead>
                <TableHead>Expira</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((p:any)=>(
                <TableRow key={p.id}>
                  <TableCell className="text-xs">{format(new Date(p.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                  <TableCell className="font-medium">{p.recipient_name}</TableCell>
                  <TableCell>{PURPOSE_LABELS[p.purpose] ?? p.purpose}</TableCell>
                  <TableCell>{p.items?.length ?? 0}</TableCell>
                  <TableCell className="text-xs">{p.expires_at ? format(new Date(p.expires_at), "dd/MM/yyyy", { locale: ptBR }) : "—"}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "active" ? "default" : p.status === "expired" ? "outline" : "secondary"}>
                      {p.status}
                    </Badge>
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

export default EmployeeDocuments;
