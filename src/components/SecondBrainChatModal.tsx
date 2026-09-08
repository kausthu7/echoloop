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
  RefreshCw
} from 'lucide-react';
import { Task, ChatMessage } from '../types';
import { querySecondBrainChat } from '../services/secondBrainService';

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

I keep track of your entire accountability ledger — everything you've completed, what slipped, and what's coming up.

Try asking me:
- **"What did I do on Aug 3?"**
- **"What did I accomplish yesterday?"**
- **"Which tasks slipped or need attention?"**
- **"How is my productivity streak?"**`,
    timestamp: new Date().toISOString(),
  },
];

const SUGGESTIONS = [
  "What did I do on Aug 3?",
  "What did I accomplish yesterday?",
  "Which tasks slipped?",
  "Summary of my current streak",
  "What tasks are pending kickoff?",
];

export const SecondBrainChatModal: React.FC<SecondBrainChatModalProps> = ({
  isOpen,
  onClose,
  tasks,
  onSelectTask,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_MESSAGES;
    } catch {
      return INITIAL_MESSAGES;
    }
  });

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Persist messages
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.warn('Could not persist chat history:', e);
    }
  }, [messages]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

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
      });

      const assistantMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: result.reply,
        referencedTaskIds: result.referencedTaskIds,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: "I encountered an error recalling your tasks. Please try asking again in a moment.",
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
    if (window.confirm('Clear your Second Brain conversation history?')) {
      setMessages(INITIAL_MESSAGES);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  if (!isOpen) return null;

  // Ledger counts
  const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;
  const inProgressCount = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const slippedCount = tasks.filter((t) => t.status === 'SLIPPED').length;

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
        <div className="relative px-5 py-4 bg-white border-b border-zinc-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 ring-2 ring-indigo-100">
              <Brain className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-900 leading-tight">
                  Second Brain AI Chat
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Live Memory
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Your second brain that follows through.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleClearChat}
              title="Clear conversation history"
              className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
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

        {/* Ledger Quick Summary Bar */}
        <div className="px-5 py-2 bg-zinc-50/70 border-b border-zinc-100 flex items-center gap-3 text-xs text-zinc-500 shrink-0 overflow-x-auto">
          <span className="font-semibold text-zinc-600 shrink-0">Ledger Memory:</span>
          <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-md border border-emerald-100 shrink-0">
            <CheckCircle2 className="w-3 h-3" />
            <span>{completedCount} Completed</span>
          </div>
          <div className="flex items-center gap-1.5 text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-100 shrink-0">
            <Clock className="w-3 h-3" />
            <span>{inProgressCount} In Progress</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50/80 px-2 py-0.5 rounded-md border border-amber-100 shrink-0">
            <AlertTriangle className="w-3 h-3" />
            <span>{slippedCount} Slipped</span>
          </div>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 bg-zinc-50/30">
          {messages.map((msg) => {
            const isAi = msg.sender === 'assistant';

            // Find referenced tasks if any
            const referencedTasks = msg.referencedTaskIds && msg.referencedTaskIds.length > 0
              ? tasks.filter((t) => msg.referencedTaskIds?.includes(t.id))
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
                <span>Searching your second brain memory...</span>
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
              title={isListening ? 'Listening... click to stop' : 'Click to speak your question'}
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
              placeholder={isListening ? 'Listening to your voice...' : 'Ask: "What did I do on Aug 3?", "Which tasks slipped?", ...'}
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
              Listening... Speak your question naturally now.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
