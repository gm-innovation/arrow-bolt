import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Sparkles, History, X, LifeBuoy, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAIChat, type ReportFields } from '@/hooks/useAIChat';
import { AIMessageFeedback } from './AIMessageFeedback';
import { AIConversationList } from './AIConversationList';
import { AIActionButton, detectActionsFromResponse } from './AIActionButton';
import { AttachmentChips, AttachmentButton, type MarinaAttachment } from './AIAttachmentUpload';
import { useMarinaAttachments } from '@/hooks/useMarinaAttachments';
import { AIReportPreview } from './AIReportPreview';
import { useNavigate } from 'react-router-dom';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useSpeechPlayback } from '@/hooks/useSpeechPlayback';
import { useVoicePref } from '@/hooks/useVoicePref';
import { VoiceRecordButton } from './VoiceRecordButton';
import { SpeakMessageButton } from './SpeakMessageButton';
import { VoicePrefToggle } from './VoicePrefToggle';



interface AIChatProps {
  userRole: string;
  agentName?: string;
  avatarUrl?: string;
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

const defaultSuggestions = [
  "Como abrir um chamado de suporte?",
  "Onde encontro o manual desta tela?",
  "Como criar um novo registro aqui?"
];

const quickSuggestions: Record<string, string[]> = {
  technician: [
    "Como resolver problema de sinal fraco?",
    "Quais ferramentas usar para instalação?",
    "Gerar relatório: fiz manutenção no radar"
  ],
  admin: [
    "Quais OSs estão pendentes hoje?",
    "Qual técnico está disponível agora?",
    "Resumo de produtividade da semana"
  ],
  coordinator: [
    "Quais OSs estão pendentes hoje?",
    "Qual técnico está disponível agora?",
    "Resumo de produtividade da semana"
  ],
  manager: [
    "KPIs consolidados da equipe",
    "Comparativo entre coordenadores",
    "Aprovações pendentes"
  ],
  director: [
    "KPIs estratégicos do mês",
    "Solicitações aguardando minha aprovação",
    "Resumo financeiro consolidado"
  ],
  commercial: [
    "Novos leads do site nesta semana",
    "Oportunidades em aberto por estágio",
    "Buscar empresa por CNPJ"
  ],
  marketing: [
    "Leads gerados pelo site este mês",
    "Campanhas com melhor conversão",
    "Oportunidades originadas de marketing"
  ],
  hr: [
    "Exames ASO a vencer nos próximos 30 dias",
    "Solicitações de férias pendentes",
    "Documentos obrigatórios em atraso"
  ],
  quality: [
    "Não conformidades em aberto",
    "Documentos aguardando revisão",
    "Conscientizações pendentes"
  ],
  supplies: [
    "Solicitações de compra em aberto",
    "Homologações de fornecedores pendentes",
    "Provedores externos críticos"
  ],
  finance: [
    "Contas a pagar desta semana",
    "Recebíveis em atraso",
    "Reembolsos aguardando aprovação"
  ],
  super_admin: [
    "Chamados de suporte em aberto",
    "Novas empresas cadastradas",
    "Saúde geral do sistema"
  ]
};


export function AIChat({ userRole, agentName = 'Arrow AI', avatarUrl, context }: AIChatProps) {
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
  const [attachments, setAttachments] = useState<MarinaAttachment[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { processFiles: processDroppedFiles } = useMarinaAttachments(attachments, setAttachments, 10);

  // ---- Saudação personalizada ----
  const { profile } = useAuth();
  const { data: aiPrefs } = useAIUserPreferences();
  const greetingName = (aiPrefs?.use_name ?? true)
    ? ((aiPrefs?.preferred_name || (profile as any)?.full_name || '').trim().split(/\s+/)[0] || '')
    : '';

  // ---- Voz ----
  const { pref: voicePref, cycle: cycleVoicePref } = useVoicePref();
  const { isSpeaking, speakingId, speak, stop: stopSpeaking } = useSpeechPlayback();
  const lastSpokenRef = useRef<string | null>(null);
  const lastInputWasVoiceRef = useRef(false);

  const {
    isRecording,
    isTranscribing,
    duration: recordDuration,
    start: startRecording,
    stop: stopRecording,
    cancel: cancelRecording,
  } = useVoiceRecorder({
    onResult: (text) => {
      lastInputWasVoiceRef.current = true;
      setInput((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
      textareaRef.current?.focus();
    },
  });

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
    return () => cancelAnimationFrame(id);
  }, [messages, isLoading, reportPreview]);

  // Fala automaticamente a última resposta conforme a preferência do usuário.
  useEffect(() => {
    if (voicePref === 'off' || isLoading) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant' || !last.content) return;
    const key = last.id ?? `idx-${messages.length}-${last.content.length}`;
    if (lastSpokenRef.current === key) return;
    if (voicePref === 'auto' && !lastInputWasVoiceRef.current) return;
    lastSpokenRef.current = key;
    lastInputWasVoiceRef.current = false;
    speak(last.content, key);
  }, [messages, isLoading, voicePref, speak]);

  const handleSend = () => {
    if ((!input.trim() && attachments.length === 0) || isLoading) return;
    stopSpeaking();
    sendMessage(input || '(anexo)', attachments);
    setInput('');
    setAttachments([]);
  };

  // Colar imagens (print de tela) direto no chat.
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    if (isLoading) return;
    const items = Array.from(e.clipboardData?.items ?? []);
    const files = items
      .filter((it) => it.kind === 'file' && it.type.startsWith('image/'))
      .map((it) => it.getAsFile())
      .filter((f): f is File => !!f);
    if (!files.length) return;
    e.preventDefault();
    const named = files.map((f, i) =>
      f.name && f.name !== 'image.png'
        ? f
        : new File([f], `captura-${Date.now()}-${i + 1}.png`, { type: f.type }),
    );
    await processDroppedFiles(named);
  }, [isLoading, processDroppedFiles]);



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

