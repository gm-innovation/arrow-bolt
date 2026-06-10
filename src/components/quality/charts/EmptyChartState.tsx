import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Inbox, Settings2 } from "lucide-react";

interface EmptyChartStateProps {
  message: string;
  variant?: "no_data" | "setup_pending";
  ctaLabel?: string;
  ctaTo?: string;
  icon?: ReactNode;
}

const EmptyChartState = ({ message, variant = "no_data", ctaLabel, ctaTo, icon }: EmptyChartStateProps) => {
  const Icon = variant === "setup_pending" ? Settings2 : Inbox;
  return (
    <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-center px-4 gap-3">
      <div className="rounded-full bg-muted p-3 text-muted-foreground">
        {icon ?? <Icon className="h-5 w-5" />}
      </div>
      <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
      {ctaLabel && ctaTo && (
        <Button asChild size="sm" variant="outline">
          <Link to={ctaTo}>{ctaLabel}</Link>
        </Button>
      )}
    </div>
  );
};

export default EmptyChartState;
