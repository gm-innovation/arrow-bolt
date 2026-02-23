import { Phone, Mail, Users, FileText, StickyNote } from "lucide-react";
import { format } from "date-fns";

const ACTIVITY_ICONS: Record<string, any> = {
  call: Phone,
  email: Mail,
  meeting: Users,
  proposal_sent: FileText,
  note: StickyNote,
};

const ACTIVITY_LABELS: Record<string, string> = {
  call: 'Ligação',
  email: 'Email',
  meeting: 'Reunião',
  proposal_sent: 'Proposta Enviada',
  note: 'Nota',
};

interface Activity {
  id: string;
  activity_type: string;
  description: string | null;
  activity_date: string;
  user_name: string;
}

interface Props {
  activities: Activity[];
}

export const ActivityTimeline = ({ activities }: Props) => {
  if (activities.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">Nenhuma atividade registrada</p>;
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => {
        const Icon = ACTIVITY_ICONS[activity.activity_type] || StickyNote;
        return (
          <div key={activity.id} className="flex gap-3">
            <div className="flex-shrink-0 mt-1">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{ACTIVITY_LABELS[activity.activity_type] || activity.activity_type}</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground text-xs">{activity.user_name}</span>
              </div>
              {activity.description && (
                <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(activity.activity_date), "dd/MM/yyyy 'às' HH:mm")}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
