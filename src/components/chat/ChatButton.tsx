import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useChat } from "@/hooks/useChat";
import { useNavigate } from "react-router-dom";

interface ChatButtonProps {
  userType: string;
}

export const ChatButton = ({ userType }: ChatButtonProps) => {
  const { totalUnreadCount } = useChat();
  const navigate = useNavigate();

  const chatPath = `/${userType === "super-admin" ? "super-admin" : userType}/chat`;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative text-muted-foreground hover:text-foreground"
      onClick={() => navigate(chatPath)}
      title="Chat"
    >
      <MessageSquare className="h-5 w-5" />
      {totalUnreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
        >
          {totalUnreadCount > 9 ? "9+" : totalUnreadCount}
        </Badge>
      )}
    </Button>
  );
};
