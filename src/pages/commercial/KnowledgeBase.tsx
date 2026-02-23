import { useState, useRef } from "react";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { useProducts } from "@/hooks/useProducts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Plus, Search, Edit, Trash2, BookOpen, Upload, FileText, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const KnowledgeBase = () => {
  const { articles, documents, isLoading, createArticle, updateArticle, deleteArticle, uploadDocument } = useKnowledgeBase();
  const { products } = useProducts();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewingArticle, setViewingArticle] = useState<Record<string, any> | null>(null);
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const categories = [...new Set(articles.map((a: any) => a.category).filter(Boolean))];

  const openNew = () => {
    setEditing(null);
    setForm({ published: true, tags: [] });
    setDialogOpen(true);
  };

  const openEdit = (a: Record<string, any>) => {
    setEditing(a);
    setForm({ ...a, tags: a.tags || [] });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.title || !form.content) return;
    const payload = {
      title: form.title,
      content: form.content,
      category: form.category || null,
      product_id: form.product_id || null,
      tags: form.tags || [],
      published: form.published ?? true,
    };
    if (editing) {
      updateArticle.mutate({ id: editing.id, ...payload });
    } else {
      createArticle.mutate(payload);
    }
    setDialogOpen(false);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadDocument.mutate({ file, category: "geral" });
    }
  };

  const filtered = articles.filter((a: any) => {
    const matchSearch = a.title?.toLowerCase().includes(search.toLowerCase()) ||
      a.content?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === "all" || a.category === filterCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Base de Conhecimento</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />Documento
          </Button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo Artigo</Button>
        </div>
      </div>

      <Tabs defaultValue="articles" className="w-full">
        <TabsList>
          <TabsTrigger value="articles">Artigos ({articles.length})</TabsTrigger>
          <TabsTrigger value="documents">Documentos ({documents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar artigos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum artigo encontrado</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filtered.map((a: any) => (
                <Card key={a.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{a.title}</CardTitle>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setViewingArticle(a)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteArticle.mutate(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{a.content}</p>
                    <div className="flex flex-wrap gap-1">
                      {a.category && <Badge variant="secondary">{a.category}</Badge>}
                      {a.crm_products?.name && <Badge variant="outline">{a.crm_products.name}</Badge>}
                      {!a.published && <Badge variant="destructive">Rascunho</Badge>}
                      {(a.tags || []).map((t: string) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Por {a.profiles?.full_name || "Desconhecido"}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          {documents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum documento enviado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((d: any) => (
                <Card key={d.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{d.file_name}</p>
                      <p className="text-xs text-muted-foreground">{d.file_type} • {d.category || "Sem categoria"}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={d.file_url} target="_blank" rel="noopener noreferrer">Abrir</a>
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Article Editor Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Artigo" : "Novo Artigo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={form.title || ""} onChange={e => set("title", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Input value={form.category || ""} onChange={e => set("category", e.target.value)} placeholder="Ex: Manuais, Políticas" />
              </div>
              <div className="space-y-2">
                <Label>Produto Relacionado</Label>
                <Select value={form.product_id || ""} onValueChange={v => set("product_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    {products.filter((p: any) => p.active).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tags (separadas por vírgula)</Label>
              <Input value={(form.tags || []).join(", ")} onChange={e => set("tags", e.target.value.split(",").map((t: string) => t.trim()).filter(Boolean))} />
            </div>
            <div className="space-y-2">
              <Label>Conteúdo * (Markdown)</Label>
              <Textarea value={form.content || ""} onChange={e => set("content", e.target.value)} rows={12} className="font-mono text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.published ?? true} onCheckedChange={v => set("published", v)} />
              <Label>Publicado</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.title || !form.content}>{editing ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Article Viewer Dialog */}
      <Dialog open={!!viewingArticle} onOpenChange={() => setViewingArticle(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingArticle?.title}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex flex-wrap gap-1 mb-4">
              {viewingArticle?.category && <Badge variant="secondary">{viewingArticle.category}</Badge>}
              {(viewingArticle?.tags || []).map((t: string) => <Badge key={t} variant="outline">{t}</Badge>)}
            </div>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap">{viewingArticle?.content}</div>
            <p className="text-xs text-muted-foreground mt-4">Autor: {viewingArticle?.profiles?.full_name || "Desconhecido"}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KnowledgeBase;
