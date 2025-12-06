import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Message } from '../types';
import { streamChatMessage } from '../services/geminiService';
import { usePersistentData } from '../hooks';

const ChatBot: React.FC = () => {
  // Synced with Supabase table 'messages'
  const [messages, setMessages] = usePersistentData<Message>('chat_history', [
    {
      id: '1',
      role: 'model',
      content: "Hello! I'm your CareerFlow assistant. How can I help with your job search today?",
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const stream = await streamChatMessage(
        messages.map(m => ({ role: m.role, content: m.content })),
        userMsg.content
      );

      let fullResponse = '';
      const responseMsgId = (Date.now() + 1).toString();

      // Add placeholder for streaming response
      setMessages(prev => [...prev, {
        id: responseMsgId,
        role: 'model',
        content: '',
        timestamp: Date.now()
      }]);

      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) {
          fullResponse += text;
          
          setMessages(prev => prev.map(m => 
            m.id === responseMsgId 
              ? { ...m, content: fullResponse } 
              : m
          ));
        }
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        content: "I'm sorry, I encountered an error. Please try again.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    if (confirm('Are you sure you want to clear the chat history?')) {
      setMessages([
        {
          id: Date.now().toString(),
          role: 'model',
          content: "Chat history cleared. How can I help you today?",
          timestamp: Date.now()
        }
      ]);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center">
            <Bot className="w-5 h-5 mr-2 text-emerald-600" />
            Career Assistant
          </h2>
          <p className="text-sm text-slate-500">Powered by Gemini Pro</p>
        </div>
        <button 
          onClick={handleClearChat}
          className="text-slate-400 hover:text-red-500 p-2 rounded-full hover:bg-slate-100 transition-colors"
          title="Clear Chat History"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mx-2 ${
                msg.role === 'user' ? 'bg-emerald-600' : 'bg-green-600'
              }`}>
                {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
              </div>
              <div className={`p-4 rounded-2xl ${
                msg.role === 'user' 
                  ? 'bg-emerald-600 text-white rounded-tr-none' 
                  : 'bg-slate-100 text-slate-800 rounded-tl-none'
              }`}>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
           <div className="flex justify-start">
              <div className="flex flex-row">
                 <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0 mx-2">
                    <Bot className="w-5 h-5 text-white" />
                 </div>
                 <div className="bg-slate-100 p-4 rounded-2xl rounded-tl-none flex items-center">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-500 mr-2" />
                    <span className="text-sm text-slate-500">Thinking...</span>
                 </div>
              </div>
           </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-200 bg-white">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask for interview advice, or help negotiating..."
            className="flex-1 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            className="bg-emerald-600 text-white p-3 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatBot;