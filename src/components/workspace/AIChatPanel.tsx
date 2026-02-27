'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  User,
  Bot,
  Trash2,
  FileText,
  X,
  Loader2,
  ChevronRight,
  History,
  MessageSquare,
  BrainCircuit,
  Lightbulb,
  Wand2
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
  onClose?: () => void;
  theme?: 'sepia' | 'dark' | 'light';
}

const GENRE_LABELS: Record<string, string> = {
  fantasy: '🧙 Fantasy',
  sci_fi: '🚀 Sci-Fi',
  romance: '❤️ Romance',
  thriller: '🔎 Thriller',
  horror: '👻 Horror',
  literary: '✍️ Literary',
  historical: '🏰 Historical',
  young_adult: '🧑‍🎓 YA',
  poetry: '🪶 Poetry',
  screenwriting: '🎬 Screen',
  general: '🌍 General',
};

const PROMPT_CHIPS = [
  { icon: <History className="w-4 h-4" />, label: 'Suggest a backstory' },
  { icon: <Sparkles className="w-4 h-4" />, label: 'Develop this scene' },
  { icon: <MessageSquare className="w-4 h-4" />, label: 'Improve dialogue' },
  { icon: <BrainCircuit className="w-4 h-4" />, label: 'Check plot holes' },
];

