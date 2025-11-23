'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  User, 
  Bot,
  Trash2,
  FileText
} from 'lucide-react';
import { api } from '@/lib/api';
import DiffViewer from './DiffViewer';

interface EditProposal {
  id: string;
  file_id: string;
  file_name: string;
  start_line: number;
  end_line: number;
  original_text: string;
  proposed_text: string;
  reasoning: string;
  confidence: number;
  status: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  editProposals?: EditProposal[];
}

interface EditorContext {
  text: string;
  fileName: string;
  fileId: string;
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
}

interface AIChatPanelProps {
  projectId: string;
  fileId?: string;
  projectName?: string;
  contextFromEditor?: EditorContext | null;
  onContextUsed?: () => void;
  onApplyEdit?: (edit: EditProposal) => Promise<void>;
}

export default function AIChatPanel({ projectId, fileId, projectName, contextFromEditor, onContextUsed, onApplyEdit }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeContext, setActiveContext] = useState<EditorContext | null>(null);
  const [processingEditId, setProcessingEditId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle context from editor
  useEffect(() => {
    if (contextFromEditor) {
      setActiveContext(contextFromEditor);
      // Auto-focus input when context is added
      const inputElement = document.querySelector('textarea[placeholder*="ASK AI"]') as HTMLTextAreaElement;
      if (inputElement) {
        inputElement.focus();
      }
      onContextUsed?.();
    }
  }, [contextFromEditor, onContextUsed]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // Build message content with context if available
    let messageContent = input;
    if (activeContext) {
      messageContent = `[Context from ${activeContext.fileName}:${activeContext.startLine}-${activeContext.endLine}]\n\`\`\`\n${activeContext.text}\n\`\`\`\n\n${input}`;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input, // Display only the user's input
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const contextData = activeContext;
    setInput('');
    setActiveContext(null); // Clear context after sending
    setIsLoading(true);

    try {
      const data = await api.post<any>('/api/v1/chat', {
        message: messageContent, // Send full message with context
        project_id: projectId,
        file_id: contextData?.fileId || fileId || null,
        conversation_id: null, // Will create new conversation
        context: contextData ? {
          file_name: contextData.fileName,
          start_line: contextData.startLine,
          end_line: contextData.endLine,
          selected_text: contextData.text
        } : null
      });
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message?.content || 'Sorry, I could not generate a response.',
        timestamp: new Date(),
        editProposals: data.edit_proposals || []
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    if (confirm('CLEAR ALL MESSAGES?')) {
      setMessages([]);
    }
  };

  const handleAcceptEdit = async (edit: EditProposal) => {
    if (!onApplyEdit) {
      console.error('No onApplyEdit handler provided');
      return;
    }

    setProcessingEditId(edit.id);
    try {
      await onApplyEdit(edit);
      
      // Update message to mark edit as accepted
      setMessages(prev => prev.map(msg => ({
        ...msg,
        editProposals: msg.editProposals?.map(e => 
          e.id === edit.id ? { ...e, status: 'accepted' } : e
        )
      })));
    } catch (error) {
      console.error('Failed to apply edit:', error);
      alert('Failed to apply edit. Please try again.');
    } finally {
      setProcessingEditId(null);
    }
  };

  const handleRejectEdit = (edit: EditProposal) => {
    // Update message to mark edit as rejected
    setMessages(prev => prev.map(msg => ({
      ...msg,
      editProposals: msg.editProposals?.map(e => 
        e.id === edit.id ? { ...e, status: 'rejected' } : e
      )
    })));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b-4 border-[#0A0A0A] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#FF073A] border-4 border-[#0A0A0A] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase text-[#0A0A0A]">AI ASSISTANT</h3>
              <p className="font-mono text-xs text-gray-600 uppercase">COWRITE AI</p>
            </div>
          </div>
          <button
            onClick={handleClearChat}
            disabled={messages.length === 0}
            className="p-2 text-[#FF073A] hover:bg-[#FF073A]/10 transition-colors disabled:opacity-50"
            title="CLEAR CHAT"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="flex items-center gap-2 px-2 py-1 border-2 border-[#39FF14] bg-[#39FF14]/10 text-[#39FF14] uppercase">
            <div className="w-2 h-2 bg-[#39FF14] animate-pulse" />
            <span className="font-bold">ONLINE</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-sm px-6">
              <div className="w-16 h-16 mx-auto mb-4 border-4 border-[#39FF14] bg-[#39FF14]/10 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-[#39FF14]" />
              </div>
              <h4 className="text-lg font-black uppercase text-[#0A0A0A] mb-2">
                AI WRITING PARTNER
              </h4>
              <p className="font-mono text-xs text-gray-600 mb-4 uppercase">
                GET HELP WITH CHARACTERS, PLOT, AND MORE
              </p>
              <div className="space-y-2 font-mono text-xs text-gray-600 text-left border-4 border-[#0A0A0A] p-3 bg-gray-50">
                <p className="font-bold text-[#0A0A0A] uppercase">TRY ASKING:</p>
                <ul className="space-y-1">
                  <li>• "SUGGEST A BACKSTORY"</li>
                  <li>• "HELP DEVELOP THIS SCENE"</li>
                  <li>• "WHAT COULD HAPPEN NEXT?"</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div className={`flex-shrink-0 w-8 h-8 border-4 border-[#0A0A0A] flex items-center justify-center ${
                message.role === 'user'
                  ? 'bg-[#39FF14]'
                  : 'bg-[#FF073A]'
              }`}>
                {message.role === 'user' ? (
                  <User className="w-4 h-4 text-[#0A0A0A]" />
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>

              <div className={`flex-1 space-y-2 ${
                message.role === 'user' ? 'items-end' : 'items-start'
              }`}>
                <div className={`inline-block max-w-[85%] border-4 border-[#0A0A0A] px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-[#39FF14] ml-auto'
                    : 'bg-white'
                }`}>
                  <p className="font-mono text-xs text-[#0A0A0A] whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                </div>
                
                {/* Edit Proposals */}
                {message.editProposals && message.editProposals.length > 0 && (
                  <div className="space-y-2 w-full">
                    {message.editProposals.map((edit) => (
                      edit.status === 'pending' ? (
                        <DiffViewer
                          key={edit.id}
                          fileName={edit.file_name}
                          startLine={edit.start_line}
                          endLine={edit.end_line}
                          originalText={edit.original_text}
                          proposedText={edit.proposed_text}
                          reasoning={edit.reasoning}
                          confidence={edit.confidence}
                          onAccept={() => handleAcceptEdit(edit)}
                          onReject={() => handleRejectEdit(edit)}
                          isProcessing={processingEditId === edit.id}
                        />
                      ) : (
                        <div key={edit.id} className="border-4 border-[#0A0A0A] bg-gray-100 p-3">
                          <p className="font-mono text-xs text-gray-600 uppercase">
                            EDIT {edit.status === 'accepted' ? '✓ ACCEPTED' : '✗ REJECTED'}
                          </p>
                        </div>
                      )
                    ))}
                  </div>
                )}
                
                <span className="font-mono text-xs text-gray-500 px-2 uppercase">
                  {message.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 border-4 border-[#0A0A0A] bg-[#FF073A] flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="inline-block border-4 border-[#0A0A0A] bg-white px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-t-[#39FF14] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                  <span className="font-mono text-xs text-gray-600 uppercase">THINKING...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t-4 border-[#0A0A0A] p-4">
        {/* Context Badge */}
        {activeContext && (
          <div className="mb-3 flex items-start gap-2 p-3 bg-[#39FF14]/10 border-2 border-[#39FF14]">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-[#39FF14]" />
                <span className="font-mono text-xs font-bold text-[#0A0A0A] uppercase">
                  {activeContext.fileName}:{activeContext.startLine}-{activeContext.endLine}
                </span>
              </div>
              <div className="font-mono text-xs text-gray-700 bg-white p-2 border-2 border-[#0A0A0A] max-h-24 overflow-y-auto">
                {activeContext.text}
              </div>
            </div>
            <button
              onClick={() => setActiveContext(null)}
              className="flex-shrink-0 p-1 text-gray-600 hover:text-[#FF073A] transition-colors"
              title="REMOVE CONTEXT"
            >
              ✕
            </button>
          </div>
        )}
        
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="ASK AI FOR HELP..."
            rows={1}
            className="flex-1 px-4 py-3 border-4 border-[#0A0A0A] bg-white resize-none focus:outline-none focus:border-[#39FF14] font-mono text-xs text-[#0A0A0A] placeholder:text-gray-400 uppercase"
            style={{ minHeight: '42px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="flex-shrink-0 w-12 h-12 border-4 border-[#39FF14] bg-transparent text-[#39FF14] hover:bg-[#39FF14] hover:text-[#0A0A0A] transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            style={{ boxShadow: '4px 4px 0 0 #39FF14' }}
            onMouseEnter={(e) => !input.trim() || (e.currentTarget.style.boxShadow = '0 0 0 0 #39FF14')}
            onMouseLeave={(e) => !input.trim() || (e.currentTarget.style.boxShadow = '4px 4px 0 0 #39FF14')}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="font-mono text-xs text-gray-500 mt-2 text-center uppercase">
          ENTER TO SEND • SHIFT+ENTER FOR NEW LINE
          {activeContext && ' • CONTEXT ATTACHED'}
        </p>
      </div>
    </div>
  );
}
