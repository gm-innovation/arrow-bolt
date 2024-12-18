import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from "recharts";

const techTasksData = [
  { name: "João Silva", tasks: 12 },
  { name: "Maria Santos", tasks: 8 },
  { name: "Pedro Lima", tasks: 15 },
  { name: "Ana Costa", tasks: 10 },
];

const completionTimeData = [
  { date: "01/03", time: 4.5 },
  { date: "02/03", time: 3.8 },
  { date: "03/03", time: 5.2 },
  { date: "04/03", time: 4.0 },
  { date: "05/03", time: 3.5 },
];

export const DashboardCharts = () => {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Tarefas por Técnico</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <BarChart width={500} height={300} data={techTasksData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="tasks" fill="#1e3a8a" />
            </BarChart>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tempo Médio de Conclusão (horas)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <LineChart width={500} height={300} data={completionTimeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="time" stroke="#1e3a8a" strokeWidth={2} />
            </LineChart>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};