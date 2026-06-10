import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}

const ChartCard = ({ title, description, action, children, className, footer }: ChartCardProps) => (
  <Card className={cn("flex flex-col", className)}>
    <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
      <div className="space-y-1">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {action}
    </CardHeader>
    <CardContent className="flex-1 flex flex-col">
      <div className="flex-1 min-h-[260px]">{children}</div>
      {footer && <div className="pt-3 text-xs text-muted-foreground">{footer}</div>}
    </CardContent>
  </Card>
);

export default ChartCard;
