import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

type ImportResult = { row: number; status: "success" | "error"; message: string };

const ImportPage = () => {
  const { profile } = useAuth();
  const [entityType, setEntityType] = useState("clients");
  const [results, setResults] = useState<ImportResult[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.company_id) return;

    setImporting(true);
    setResults([]);
    const importResults: ImportResult[] = [];

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          if (entityType === "clients") {
            const { error } = await supabase.from("clients").insert({
              company_id: profile.company_id,
              name: row["Nome"] || row["name"] || "",
              email: row["Email"] || row["email"] || null,
              phone: row["Telefone"] || row["phone"] || null,
              cnpj: row["CNPJ"] || row["cnpj"] || null,
              segment: row["Segmento"] || row["segment"] || null,
            });
            if (error) throw error;
            importResults.push({ row: i + 2, status: "success", message: `Cliente "${row["Nome"] || row["name"]}" importado` });
          } else if (entityType === "products") {
            const { error } = await supabase.from("crm_products").insert({
              company_id: profile.company_id,
              name: row["Nome"] || row["name"] || "",
              category: row["Categoria"] || row["category"] || null,
              type: row["Tipo"] || row["type"] || "service",
              reference_value: row["Valor"] || row["value"] || null,
              description: row["Descrição"] || row["description"] || null,
            });
            if (error) throw error;
            importResults.push({ row: i + 2, status: "success", message: `Produto "${row["Nome"] || row["name"]}" importado` });
          }
        } catch (err: any) {
          importResults.push({ row: i + 2, status: "error", message: err.message || "Erro desconhecido" });
        }
      }

      // Log the import
      await supabase.from("crm_integration_logs").insert({
        company_id: profile.company_id,
        user_id: profile.id,
        action: "import",
        entity_type: entityType,
        details: { file_name: file.name, total: rows.length, success: importResults.filter(r => r.status === "success").length },
        status: importResults.some(r => r.status === "error") ? "partial" : "success",
      });

      setResults(importResults);
      const successCount = importResults.filter(r => r.status === "success").length;
      toast.success(`Importação concluída: ${successCount}/${rows.length} registros`);
    } catch (err) {
      toast.error("Erro ao processar arquivo");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Importação de Dados</h2>

      <Card>
        <CardHeader>
          <CardTitle>Importar via Excel/CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="clients">Clientes</SelectItem>
                <SelectItem value="products">Produtos/Serviços</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => fileRef.current?.click()} disabled={importing}>
              <Upload className="h-4 w-4 mr-2" />
              {importing ? "Importando..." : "Selecionar Arquivo"}
            </Button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium text-sm">Formato esperado</span>
            </div>
            {entityType === "clients" ? (
              <p className="text-xs text-muted-foreground">Colunas: Nome, Email, Telefone, CNPJ, Segmento</p>
            ) : (
              <p className="text-xs text-muted-foreground">Colunas: Nome, Categoria, Tipo (product/service), Valor, Descrição</p>
            )}
          </div>

          {results.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Linha</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Detalhe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.row}</TableCell>
                    <TableCell>
                      {r.status === "success" ? (
                        <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" />OK</Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Erro</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{r.message}</TableCell>
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

export default ImportPage;
