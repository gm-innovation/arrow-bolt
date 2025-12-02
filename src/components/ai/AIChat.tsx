import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, History, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAIChat, type ReportFields } from '@/hooks/useAIChat';
import { AIMessageFeedback } from './AIMessageFeedback';
import { AIConversationList } from './AIConversationList';
import { AIActionButton, detectActionsFromResponse } from './AIActionButton';
import { AIPhotoUpload } from './AIPhotoUpload';
import { AIReportPreview } from './AIReportPreview';
import { useNavigate } from 'react-router-dom';

interface AIChatProps {
  userRole: string;
  context?: {
    taskTypeId?: string;
    serviceOrderId?: string;
    companyId?: string;
    currentScreen?: string;
    taskId?: string;
    taskData?: Record<string, unknown>;
    serviceOrderData?: Record<string, unknown>;
  };
}

const quickSuggestions: Record<string, string[]> = {
  technician: [
    "Como resolver problema de sinal fraco?",
    "Quais ferramentas usar para instalação?",
    "Gerar relatório: fiz manutenção no radar"
  ],
  admin: [
    "Qual técnico está disponível hoje?",
    "Resumo das OS pendentes",
    "Análise de produtividade da semana"
  ],
  manager: [
    "Comparativo entre coordenadores",
    "Tendências do último mês",
    "KPIs da equipe"
  ]
};

export function AIChat({ userRole, context }: AIChatProps) {
  const navigate = useNavigate();
  const {
    messages,
    conversations,
    currentConversationId,
    isLoading,
    isLoadingConversations,
    reportPreview,
    proactiveAlerts,
    sendMessage,
    loadConversation,
    startNewConversation,
    deleteConversation,
    submitFeedback,
    clearReportPreview,
    dismissAlert
  } = useAIChat({ userRole, context });

  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input, selectedImage || undefined);
    setInput('');
    setSelectedImage(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSelectConversation = (conversationId: string) => {
    loadConversation(conversationId);
    setShowHistory(false);
  };

  const handleNewConversation = () => {
    startNewConversation();
    setShowHistory(false);
  };

  const handleApplyReport = (fields: ReportFields) => {
    clearReportPreview();
    navigate('/tech/report-form', { 
      state: { 
        prefill: fields, 
        taskId: context?.taskId 
      } 
    });
  };

  // Show conversation history panel
  if (showHistory) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-sm font-medium">Histórico de Conversas</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setShowHistory(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <AIConversationList
          conversations={conversations}
          currentConversationId={currentConversationId}
          isLoading={isLoadingConversations}
          onSelect={handleSelectConversation}
          onDelete={deleteConversation}
          onNewConversation={handleNewConversation}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* History toggle */}
      <div className="flex items-center justify-end px-3 py-1 border-b">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => setShowHistory(true)}
        >
          <History className="h-3 w-3" />
          Histórico ({conversations.length})
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {/* Proactive Alerts */}
        {proactiveAlerts.length > 0 && (
          <div className="mb-4 space-y-2">
            {proactiveAlerts.map((alert) => (
              <div 
                key={alert.id} 
                className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200 text-sm">
                      🔔 {alert.title}
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      {alert.message}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => dismissAlert(alert.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Report Preview */}
        {reportPreview && (
          <div className="mb-4">
            <AIReportPreview
              fields={reportPreview}
              onApply={handleApplyReport}
              onDismiss={clearReportPreview}
            />
          </div>
        )}

        {messages.length === 0 && !reportPreview ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-8">
            <Sparkles className="h-12 w-12 text-primary/50" />
            <div>
              <h3 className="font-semibold text-foreground">Olá! Sou o NavalOS AI</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Como posso ajudar você hoje?
              </p>
            </div>
            
            {/* Quick suggestions */}
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {(quickSuggestions[userRole] || quickSuggestions.technician).map((suggestion, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setInput(suggestion);
                    sendMessage(suggestion);
                  }}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => {
              const actions = msg.role === 'assistant' && msg.content 
                ? detectActionsFromResponse(msg.content) 
                : [];

              return (
                <div
                  key={i}
                  className={cn(
                    "flex flex-col",
                    msg.role === 'user' ? "items-end" : "items-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                      msg.role === 'user'
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    )}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                        {msg.content || (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Pensando...
                          </span>
                        )}
                      </div>
                    ) : (
                      <div>
                        {msg.image && (
                          <img 
                            src={msg.image} 
                            alt="Imagem enviada" 
                            className="max-w-full rounded mb-2"
                          />
                        )}
                        <span>{msg.content}</span>
                      </div>
                    )}
                  </div>

                  {/* Feedback for assistant messages */}
                  {msg.role === 'assistant' && msg.content && msg.id && (
                    <AIMessageFeedback
                      messageId={msg.id}
                      onFeedback={submitFeedback}
                    />
                  )}

                  {/* Action buttons */}
                  {actions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {actions.map((action, actionIdx) => (
                        <AIActionButton key={actionIdx} action={action} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t">
        <div className="flex gap-2 items-end">
          {userRole === 'technician' && (
            <AIPhotoUpload
              selectedImage={selectedImage}
              onImageSelect={setSelectedImage}
            />
          )}
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedImage ? "Descreva o que quer analisar na foto..." : "Digite sua pergunta..."}
            className="min-h-[40px] max-h-[120px] resize-none flex-1"
            rows={1}
            disabled={isLoading}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
