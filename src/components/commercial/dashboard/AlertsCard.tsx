import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, AlertTriangle } from "lucide-react";

interface Props {
  title: string;
  items: { label: string; detail: string }[];
  type: "alerts" | "risk";
}

export const AlertsCard = ({ title, items, type }: Props) => {
  const Icon = type === "alerts" ? AlertTriangle : AlertTriangle;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-4 w-4 text-destructive" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <ShieldCheck className="h-5 w-5" />
            <span>Tudo sob controle!</span>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm p-2 rounded bg-muted/50">
                <span>{item.label}</span>
                <span className="text-muted-foreground">{item.detail}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