export default function AIChatPanel({
  projectId, fileId, projectName, contextFromEditor, onContextUsed, onApplyEdit, onClose, theme = 'sepia'
}: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeContext, setActiveContext] = useState<EditorContext | null>(null);
  const [processingEditId, setProcessingEditId] = useState<string | null>(null);
  const [projectGenre, setProjectGenre] = useState<string>('general');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isDark = theme === 'dark';
  const cardBg = isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-stone-200 shadow-sm';
  const chipBg = isDark ? 'bg-zinc-700/50 hover:bg-zinc-700' : 'bg-stone-100/50 hover:bg-stone-100 border border-transparent hover:border-indigo-200';

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    const fetchGenre = async () => {
      try {
        const p = await api.projects.get(projectId) as any;
        if (p?.settings?.genre) setProjectGenre(p.settings.genre);
      } catch { }
    };
    if (projectId) fetchGenre();
  }, [projectId]);

  useEffect(() => {
    if (contextFromEditor) {
      setActiveContext(contextFromEditor);
      inputRef.current?.focus();
      onContextUsed?.();
    }
  }, [contextFromEditor, onContextUsed]);

  const handleSend = async (overrideMessage?: string) => {
    const text = overrideMessage || input;
    if (!text.trim() || isLoading) return;

    let messageContent = text;
    if (activeContext) {
      messageContent = `[Context from ${activeContext.fileName}:${activeContext.startLine}-${activeContext.endLine}]\n\`\`\`\n${activeContext.text}\n\`\`\`\n\n${text}`;
    }

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    const ctx = activeContext;
    setInput('');
    setActiveContext(null);
    setIsLoading(true);

    try {
      const data = await api.post<any>('/api/v1/chat', {
        message: messageContent,
        project_id: projectId,
        file_id: ctx?.fileId || fileId || null,
        conversation_id: null,
        context: ctx ? { file_name: ctx.fileName, start_line: ctx.startLine, end_line: ctx.endLine, selected_text: ctx.text } : null
      });

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message?.content || 'Sorry, I could not generate a response.',
        timestamp: new Date(),
        editProposals: data.edit_proposals || []
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }]);
    } finally { setIsLoading(false); }
  };

  const handleAcceptEdit = async (edit: EditProposal) => {
    if (!onApplyEdit) return;
    setProcessingEditId(edit.id);
    try {
      await onApplyEdit(edit);
      setMessages(prev => prev.map(msg => ({
        ...msg, editProposals: msg.editProposals?.map(e => e.id === edit.id ? { ...e, status: 'accepted' } : e)
      })));
    } catch { alert('Failed to apply edit.'); }
    finally { setProcessingEditId(null); }
  };

  const handleRejectEdit = (edit: EditProposal) => {
    setMessages(prev => prev.map(msg => ({
      ...msg, editProposals: msg.editProposals?.map(e => e.id === edit.id ? { ...e, status: 'rejected' } : e)
    })));
  };

  return (
    <div className="p-5 flex flex-col h-full overflow-hidden">
      {/* Header — The Muse */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-indigo-900/40 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
            <Sparkles size={18} />
          </div>
          <h3 className="font-bold text-lg">The Muse</h3>
        </div>
        <div className="flex items-center gap-2">
          {projectGenre && projectGenre !== 'general' && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-stone-100 text-stone-600'}`}>
              {GENRE_LABELS[projectGenre] || projectGenre}
            </span>
          )}
          {onClose && (
            <button onClick={onClose} className="opacity-40 hover:opacity-100 transition-opacity">
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Messages or Empty State */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
        {messages.length === 0 ? (
          <>
            {/* Welcome card with prompt chips */}
            <div className={`p-4 rounded-2xl border ${cardBg}`}>
              <p className={`text-sm mb-4 italic ${isDark ? 'opacity-60' : 'opacity-70'}`}>
                "Select some text or ask me anything to help develop your scene."
              </p>
              <div className="grid grid-cols-1 gap-2">
                {PROMPT_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(chip.label)}
                    className={`flex items-center space-x-3 p-3 text-left rounded-xl text-sm font-medium transition-all transform hover:scale-[1.02] active:scale-95 ${chipBg}`}
                  >
                    <span className="text-indigo-500">{chip.icon}</span>
                    <span>{chip.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Insight card */}
            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-indigo-900/20 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
              <div className="flex items-center space-x-2 text-indigo-600 mb-2">
                <Lightbulb size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Insight</span>
              </div>
              <p className="text-sm leading-relaxed">
                Try selecting a paragraph and right-clicking to "Send to The Muse" for targeted feedback on your writing.
              </p>
            </div>
          </>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`flex gap-2.5 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${message.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-stone-100 text-stone-600'
                }`}>
                {message.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
              </div>
              <div className="flex-1 space-y-1.5">
                <div className={`inline-block max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${message.role === 'user'
                    ? 'bg-indigo-600 text-white ml-auto float-right'
                    : isDark ? 'bg-zinc-800 text-zinc-200' : 'bg-white border border-stone-200 text-stone-800 shadow-sm'
                  }`}>
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                </div>

                {message.editProposals && message.editProposals.length > 0 && (
                  <div className="space-y-2 w-full clear-both">
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
                        <div key={edit.id} className={`rounded-lg p-2 text-xs ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-stone-50 text-stone-500 border border-stone-200'}`}>
                          Edit {edit.status === 'accepted' ? '✓ accepted' : '✗ rejected'}
                        </div>
                      )
                    ))}
                  </div>
                )}

                <span className={`text-[10px] px-1 clear-both block ${isDark ? 'text-zinc-600' : 'text-stone-400'}`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex gap-2.5">
            <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${isDark ? 'bg-zinc-700' : 'bg-stone-100'}`}>
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div className={`rounded-2xl px-3.5 py-2.5 ${isDark ? 'bg-zinc-800' : 'bg-white border border-stone-200 shadow-sm'}`}>
              <div className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                <span className="text-sm opacity-60">The Muse is thinking…</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Context badge */}
      {activeContext && (
        <div className={`mt-3 mb-2 flex items-start gap-2 p-2.5 rounded-xl border ${isDark ? 'bg-blue-900/20 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <FileText className="w-3 h-3 text-blue-500" />
              <span className="text-[10px] font-semibold text-blue-600">
                {activeContext.fileName}:{activeContext.startLine}-{activeContext.endLine}
              </span>
            </div>
            <div className={`text-xs p-1.5 rounded max-h-14 overflow-y-auto ${isDark ? 'bg-zinc-900 text-zinc-300 border border-zinc-700' : 'bg-white text-stone-600 border border-stone-200'}`}>
              {activeContext.text}
            </div>
          </div>
          <button onClick={() => setActiveContext(null)} className="opacity-40 hover:opacity-100">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="mt-3 relative">
        <input
          ref={inputRef}
          type="text"
          placeholder="Ask the Muse..."
          className={`w-full pl-4 pr-12 py-4 rounded-2xl text-sm border focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all ${isDark
              ? 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500'
              : 'bg-white border-stone-200 shadow-xl shadow-indigo-500/5 placeholder:text-stone-400'
            }`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || isLoading}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/40 hover:bg-indigo-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
