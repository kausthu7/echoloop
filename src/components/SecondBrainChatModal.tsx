import React, { useState, useEffect, useRef } from 'react';
import { 
  Brain, 
  X, 
  Send, 
  Mic, 
  MicOff, 
  Trash2, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight,
  Bot,
  User as UserIcon,
  RefreshCw,
  Coins,
  FileText,
  Bookmark,
  Calendar,
  Search,
  Plus,
  ArrowRight
} from 'lucide-react';
import { Task, ChatMessage, SecondBrainMemory, MemoryCategory } from '../types';
import { querySecondBrainChat } from '../services/secondBrainService';
import { 
  supabaseFetchMemories, 
  supabaseSaveMemory, 
  supabaseDeleteMemory 
} from '../services/supabaseMemories';

interface SecondBrainChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onSelectTask?: (task: Task) => void;
}

const STORAGE_KEY = 'echoloop_second_brain_messages';

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-welcome',
    sender: 'assistant',
    text: `### 👋 Hey there! I'm your **EchoLoop Second Brain**.
EchoLoop's motto is: *"Your second brain that follows through."*

I have dual-ledger memory:
1. **Task Ledger**: Everything you've completed, what slipped, and scheduled tasks.
2. **Long-Term Memory Ledger**: Arbitrary facts, financial debts/loans, notes, and promises.

You can tell me anything to remember:
- *"On Sept 4th I gave 500rs to Rahul"*
- *"Remember my passport is in the top drawer"*

And ask anytime later:
- *"Did someone have to give money to me?"*
- *"What did I do on Aug 3?"*
- *"Which tasks slipped?"*`,
    timestamp: new Date().toISOString(),
  },
];

const SUGGESTIONS = [
  "Did someone have to give money to me?",
  "On Sept 4th I gave 500rs to Alex",
  "What did I do on Aug 3?",
  "Which tasks slipped?",
  "Show all remembered memories",
];

