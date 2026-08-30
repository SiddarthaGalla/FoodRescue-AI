import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Loader2, User, Building2, Truck, Clock, ShieldCheck } from 'lucide-react';
import { Donation, ChatMessage } from '../../types/donation';
import { apiRequest } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

interface OrderChatDrawerProps {
  donation: Donation;
  onClose: () => void;
  onMessageSent?: (updated: Donation) => void;
}

const ROLE_STYLES: Record<string, { bg: string; text: string; border: string; icon: any }> = {
  donor: { bg: 'bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-500/20', icon: Building2 },
  ngo: { bg: 'bg-indigo-500/10', text: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-500/20', icon: ShieldCheck },
  volunteer: { bg: 'bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-500/20', icon: Truck },
  admin: { bg: 'bg-purple-500/10', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-500/20', icon: User },
};

export const OrderChatDrawer: React.FC<OrderChatDrawerProps> = ({ donation, onClose, onMessageSent }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>(donation.messages || []);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const res = await apiRequest<ChatMessage[]>(`/donations/${donation.id}/messages`);
      if (Array.isArray(res)) {
        setMessages(res);
      }
    } catch (err) {
      // silent polling error
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
  }, [donation.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || sending) return;

    setSending(true);
    try {
      const updated = await apiRequest<Donation>(`/donations/${donation.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      if (!textToSend) setInput('');
      setMessages(updated.messages || []);
      if (onMessageSent) onMessageSent(updated);
    } catch (err: any) {
      showToast(err.message || 'Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  const myRole = user?.role || 'user';
  
  const quickReplies: Record<string, string[]> = {
    donor: [
      'Food packed & ready at kitchen entrance',
      'Please call on arrival for gate entry',
      'Food must be picked up within 45 mins',
    ],
    ngo: [
      'Thank you! Shelter dispatches are ready',
      'Driver is en route to pickup location',
      'Gate code is #4821',
    ],
    volunteer: [
      'I am 5 mins away from pickup location',
      'Surplus food picked up, driving to shelter',
      'Arrived at dropoff location!',
    ],
  };

  const activeQuickReplies = quickReplies[myRole] || quickReplies.donor;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-lg h-full glass-card border-l border-brand-500/30 flex flex-col bg-white/95 dark:bg-gray-900/95 shadow-2xl overflow-hidden"
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-brand-600 via-indigo-600 to-blue-600 text-white space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black truncate max-w-[220px]">
                  Order Chat: {donation.title}
                </h3>
                <p className="text-[10px] text-white/80 font-semibold">
                  Batch #{donation.id.slice(-6).toUpperCase()} • {donation.quantity} Portions
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Active Participants Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-[10px] font-bold pt-1">
            <span className="px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md flex items-center gap-1.5 whitespace-nowrap">
              <Building2 className="w-3 h-3 text-emerald-300" />
              <span>Donor: {donation.donorName || 'Donor'}</span>
            </span>
            {donation.claimedByName && (
              <span className="px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md flex items-center gap-1.5 whitespace-nowrap">
                <ShieldCheck className="w-3 h-3 text-purple-300" />
                <span>NGO: {donation.claimedByName}</span>
              </span>
            )}
            {donation.assignedVolunteerName && (
              <span className="px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md flex items-center gap-1.5 whitespace-nowrap">
                <Truck className="w-3 h-3 text-blue-300" />
                <span>Driver: {donation.assignedVolunteerName}</span>
              </span>
            )}
          </div>
        </div>

        {/* Message Thread Scroll Area */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
          {messages.length === 0 ? (
            <div className="py-12 text-center space-y-2 text-gray-500 dark:text-gray-400">
              <MessageSquare className="w-8 h-8 mx-auto text-brand-500/40" />
              <p className="font-bold text-sm">No messages in order chat yet</p>
              <p className="text-[11px] max-w-xs mx-auto">
                Send a message to coordinate pickup timing, gate codes, or packaging instructions!
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.senderId === user?.id;
              const roleStyle = ROLE_STYLES[m.senderRole] || ROLE_STYLES.donor;
              const RoleIcon = roleStyle.icon;

              return (
                <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {/* Sender Metadata */}
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px]">
                    <span className={`px-2 py-0.5 rounded-full font-extrabold uppercase flex items-center gap-1 border ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}>
                      <RoleIcon className="w-2.5 h-2.5" />
                      {m.senderRole}
                    </span>
                    <span className="font-bold text-gray-700 dark:text-gray-300">{m.senderName}</span>
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl whitespace-pre-wrap leading-relaxed shadow-sm ${
                      isMe
                        ? 'bg-brand-600 text-white rounded-tr-none font-medium'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-none border border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    {m.text}
                  </div>

                  <span className="text-[9px] text-gray-400 font-bold mt-1 px-1 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Reply Action Chips */}
        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/60 border-t border-gray-200 dark:border-gray-800 overflow-x-auto flex gap-1.5 shrink-0">
          {activeQuickReplies.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(chip)}
              disabled={sending}
              className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-brand-500/10 text-brand-700 dark:text-brand-300 hover:bg-brand-500/20 border border-brand-500/20 whitespace-nowrap shrink-0 transition-all"
            >
              💬 {chip}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3.5 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message to donor, NGO, or driver..."
            className="flex-1 px-4 py-3 rounded-xl glass-input text-xs"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="px-4 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold disabled:opacity-40 shadow-glow flex items-center justify-center gap-1.5 transition-all"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </motion.div>
    </div>
  );
};
