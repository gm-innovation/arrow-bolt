import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Loader2, FileText, Ship, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SearchResult {
  task_report_id: string;
  similarity: number;
  content_text: string;
  report_data: any;
  report_details?: {
    id: string;
    task_id: string;
    status: string;
    created_at: string;
    task?: {
      title: string;
      service_order?: {
        order_number: string;
        vessel?: { name: string };
        client?: { name: string };
      };
    };
  };
}

interface SemanticSearchDialogProps {
  onSelectReport?: (reportId: string) => void;
}

export function SemanticSearchDialog({ onSelectReport }: SemanticSearchDialogProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (query.trim().length < 3) {
      toast({
        title: "Busca muito curta",
        description: "Digite pelo menos 3 caracteres para buscar.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      setResults([]);

      // Get user's company_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      const { data, error } = await supabase.functions.invoke('search-reports', {
        body: { 
          query: query.trim(),
          company_id: profile?.company_id,
          match_count: 10,
          match_threshold: 0.2
        }
      });

      if (error) throw error;

      if (data?.results) {
        setResults(data.results);
        if (data.results.length === 0) {
          toast({
            title: "Nenhum resultado",
            description: "Não encontramos relatórios similares. Tente termos diferentes.",
          });
        }
      }
    } catch (error: any) {
      console.error("Search error:", error);
      toast({
        title: "Erro na busca",
        description: error.message || "Não foi possível realizar a busca.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSearch();
    }
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.7) return "bg-green-100 text-green-800 border-green-300";
    if (similarity >= 0.5) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    return "bg-orange-100 text-orange-800 border-orange-300";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Search className="h-4 w-4" />
          Busca Semântica
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Busca Semântica em Relatórios
          </DialogTitle>
          <DialogDescription>
            Encontre relatórios similares usando inteligência artificial. 
            Descreva o problema, equipamento ou trabalho executado.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            placeholder="Ex: vazamento bomba hidráulica, manutenção motor diesel..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={loading || query.trim().length < 3}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        <ScrollArea className="h-[400px] pr-4">
          {results.length > 0 ? (
            <div className="space-y-3">
              {results.map((result, index) => (
                <Card 
                  key={result.task_report_id} 
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => {
                    onSelectReport?.(result.task_report_id);
                    setOpen(false);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className={getSimilarityColor(result.similarity)}>
                            {(result.similarity * 100).toFixed(0)}% similar
                          </Badge>
                          {result.report_details?.task?.service_order && (
                            <Badge variant="secondary">
                              OS #{result.report_details.task.service_order.order_number}
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-2">
                          {result.report_details?.task?.service_order?.vessel?.name && (
                            <span className="flex items-center gap-1">
                              <Ship className="h-3 w-3" />
                              {result.report_details.task.service_order.vessel.name}
                            </span>
                          )}
                          {result.report_details?.task?.service_order?.client?.name && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {result.report_details.task.service_order.client.name}
                            </span>
                          )}
                          {result.report_details?.created_at && (
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {format(new Date(result.report_details.created_at), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          )}
                        </div>

                        <p className="text-sm line-clamp-3">
                          {result.content_text || "Sem descrição disponível"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !loading && query.length > 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Digite sua busca e pressione Enter ou clique no botão de busca</p>
            </div>
          )}

          {!loading && query.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium mb-2">Busca Inteligente por Similaridade</p>
              <p className="text-sm">
                A busca semântica encontra relatórios com conteúdo similar,<br />
                mesmo que não usem as mesmas palavras exatas.
              </p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
