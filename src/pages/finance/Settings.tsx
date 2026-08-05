import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import {
  useFinanceCategories,
  useFinanceSettings,
  type FinanceCategoryType,
} from "@/hooks/useFinanceSettings";

const typeLabels: Record<string, string> = { expense: "Despesa", revenue: "Receita" };

const CategoriesTab = () => {
  const { allCategories, isLoading, createCategory, updateCategory, deleteCategory, seedDefaults } = useFinanceCategories();
  const [name, setName] = useState("");
  const [type, setType] = useState<FinanceCategoryType>("expense");

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createCategory.mutateAsync({ name, category_type: type });
    setName("");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nova categoria</CardTitle>
          <CardDescription>Categorias organizam contas a pagar, a receber e reembolsos.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="cat-name">Nome</Label>
            <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Materiais" />
          </div>
          <div className="w-full sm:w-48">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as FinanceCategoryType)}>
              <SelectTrigger aria-label="Tipo da categoria"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Despesa</SelectItem>
                <SelectItem value="revenue">Receita</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleCreate} disabled={createCategory.isPending || !name.trim()}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Categorias cadastradas</CardTitle>
            <CardDescription>Desative em vez de excluir quando a categoria já foi usada.</CardDescription>
          </div>
          <Button variant="outline" onClick={() => seedDefaults.mutate()} disabled={seedDefaults.isPending}>
            <Sparkles className="mr-2 h-4 w-4" /> Criar categorias padrão
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-8 text-center text-muted-foreground">Carregando...</p>
          ) : allCategories.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Nenhuma categoria cadastrada. Use "Criar categorias padrão" para começar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Ativa</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allCategories.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <Badge variant={c.category_type === "revenue" ? "default" : "secondary"}>
                        {typeLabels[c.category_type] || c.category_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={c.is_active}
                        aria-label={`Ativar categoria ${c.name}`}
                        onCheckedChange={(checked) => updateCategory.mutate({ id: c.id, is_active: checked })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Excluir categoria ${c.name}`}
                        onClick={() => deleteCategory.mutate(c.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const AlertsTab = () => {
  const { settings, isLoading, saveSettings } = useFinanceSettings();
  const [payableDays, setPayableDays] = useState<string>("");
  const [receivableDays, setReceivableDays] = useState<string>("");

  const currentPayable = payableDays !== "" ? payableDays : String(settings?.payable_alert_days ?? 5);
  const currentReceivable = receivableDays !== "" ? receivableDays : String(settings?.receivable_alert_days ?? 5);

  if (isLoading) return <p className="py-8 text-center text-muted-foreground">Carregando...</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alertas de vencimento</CardTitle>
        <CardDescription>
          Define quantos dias antes do vencimento o sistema avisa o time financeiro sobre contas a pagar e a receber.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">Alertas ativos</p>
            <p className="text-sm text-muted-foreground">Desligue para pausar as notificações de vencimento.</p>
          </div>
          <Switch
            checked={settings?.alerts_enabled ?? true}
            aria-label="Ativar alertas de vencimento"
            onCheckedChange={(checked) => saveSettings.mutate({ alerts_enabled: checked })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="payable-days">Contas a pagar (dias antes)</Label>
            <Input
              id="payable-days"
              type="number"
              min={0}
              max={90}
              value={currentPayable}
              onChange={(e) => setPayableDays(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="receivable-days">Contas a receber (dias antes)</Label>
            <Input
              id="receivable-days"
              type="number"
              min={0}
              max={90}
              value={currentReceivable}
              onChange={(e) => setReceivableDays(e.target.value)}
            />
          </div>
        </div>

        <Button
          onClick={() =>
            saveSettings.mutate({
              payable_alert_days: Math.max(0, Number(currentPayable) || 0),
              receivable_alert_days: Math.max(0, Number(currentReceivable) || 0),
            })
          }
          disabled={saveSettings.isPending}
        >
          Salvar alertas
        </Button>
      </CardContent>
    </Card>
  );
};

const PreferencesTab = () => {
  const { settings, isLoading, saveSettings } = useFinanceSettings();
  const { allCategories } = useFinanceCategories();

  const expense = allCategories.filter((c) => c.category_type === "expense" && c.is_active);
  const revenue = allCategories.filter((c) => c.category_type === "revenue" && c.is_active);

  if (isLoading) return <p className="py-8 text-center text-muted-foreground">Carregando...</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferências</CardTitle>
        <CardDescription>Categorias sugeridas nos novos lançamentos e visibilidade de valores.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Categoria padrão de despesa</Label>
            <Select
              value={settings?.default_payable_category_id ?? "none"}
              onValueChange={(v) => saveSettings.mutate({ default_payable_category_id: v === "none" ? null : v })}
            >
              <SelectTrigger aria-label="Categoria padrão de despesa"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {expense.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Categoria padrão de receita</Label>
            <Select
              value={settings?.default_receivable_category_id ?? "none"}
              onValueChange={(v) => saveSettings.mutate({ default_receivable_category_id: v === "none" ? null : v })}
            >
              <SelectTrigger aria-label="Categoria padrão de receita"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {revenue.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">Ocultar valores no dashboard</p>
            <p className="text-sm text-muted-foreground">Útil para apresentações e telas compartilhadas.</p>
          </div>
          <Switch
            checked={settings?.hide_dashboard_amounts ?? false}
            aria-label="Ocultar valores no dashboard"
            onCheckedChange={(checked) => saveSettings.mutate({ hide_dashboard_amounts: checked })}
          />
        </div>
      </CardContent>
    </Card>
  );
};

const FinanceSettings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Configurações Financeiras</h2>
        <p className="text-muted-foreground">Categorias, alertas de vencimento e preferências</p>
      </div>

      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
          <TabsTrigger value="preferences">Preferências</TabsTrigger>
        </TabsList>
        <TabsContent value="categories" className="mt-6"><CategoriesTab /></TabsContent>
        <TabsContent value="alerts" className="mt-6"><AlertsTab /></TabsContent>
        <TabsContent value="preferences" className="mt-6"><PreferencesTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default FinanceSettings;
