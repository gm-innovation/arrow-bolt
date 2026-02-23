import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { StageStat } from "@/hooks/useCommercialStats";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(value);

interface Props {
  stageStats: StageStat[];
}

export const PipelineChart = ({ stageStats }: Props) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pipeline por Estágio</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={stageStats} layout="vertical" margin={{ left: 20 }}>
            <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
            <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: number, name: string) => [formatCurrency(value), 'Valor']}
              labelFormatter={(label) => label}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {stageStats.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
