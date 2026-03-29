import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, Loader2, User } from 'lucide-react';
import { getChatResponse } from '../services/geminiService';
import { Expense } from '../types';

interface AIChatAssistantProps {
  expenses: Expense[];
}

export default function AIChatAssistant({ expenses }: AIChatAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<{ role: 'user' | 'bot', text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || loading) return;

    const userMsg = message;
    setMessage('');
    setHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const context = `User has ${expenses.length} expenses. Total spend: ${expenses.reduce((s, e) => s + e.convertedAmount, 0)}. Recent expenses: ${expenses.slice(0, 5).map(e => `${e.category}: ${e.amount} ${e.currency} on ${e.date}`).join(', ')}`;
      const response = await getChatResponse(history, userMsg, context);
      setHistory(prev => [...prev, { role: 'bot', text: response || "I'm sorry, I couldn't process that." }]);
    } catch (error) {
      console.error('Chat error:', error);
      setHistory(prev => [...prev, { role: 'bot', text: "Error connecting to AI assistant." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-[100]">
      {isOpen ? (
        <div className="bg-white w-96 h-[500px] rounded-3xl shadow-2xl border border-neutral-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="p-4 bg-orange-600 text-white flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <span className="font-bold">Odoo AI Assistant</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-orange-700 p-1 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50/50">
            <div className="flex gap-2">
              <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-neutral-100 shadow-sm text-sm text-neutral-700">
                Hi! I'm your AI expense assistant. Ask me anything about your claims or spending trends.
              </div>
            </div>

            {history.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-neutral-200 text-neutral-600' : 'bg-orange-100 text-orange-600'}`}>
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`p-3 rounded-2xl text-sm shadow-sm border ${msg.role === 'user' ? 'bg-orange-600 text-white border-orange-500 rounded-tr-none' : 'bg-white text-neutral-700 border-neutral-100 rounded-tl-none'}`}>
                  {msg.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2">
                <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-neutral-100 shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="p-4 border-t border-neutral-100 bg-white flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask about your expenses..."
              className="flex-1 px-4 py-2 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            />
            <button
              type="submit"
              disabled={loading || !message.trim()}
              className="bg-orange-600 text-white p-2 rounded-xl hover:bg-orange-700 transition-all disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-orange-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all animate-bounce"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
