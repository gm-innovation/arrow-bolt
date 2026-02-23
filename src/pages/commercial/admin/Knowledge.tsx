import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, BookOpen, FileText, Globe, Brain, Plus, Upload } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

const AdminKnowledge = () => {
  const { articles: entries = [], documents = [], isLoading } = useKnowledgeBase();
  const [search, setSearch] = useState("");

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-foreground">Base de Conhecimento</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Globe className="h-4 w-4" /> Adicionar Website
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Upload className="h-4 w-4" /> Upload Documento
          </Button>
          <Button size="sm" className="gap-2">
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
    </div>
  );
};

export default AdminKnowledge;