  const handleDragEnter = (e: React.DragEvent) => {
    if (isLoading) return;
    if (!Array.from(e.dataTransfer.types || []).includes('Files')) return;
    e.preventDefault();
    dragCounter.current += 1;
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent) => {
    if (isLoading) return;
    if (!Array.from(e.dataTransfer.types || []).includes('Files')) return;
    e.preventDefault();
  };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    if (isLoading) return;
    const files = e.dataTransfer.files;
    if (files && files.length) await processDroppedFiles(files);
  };

  return (
    <div
      className="flex flex-col flex-1 min-h-0 relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-primary bg-primary/10 backdrop-blur-sm">
          <Upload className="h-8 w-8 text-primary" />
          <p className="text-sm font-medium text-primary">Solte para anexar à Marina</p>
          <p className="text-xs text-muted-foreground">Até 10 arquivos, 20MB cada</p>
        </div>
      )}

      {/* History toggle */}
      <div className="flex items-center justify-between px-3 py-1 border-b">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => navigate('/account/tickets')}
        >
          <LifeBuoy className="h-3 w-3" />
          Meus chamados
        </Button>
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
      <ScrollArea className="flex-1 p-4">
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
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={agentName}
                className="h-32 w-32 rounded-full object-cover border-2 border-primary/20 shadow-md"
              />
            ) : (
              <Sparkles className="h-12 w-12 text-primary/50" />
            )}
            <div>
              <h3 className="font-semibold text-foreground">
                {greetingName ? `Olá, ${greetingName}! Sou ${agentName}` : `Olá! Sou ${agentName}`}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Como posso ajudar você hoje?
              </p>
            </div>

            
            {/* Quick suggestions */}
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {(quickSuggestions[userRole] || defaultSuggestions).map((suggestion, i) => (
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
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {msg.attachments.map((a, ai) => a.kind === 'image' ? (
                              <img key={ai} src={a.dataUrl} alt={a.name} className="max-w-[180px] rounded" />
                            ) : (
                              <span key={ai} className="inline-flex items-center gap-1 rounded bg-background/20 px-2 py-0.5 text-xs">
                                📎 {a.name}
                              </span>
                            ))}
                          </div>
                        )}
                        <span>{msg.content}</span>
                      </div>
                    )}

                  </div>

                  {/* Feedback + leitura em voz das respostas */}
                  {msg.role === 'assistant' && msg.content && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {msg.id && (
                        <AIMessageFeedback
                          messageId={msg.id}
                          onFeedback={submitFeedback}
                        />
                      )}
                      <SpeakMessageButton
                        text={msg.content}
                        isSpeaking={isSpeaking && speakingId === (msg.id ?? `idx-${i}`)}
                        onSpeak={() => speak(msg.content, msg.id ?? `idx-${i}`)}
                        onStop={stopSpeaking}
                      />
                    </div>
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
        <div ref={messagesEndRef} className="h-1" />
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t">
        <div className="flex flex-col gap-2">
          <AttachmentChips attachments={attachments} onChange={setAttachments} />
          <div className="flex gap-2 items-stretch">
            <AttachmentButton attachments={attachments} onChange={setAttachments} />
            <VoiceRecordButton
              isRecording={isRecording}
              isTranscribing={isTranscribing}
              duration={recordDuration}
              disabled={isLoading}
              onStart={startRecording}
              onStop={stopRecording}
              onCancel={cancelRecording}
            />
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={
                isRecording
                  ? 'Gravando... fale e clique em parar para transcrever'
                  : attachments.length > 0
                    ? 'Descreva o que quer que a Marina faça com o(s) anexo(s)...'
                    : 'Digite, cole uma imagem (Ctrl+V) ou grave um áudio...'
              }
              className="min-h-[56px] max-h-[160px] resize-none flex-1"
              rows={1}
              disabled={isLoading}
            />
            <Button
              size="icon"
              className="h-auto w-10 self-stretch"
              onClick={handleSend}
              disabled={(!input.trim() && attachments.length === 0) || isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <VoicePrefToggle pref={voicePref} onCycle={cycleVoicePref} />
          </div>

        </div>
      </div>
    </div>
  );

}