export const SecondBrainChatModal: React.FC<SecondBrainChatModalProps> = ({
  isOpen,
  onClose,
  tasks,
  onSelectTask,
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'memories'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_MESSAGES;
    } catch {
      return INITIAL_MESSAGES;
    }
  });

  const [memories, setMemories] = useState<SecondBrainMemory[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  // Memories tab search & category filter
  const [memorySearch, setMemorySearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | MemoryCategory>('ALL');
  const [newMemoryText, setNewMemoryText] = useState('');
  const [newMemoryCategory, setNewMemoryCategory] = useState<MemoryCategory>('GENERAL');
  const [isAddingMemory, setIsAddingMemory] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Load memories from Supabase / localStorage on mount or open
  useEffect(() => {
    if (isOpen) {
      supabaseFetchMemories().then((loaded) => {
        setMemories(loaded);
      });
    }
  }, [isOpen]);

  // Auto-scroll to bottom of messages in chat tab
  useEffect(() => {
    if (isOpen && activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, activeTab]);

  // Persist messages
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.warn('Could not persist chat history:', e);
    }
  }, [messages]);

  // Focus input when modal opens or tab changes to chat
  useEffect(() => {
    if (isOpen && activeTab === 'chat') {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen, activeTab]);

  // Setup Web Speech API for voice queries
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputValue((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Voice speech recognition is not supported on this browser. Please type your question.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
        setIsListening(false);
      }
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const historyForApi = messages.map((m) => ({
        role: m.sender,
        text: m.text,
      }));

      const result = await querySecondBrainChat({
        message: text,
        history: historyForApi,
        tasks,
        memories,
      });

      let savedMemoryRecord: SecondBrainMemory | undefined;

      // If AI detected a new memory statement, persist it immediately!
      if (result.newMemoryToSave) {
        try {
          savedMemoryRecord = await supabaseSaveMemory({
            content: result.newMemoryToSave.content,
            category: result.newMemoryToSave.category,
            eventDate: result.newMemoryToSave.eventDate,
            entities: result.newMemoryToSave.entities,
            rawText: text,
          });

          // Update local memories list
          setMemories((prev) => [savedMemoryRecord!, ...prev.filter((m) => m.id !== savedMemoryRecord!.id)]);
        } catch (memErr) {
          console.warn('Failed to persist extracted memory:', memErr);
        }
      }

      const assistantMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: result.reply,
        referencedTaskIds: result.referencedTaskIds,
        referencedMemoryIds: result.referencedMemoryIds,
        savedMemory: savedMemoryRecord,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: "I encountered an error recalling your second brain data. Please try asking again in a moment.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    if (window.confirm('Clear your Second Brain conversation history? (Your saved memories will remain safe)')) {
      setMessages(INITIAL_MESSAGES);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    if (window.confirm('Delete this memory from your Second Brain?')) {
      await supabaseDeleteMemory(memoryId);
      setMemories((prev) => prev.filter((m) => m.id !== memoryId));
    }
  };

  const handleCreateManualMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryText.trim()) return;

    try {
      const saved = await supabaseSaveMemory({
        content: newMemoryText.trim(),
        category: newMemoryCategory,
        rawText: newMemoryText.trim(),
      });
      setMemories((prev) => [saved, ...prev]);
      setNewMemoryText('');
      setIsAddingMemory(false);
    } catch (err) {
      console.error('Failed to create manual memory:', err);
    }
  };

  if (!isOpen) return null;

  // Counts
  const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;
  const inProgressCount = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const slippedCount = tasks.filter((t) => t.status === 'SLIPPED').length;

  // Filter memories
  const filteredMemories = memories.filter((m) => {
    if (categoryFilter !== 'ALL' && m.category !== categoryFilter) {
      return false;
    }
    if (memorySearch.trim()) {
      const s = memorySearch.toLowerCase();
      const matchContent = m.content.toLowerCase().includes(s);
      const matchPerson = m.entities?.person?.toLowerCase().includes(s);
      const matchAmount = m.entities?.amount?.toLowerCase().includes(s);
      return matchContent || matchPerson || matchAmount;
    }
    return true;
  });

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="second-brain-chat-modal"
        className="relative w-full max-w-2xl h-[88vh] max-h-[720px] bg-white rounded-3xl shadow-2xl border border-zinc-200/80 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Top Header */}
        <div className="relative px-5 py-3.5 bg-white border-b border-zinc-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 ring-2 ring-indigo-100">
              <Brain className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-900 leading-tight">
                  Second Brain
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Dual-Ledger AI
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Your second brain that follows through.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher Tabs */}
            <div className="flex items-center p-0.5 bg-zinc-100 rounded-xl border border-zinc-200/60 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'chat'
                    ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                💬 Chat
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('memories')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'memories'
                    ? 'bg-white text-indigo-700 shadow-2xs font-semibold'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <span>🧠 Memories</span>
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold">
                  {memories.length}
                </span>
              </button>
            </div>

            {activeTab === 'chat' && (
              <button
                type="button"
                onClick={handleClearChat}
                title="Clear conversation history"
                className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dual-Ledger Status Bar */}
        <div className="px-5 py-2 bg-zinc-50/70 border-b border-zinc-100 flex items-center justify-between text-xs text-zinc-500 shrink-0 overflow-x-auto gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-600 shrink-0">Ledgers:</span>
            <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-md border border-emerald-100 shrink-0">
              <CheckCircle2 className="w-3 h-3" />
              <span>{completedCount} Done</span>
            </div>
            <div className="flex items-center gap-1 text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-100 shrink-0">
              <Clock className="w-3 h-3" />
              <span>{inProgressCount} Active</span>
            </div>
            <div className="flex items-center gap-1 text-amber-700 bg-amber-50/80 px-2 py-0.5 rounded-md border border-amber-100 shrink-0">
              <AlertTriangle className="w-3 h-3" />
              <span>{slippedCount} Slipped</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('memories')}
            className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer shrink-0 hover:underline"
          >
            <span>🧠 {memories.length} Stored Memories</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: CHAT VIEW */}
        {/* ========================================================================= */}
        {activeTab === 'chat' && (
          <>
            {/* Messages Scroll Area */}
            <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 bg-zinc-50/30">
              {messages.map((msg) => {
                const isAi = msg.sender === 'assistant';

                // Find referenced tasks
                const referencedTasks = msg.referencedTaskIds && msg.referencedTaskIds.length > 0
                  ? tasks.filter((t) => msg.referencedTaskIds?.includes(t.id))
                  : [];

                // Find referenced memories
                const referencedMems = msg.referencedMemoryIds && msg.referencedMemoryIds.length > 0
                  ? memories.filter((m) => msg.referencedMemoryIds?.includes(m.id))
                  : [];

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isAi ? 'justify-start' : 'justify-end'}`}
                  >
                    {isAi && (
                      <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5 ring-1 ring-indigo-200">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 shadow-2xs leading-relaxed ${
                        isAi
                          ? 'bg-white border border-zinc-200/80 text-zinc-800'
                          : 'bg-indigo-600 text-white shadow-indigo-600/10'
                      }`}
                    >
                      {/* Message Text formatted simply */}
                      <div className="text-sm whitespace-pre-wrap space-y-1.5">
                        {msg.text.split('\n').map((line, idx) => {
                          if (line.startsWith('### ')) {
                            return <h3 key={idx} className="font-bold text-base mt-2 mb-1 text-zinc-900">{line.replace('### ', '')}</h3>;
                          }
                          if (line.startsWith('#### ')) {
                            return <h4 key={idx} className="font-semibold text-sm mt-2 mb-1 text-zinc-800">{line.replace('#### ', '')}</h4>;
                          }
                          if (line.startsWith('- ')) {
                            return (
                              <div key={idx} className="flex items-start gap-1.5 ml-1">
                                <span className="text-indigo-500 font-bold">•</span>
                                <span>{line.replace('- ', '')}</span>
                              </div>
                            );
                          }
                          return <p key={idx}>{line}</p>;
                        })}
                      </div>

                      {/* Saved Memory Visual Pill */}
                      {msg.savedMemory && (
                        <div className="mt-3 p-2.5 rounded-xl bg-indigo-50/90 border border-indigo-200/80 flex items-start gap-2 text-xs">
                          <span className="text-base leading-none">🧠</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-indigo-900">Saved to Long-Term Memory</span>
                              <span className="px-1.5 py-0.2 rounded-full bg-indigo-200/70 text-indigo-800 text-[10px] font-semibold">
                                {msg.savedMemory.category}
                              </span>
                            </div>
                            <p className="text-indigo-800 mt-0.5 truncate">
                              "{msg.savedMemory.content}"
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Referenced Memories Mini-Cards */}
                      {referencedMems.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-zinc-100 space-y-1.5">
                          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                            <span>🧠 Recalled From Memories:</span>
                          </div>
                          <div className="grid grid-cols-1 gap-1.5">
                            {referencedMems.map((mem) => (
                              <div
                                key={mem.id}
                                onClick={() => setActiveTab('memories')}
                                className="flex items-center justify-between p-2 rounded-xl bg-indigo-50/40 hover:bg-indigo-50 border border-indigo-100 transition-colors cursor-pointer text-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {mem.category === 'FINANCIAL_DEBT' ? (
                                    <Coins className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  ) : (
                                    <Bookmark className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                  )}
                                  <span className="font-medium text-zinc-800 truncate">{mem.content}</span>
                                </div>
                                <span className="text-[10px] text-indigo-600 font-medium shrink-0 ml-2">
                                  View Ledger →
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Referenced Tasks Mini-Cards */}
                      {referencedTasks.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-zinc-100 space-y-1.5">
                          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                            Mentioned Tasks:
                          </div>
                          <div className="grid grid-cols-1 gap-1.5">
                            {referencedTasks.map((task) => (
                              <div
                                key={task.id}
                                onClick={() => onSelectTask && onSelectTask(task)}
                                className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 hover:bg-indigo-50/60 border border-zinc-200/60 transition-colors cursor-pointer text-xs group"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {task.status === 'COMPLETED' ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  ) : task.status === 'SLIPPED' ? (
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  ) : (
                                    <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                  )}
                                  <span className="font-medium text-zinc-800 truncate">{task.title}</span>
                                </div>
                                <span className="text-[10px] text-zinc-400 group-hover:text-indigo-600 flex items-center shrink-0 ml-2">
                                  View <ChevronRight className="w-3 h-3 ml-0.5" />
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div
                        className={`text-[10px] mt-2 ${
                          isAi ? 'text-zinc-400' : 'text-indigo-200 text-right'
                        }`}
                      >
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {!isAi && (
                      <div className="w-8 h-8 rounded-xl bg-zinc-200 text-zinc-600 flex items-center justify-center shrink-0 mt-0.5">
                        <UserIcon className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 ring-1 ring-indigo-200">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-white border border-zinc-200/80 rounded-2xl px-4 py-3 shadow-2xs flex items-center gap-2 text-xs text-zinc-500">
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                    <span>Searching tasks & memory ledgers...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions Carousel */}
            <div className="px-4 py-2 bg-white border-t border-zinc-100 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 shrink-0 pl-1">
                <Sparkles className="w-3 h-3 text-indigo-500" />
                <span>Suggestions:</span>
              </div>
              {SUGGESTIONS.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSendMessage(sug)}
                  disabled={isLoading}
                  className="text-xs bg-zinc-100 hover:bg-indigo-50 hover:text-indigo-700 text-zinc-600 px-3 py-1 rounded-full whitespace-nowrap border border-zinc-200/60 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {sug}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-3 sm:p-4 bg-white border-t border-zinc-100 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2 bg-zinc-100/80 border border-zinc-200/80 rounded-2xl px-3 py-1.5 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all"
              >
                {/* Voice Input Button */}
                <button
                  type="button"
                  onClick={toggleListening}
                  title={isListening ? 'Listening... click to stop' : 'Click to speak your question or memory'}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    isListening
                      ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30'
                      : 'text-zinc-500 hover:text-indigo-600 hover:bg-zinc-200/60'
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <input
                  ref={inputRef}
                  id="second-brain-chat-input"
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  placeholder={
                    isListening 
                      ? 'Listening to your voice...' 
                      : 'Tell me to remember, or ask: "Did someone have to give money to me?", "What did I do on Aug 3?"'
                  }
                  className="flex-1 bg-transparent text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none py-1.5"
                />

                {/* Send Button */}
                <button
                  id="second-brain-send-btn"
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-200 text-white disabled:text-zinc-400 rounded-xl transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed active:scale-95 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
              {isListening && (
                <p className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center justify-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Listening... Speak your question or statement naturally now.
                </p>
              )}
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MEMORIES LEDGER MANAGEMENT VIEW */}
        {/* ========================================================================= */}
        {activeTab === 'memories' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-zinc-50/50">
            {/* Search & Filter Controls */}
            <div className="p-4 bg-white border-b border-zinc-200/70 space-y-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
                  <input
                    type="text"
                    value={memorySearch}
                    onChange={(e) => setMemorySearch(e.target.value)}
                    placeholder="Search memories, debts, people, amounts..."
                    className="w-full pl-9 pr-3 py-1.5 text-sm bg-zinc-100 rounded-xl border border-zinc-200/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingMemory((v) => !v)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Note</span>
                </button>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs">
                {(['ALL', 'FINANCIAL_DEBT', 'NOTE', 'PERSONAL_FACT', 'PROMISE'] as const).map((cat) => {
                  const label =
                    cat === 'ALL'
                      ? `All (${memories.length})`
                      : cat === 'FINANCIAL_DEBT'
                      ? '💰 Debts & Money'
                      : cat === 'NOTE'
                      ? '📝 Notes'
                      : cat === 'PERSONAL_FACT'
                      ? '💡 Facts'
                      : '🎯 Promises';

                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap text-xs font-medium ${
                        categoryFilter === cat
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Quick Add Form Drawer */}
              {isAddingMemory && (
                <form
                  onSubmit={handleCreateManualMemory}
                  className="p-3 bg-indigo-50/60 rounded-2xl border border-indigo-100 space-y-2 animate-in fade-in duration-150"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900">Add New Memory</span>
                    <select
                      value={newMemoryCategory}
                      onChange={(e) => setNewMemoryCategory(e.target.value as MemoryCategory)}
                      className="text-xs bg-white border border-indigo-200 rounded-lg px-2 py-1 text-zinc-700 focus:outline-none"
                    >
                      <option value="FINANCIAL_DEBT">💰 Debt / Loan</option>
                      <option value="NOTE">📝 Note</option>
                      <option value="PERSONAL_FACT">💡 Fact</option>
                      <option value="PROMISE">🎯 Promise</option>
                      <option value="GENERAL">General</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    value={newMemoryText}
                    onChange={(e) => setNewMemoryText(e.target.value)}
                    placeholder="e.g. Rahul owes me ₹500 from lunch on Sept 4th"
                    className="w-full text-xs p-2 bg-white rounded-xl border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingMemory(false)}
                      className="px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!newMemoryText.trim()}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs"
                    >
                      Save Memory
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Memories List */}
            <div className="flex-1 p-4 overflow-y-auto space-y-2.5">
              {filteredMemories.length === 0 ? (
                <div className="text-center py-12 text-zinc-400">
                  <Brain className="w-12 h-12 mx-auto mb-3 opacity-30 text-indigo-500" />
                  <p className="text-sm font-medium text-zinc-600">No memories found</p>
                  <p className="text-xs mt-1">
                    {memories.length === 0
                      ? 'Tell the chat to remember something or click "+ Add Note" above!'
                      : 'No memories match your filter.'}
                  </p>
                </div>
              ) : (
                filteredMemories.map((mem) => {
                  const isDebt = mem.category === 'FINANCIAL_DEBT';
                  const isOwedToMe = mem.entities?.direction === 'OWED_TO_ME';

                  return (
                    <div
                      key={mem.id}
                      className="p-3.5 bg-white rounded-2xl border border-zinc-200/80 shadow-2xs hover:shadow-xs transition-shadow flex items-start justify-between gap-3 group"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            isDebt
                              ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200'
                              : 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200'
                          }`}
                        >
                          {isDebt ? <Coins className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                        </div>

                        <div className="min-w-0 space-y-1">
                          <p className="text-sm font-semibold text-zinc-900 leading-snug">
                            {mem.content}
                          </p>

                          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                            {/* Category Tag */}
                            <span
                              className={`px-2 py-0.5 rounded-md font-semibold ${
                                isDebt
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                              }`}
                            >
                              {mem.category.replace('_', ' ')}
                            </span>

                            {/* Direction pill */}
                            {isDebt && isOwedToMe && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                                Owed to you
                              </span>
                            )}

                            {/* Amount pill */}
                            {mem.entities?.amount && (
                              <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-800 font-bold">
                                {mem.entities.amount}
                              </span>
                            )}

                            {/* Event Date badge */}
                            {mem.eventDate && (
                              <span className="flex items-center gap-1 text-zinc-400">
                                <Calendar className="w-3 h-3 text-zinc-400" />
                                {new Date(mem.eventDate).toLocaleDateString([], {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            )}

                            {/* Stored date */}
                            <span className="text-zinc-400">
                              • Saved {new Date(mem.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteMemory(mem.id)}
                        title="Delete this memory"
                        className="p-1.5 text-zinc-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Switch back to Chat footer */}
            <div className="p-3 bg-white border-t border-zinc-200/70 flex items-center justify-between text-xs text-zinc-500 shrink-0">
              <span>💡 Ask the chat about any of these anytime!</span>
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className="flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                <span>Back to Chat</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
