import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Sparkles, Loader2, MessageSquare, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../../services/api';

interface AIAssistantModalProps {
  role: 'donor' | 'ngo' | 'volunteer' | 'admin';
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

const ROLE_SUGGESTIONS: Record<string, string[]> = {
  donor: [
    'What type of food can I donate?',
    'How do I package hot cooked meals safely?',
    'How do tax deduction certificates work?',
    'What is the recommended expiry window?',
  ],
  ngo: [
    'How does distance priority sorting work?',
    'What happens when I accept a donation?',
    'How do I restore hidden rejected items?',
  ],
  volunteer: [
    'How does multi-stop route optimization work?',
    'How are driver payouts calculated?',
    'How does live GPS tracking work for NGOs?',
  ],
  admin: [
    'How is tax valuation calculated?',
    'What are the food rescue success metrics?',
    'How do I handle support tickets?',
  ],
};

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({ role }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `Hello! I am **RescueAI**, your assistant for **${role.toUpperCase()}** operations. 🥑\n\nAsk me anything about surplus food posting, shelter claiming, volunteer routing, or food safety guidelines!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const history = messages.slice(-6).map((m) => ({ sender: m.sender, text: m.text }));
      const res = await apiRequest<{ reply: string; source: string }>('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: query,
          role,
          history,
        }),
      });

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: "I am having trouble connecting right now, but I can answer any FoodRescue AI questions! Please try again shortly.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = ROLE_SUGGESTIONS[role] || ROLE_SUGGESTIONS.donor;

  return (
    <>
      {/* Floating Action Launcher Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-full bg-gradient-to-r from-brand-600 via-emerald-600 to-blue-600 text-white shadow-2xl flex items-center gap-2.5 font-extrabold text-xs border border-white/20 hover:shadow-glow transition-all"
      >
        <div className="relative">
          <Bot className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
        </div>
        <span className="hidden sm:inline">RescueAI Assistant</span>
      </motion.button>

      {/* Floating Chat Modal / Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] max-h-[600px] h-[75vh] flex flex-col rounded-3xl glass-card border border-brand-500/30 shadow-2xl overflow-hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl"
          >
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-brand-600 to-emerald-600 text-white flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-black flex items-center gap-1.5">
                    RescueAI Assistant
                    <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full bg-white/20">
                      {role}
                    </span>
                  </h3>
                  <p className="text-[10px] text-white/80 font-medium">
                    Domain-Restricted Food Rescue & Safety Guide
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Domain Enforcement Alert Banner */}
            <div className="px-4 py-2 bg-amber-500/10 dark:bg-amber-500/20 border-b border-amber-500/20 flex items-center gap-2 text-[10px] text-amber-800 dark:text-amber-300 font-bold">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              <span>RescueAI strictly answers FoodRescue & Food Safety topics.</span>
            </div>

            {/* Chat History Messages Scroll Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
              {messages.map((m) => {
                const isAI = m.sender === 'ai';
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isAI ? 'items-start' : 'items-end'}`}
                  >
                    <div
                      className={`max-w-[85%] p-3.5 rounded-2xl whitespace-pre-wrap leading-relaxed ${
                        isAI
                          ? 'bg-brand-500/10 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-brand-500/15 rounded-tl-none'
                          : 'bg-brand-600 text-white shadow-md rounded-tr-none font-medium'
                      }`}
                    >
                      {m.text}
                    </div>
                    <span className="text-[9px] text-gray-400 font-bold mt-1 px-1">
                      {m.timestamp}
                    </span>
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-brand-500/10 text-brand-700 dark:text-brand-300 w-fit text-xs font-bold animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
                  <span>RescueAI is thinking...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Chips */}
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800 overflow-x-auto flex gap-1.5 shrink-0">
              {suggestions.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(chip)}
                  disabled={loading}
                  className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-brand-500/10 text-brand-700 dark:text-brand-300 hover:bg-brand-500/20 border border-brand-500/20 whitespace-nowrap shrink-0 transition-all"
                >
                  💡 {chip}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about food rescue, safety, or routes..."
                className="flex-1 px-3.5 py-2.5 rounded-xl glass-input text-xs"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="p-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold disabled:opacity-40 transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
