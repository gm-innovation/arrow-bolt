import { useState, useEffect } from "react";
import { useChat } from "@/hooks/useChat";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { NewConversationDialog } from "@/components/chat/NewConversationDialog";
import { MessageSquare } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Chat = () => {
  const {
    conversations,
    messages,
    activeConversationId,
    setActiveConversationId,
    loadingConversations,
    loadingMessages,
    sendMessage,
    isSending,
    createConversation,
    isCreating,
    markAsRead,
  } = useChat();

  const [showNewDialog, setShowNewDialog] = useState(false);
  const isMobile = useIsMobile();
  const [showSidebar, setShowSidebar] = useState(true);

  // Mark as read when conversation changes
  useEffect(() => {
    if (activeConversationId) {
      markAsRead(activeConversationId);
      if (isMobile) {
        setShowSidebar(false);
      }
    }
  }, [activeConversationId, markAsRead, isMobile]);

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  );

  const handleSendMessage = (content: string, attachmentUrl?: string) => {
    sendMessage({ content, attachmentUrl });
  };

  const handleBack = () => {
    setShowSidebar(true);
    setActiveConversationId(null);
  };

  if (isMobile) {
    return (
      <div className="h-[calc(100vh-180px)] flex flex-col">
        {showSidebar ? (
          <ChatSidebar
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={setActiveConversationId}
            onNewConversation={() => setShowNewDialog(true)}
            isLoading={loadingConversations}
          />
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 p-2 border-b border-border">
              <Button size="icon" variant="ghost" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h3 className="font-semibold truncate">
                {activeConversation?.title || "Conversa"}
              </h3>
            </div>
            <div className="flex-1 min-h-0">
              <ChatWindow
                messages={messages}
                onSendMessage={handleSendMessage}
                isSending={isSending}
                isLoading={loadingMessages}
              />
            </div>
          </div>
        )}

        <NewConversationDialog
          open={showNewDialog}
          onOpenChange={setShowNewDialog}
          onCreateConversation={createConversation}
          isCreating={isCreating}
        />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-180px)] flex rounded-lg border border-border overflow-hidden bg-background">
      {/* Sidebar */}
      <div className="w-80 flex-shrink-0">
        <ChatSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={setActiveConversationId}
          onNewConversation={() => setShowNewDialog(true)}
          isLoading={loadingConversations}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeConversationId ? (
          <ChatWindow
            messages={messages}
            conversationTitle={activeConversation?.title || "Conversa"}
            onSendMessage={handleSendMessage}
            isSending={isSending}
            isLoading={loadingMessages}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/30">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium mb-2">
                Selecione uma conversa
              </h3>
              <p className="text-sm">
                Escolha uma conversa existente ou inicie uma nova
              </p>
            </div>
          </div>
        )}
      </div>

      <NewConversationDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        onCreateConversation={createConversation}
        isCreating={isCreating}
      />
    </div>
  );
};

export default Chat;
