import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const QualityReports = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Relatórios de Qualidade</h2>
        <p className="text-muted-foreground">Indicadores e métricas do SGQ</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Indicadores</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">Módulo em construção.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default QualityReports;
