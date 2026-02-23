import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { useProducts } from "@/hooks/useProducts";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Search, BookOpen, FileText, Globe, Brain, Plus, Upload, X } from "lucide-react";
import { useState, useRef } from "react";
import { format } from "date-fns";
import { toast } from "sonner";

const CATEGORIES = ["produto", "processo", "técnico", "comercial", "suporte", "outro"];
const SEGMENTS = ["todos", "pequeno", "médio", "grande"];
const PRIORITIES = ["alta", "média", "baixa"];

const AdminKnowledge = () => {
  const { articles: entries = [], documents = [], isLoading, createArticle, uploadDocument } = useKnowledgeBase();
  const { products = [] } = useProducts();
  const [search, setSearch] = useState("");

  // New Entry Dialog
  const [entryOpen, setEntryOpen] = useState(false);
  const [entryTitle, setEntryTitle] = useState("");
  const [entryContent, setEntryContent] = useState("");
  const [entryCategory, setEntryCategory] = useState("");
  const [entrySegment, setEntrySegment] = useState("todos");
  const [entryPriority, setEntryPriority] = useState("média");
  const [entryProductId, setEntryProductId] = useState("");
  const [entryTagInput, setEntryTagInput] = useState("");
  const [entryTags, setEntryTags] = useState<string[]>([]);
  const [entryVersion, setEntryVersion] = useState("1.0");
  const [entryNotes, setEntryNotes] = useState("");

  // Upload Dialog
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Website Dialog
  const [websiteOpen, setWebsiteOpen] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [websiteTitle, setWebsiteTitle] = useState("");
  const [websiteCategory, setWebsiteCategory] = useState("");

  const filteredEntries = entries.filter((e: any) =>
    e.title?.toLowerCase().includes(search.toLowerCase()) ||
    e.category?.toLowerCase().includes(search.toLowerCase())
  );

  const kpis = [
    { label: "Total de Entradas", value: entries.length, icon: BookOpen, color: "text-blue-600 bg-blue-50" },
    { label: "Documentos", value: documents.length, icon: FileText, color: "text-green-600 bg-green-50" },
    { label: "Processados", value: entries.filter((e: any) => e.published).length, icon: Brain, color: "text-purple-600 bg-purple-50" },
    { label: "Categorias", value: new Set(entries.map((e: any) => e.category).filter(Boolean)).size, icon: Globe, color: "text-amber-600 bg-amber-50" },
  ];

  const addTag = () => {
    const tag = entryTagInput.trim();
    if (tag && !entryTags.includes(tag)) {
      setEntryTags([...entryTags, tag]);
      setEntryTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setEntryTags(entryTags.filter(t => t !== tag));
  };

  const resetEntryForm = () => {
    setEntryTitle(""); setEntryContent(""); setEntryCategory(""); setEntrySegment("todos");
    setEntryPriority("média"); setEntryProductId(""); setEntryTagInput(""); setEntryTags([]);
    setEntryVersion("1.0"); setEntryNotes("");
  };

  const handleCreateEntry = () => {
    if (!entryTitle || !entryContent) { toast.error("Título e conteúdo são obrigatórios"); return; }
    createArticle.mutate({
      title: entryTitle,
      content: entryContent,
      category: entryCategory || null,
      tags: entryTags,
      published: true,
      product_id: entryProductId || null,
      target_segment: entrySegment,
      priority: entryPriority,
      version: entryVersion || null,
      notes: entryNotes || null,
    }, {
      onSuccess: () => { setEntryOpen(false); resetEntryForm(); },
    });
  };
  const handleUpload = () => {
    const file = fileRef.current?.files?.[0];
    if (!file) { toast.error("Selecione um arquivo"); return; }
    uploadDocument.mutate({ file, category: uploadCategory || undefined }, {
      onSuccess: () => { setUploadOpen(false); setUploadCategory(""); if (fileRef.current) fileRef.current.value = ""; },
    });
  };

  const handleWebsite = () => {
    if (!websiteUrl) { toast.error("URL é obrigatória"); return; }
    // Placeholder: save as knowledge article with URL as content
    createArticle.mutate({
      title: websiteTitle || websiteUrl,
      content: `URL: ${websiteUrl}`,
      category: websiteCategory || "website",
      tags: ["website"],
      published: false,
    }, {
      onSuccess: () => {
        setWebsiteOpen(false);
        setWebsiteUrl(""); setWebsiteTitle(""); setWebsiteCategory("");
        toast.success("Website adicionado para processamento");
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-foreground">Base de Conhecimento</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setWebsiteOpen(true)}>
            <Globe className="h-4 w-4" /> Adicionar Website
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4" /> Upload Documento
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setEntryOpen(true)}>
            <Plus className="h-4 w-4" /> Nova Entrada
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              {isLoading ? (
                <Skeleton className="h-12 w-full" />
              ) : (
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg ${kpi.color}`}>
                    <kpi.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">{kpi.value}</p>
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar na base de conhecimento..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="entries">
        <TabsList>
          <TabsTrigger value="entries">Entradas ({entries.length})</TabsTrigger>
          <TabsTrigger value="documents">Documentos ({documents.length})</TabsTrigger>
          <TabsTrigger value="websites">Websites</TabsTrigger>
          <TabsTrigger value="ai">Insights IA</TabsTrigger>
        </TabsList>

        <TabsContent value="entries" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : filteredEntries.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Nenhuma entrada encontrada</p>
              ) : (
                <div className="space-y-3">
                  {filteredEntries.map((e: any) => (
                    <div key={e.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{e.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {e.category && <Badge variant="outline" className="text-xs">{e.category}</Badge>}
                          {e.tags?.slice(0, 2).map((t: string) => (
                            <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {format(new Date(e.created_at), "dd/MM/yyyy")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {documents.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Nenhum documento encontrado</p>
              ) : (
                <div className="space-y-3">
                  {documents.map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">{d.file_name}</p>
                          <p className="text-xs text-muted-foreground">{d.category || "Sem categoria"}</p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">{format(new Date(d.created_at), "dd/MM/yyyy")}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="websites" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center py-8 text-muted-foreground">Gerenciamento de websites em desenvolvimento</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center py-8 text-muted-foreground">Insights da IA em desenvolvimento</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Entry Dialog */}
      <Dialog open={entryOpen} onOpenChange={setEntryOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova Entrada de Conhecimento</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-2">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input value={entryTitle} onChange={(e) => setEntryTitle(e.target.value)} placeholder="Título do artigo" />
              </div>
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select value={entryCategory} onValueChange={setEntryCategory}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Segmento Alvo</Label>
                <Select value={entrySegment} onValueChange={setEntrySegment}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEGMENTS.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={entryPriority} onValueChange={setEntryPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Produto Relacionado</Label>
                <Select value={entryProductId} onValueChange={setEntryProductId}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    {(products as any[]).filter((p: any) => p.active).map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Conteúdo *</Label>
                <Textarea value={entryContent} onChange={(e) => setEntryContent(e.target.value)} placeholder="Conteúdo do artigo..." rows={8} className="font-mono text-sm" />
              </div>
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={entryTagInput}
                    onChange={(e) => setEntryTagInput(e.target.value)}
                    placeholder="Adicionar tag"
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={addTag}><Plus className="h-4 w-4" /></Button>
                </div>
                {entryTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {entryTags.map(tag => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="ml-0.5 hover:text-destructive"><X className="h-3 w-3" /></button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Versão</Label>
                <Input value={entryVersion} onChange={(e) => setEntryVersion(e.target.value)} placeholder="1.0" />
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea value={entryNotes} onChange={(e) => setEntryNotes(e.target.value)} placeholder="Notas adicionais..." rows={3} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntryOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateEntry} disabled={createArticle.isPending}>{createArticle.isPending ? "Criando..." : "Criar Entrada"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Upload de Documento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Arquivo *</Label>
              <Input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt,.xls,.xlsx" />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpload} disabled={uploadDocument.isPending}>{uploadDocument.isPending ? "Enviando..." : "Enviar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Website Dialog */}
      <Dialog open={websiteOpen} onOpenChange={setWebsiteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Adicionar Website</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>URL *</Label>
              <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://exemplo.com" />
            </div>
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={websiteTitle} onChange={(e) => setWebsiteTitle(e.target.value)} placeholder="Nome do website" />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={websiteCategory} onValueChange={setWebsiteCategory}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWebsiteOpen(false)}>Cancelar</Button>
            <Button onClick={handleWebsite} disabled={createArticle.isPending}>{createArticle.isPending ? "Adicionando..." : "Adicionar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminKnowledge;
