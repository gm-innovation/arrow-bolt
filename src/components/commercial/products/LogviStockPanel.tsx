import { useMemo, useState } from "react";
import { useLogviProducts, LogviProduct } from "@/hooks/useLogviProducts";
import { useStockProducts } from "@/hooks/useStockProducts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search, RefreshCw, Cloud, AlertCircle, MapPin } from "lucide-react";

const formatMoney = (value: number, currency?: string | null) => {
  const code = currency === "USD" ? "USD" : "BRL";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: code }).format(Number(value) || 0);
};

const LogviStockPanel = () => {
  const [search, setSearch] = useState("");
  const [onlySellable, setOnlySellable] = useState(true);
  const { products, stock, total, isLoading, isFetching, error, refetch } = useLogviProducts({ onlySellable });
  const { syncFromLogvi } = useStockProducts();

  const filtered = useMemo(() => {
    const term = search
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
    if (!term) return products;
    const terms = term.split(/\s+/).filter(Boolean);
    return products.filter((p: LogviProduct) => {
      const haystack = `${p.nome} ${p.codigo ?? ""} ${p.ncm ?? ""} ${p.classificacao ?? ""}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      return terms.every(t => haystack.includes(t));
    });
  }, [products, search]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              Estoque LOGVI
            </CardTitle>
            <CardDescription>
              {stock?.nome ? `${stock.nome} · ` : ""}
              {total} {total === 1 ? "produto" : "produtos"} disponíveis para consulta comercial
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Button
              onClick={() => syncFromLogvi.mutate(products)}
              disabled={products.length === 0 || syncFromLogvi.isPending}
            >
              {syncFromLogvi.isPending ? "Sincronizando..." : "Sincronizar do LOGVI"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Não foi possível consultar o LOGVI</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, código ou NCM..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="only-sellable" checked={onlySellable} onCheckedChange={setOnlySellable} />
            <Label htmlFor="only-sellable" className="text-sm">Só vendáveis</Label>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Nenhum produto encontrado no estoque LOGVI.
          </p>
        ) : (
          <ScrollArea className="h-[420px] rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">Custo</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">Margem</TableHead>
                  <TableHead className="text-right">Preço venda</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p: LogviProduct) => (
                  <TableRow key={p.produto_id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.codigo || "-"}</TableCell>
                    <TableCell>
                      <div className="font-medium">{p.nome}</div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {p.posicao && (
                          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />{p.posicao}
                          </span>
                        )}
                        {p.ncm && <span className="text-xs text-muted-foreground">NCM {p.ncm}</span>}
                        {!p.vendavel && <Badge variant="outline">Não vendável</Badge>}
                        {p.quantidade_atual <= 0 && <Badge variant="destructive">Sem estoque</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">{p.quantidade_atual}</TableCell>
                    <TableCell className="text-right hidden lg:table-cell">
                      {formatMoney(p.custo_unitario_atual, p.moeda)}
                    </TableCell>
                    <TableCell className="text-right hidden lg:table-cell">
                      {Number(p.margem_percentual).toFixed(0)}%
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatMoney(p.preco_venda, p.moeda)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default LogviStockPanel;
