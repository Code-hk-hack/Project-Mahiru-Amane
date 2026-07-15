"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Send, Activity, MessageSquareWarning, PauseCircle } from "lucide-react";

interface AnalystFeedback {
  passiveness_score: number;
  apology_count: number;
  hesitation_count: number;
  feedback_notes: string;
}

interface Message {
  role: "user" | "coach";
  content: string;
  feedback?: AnalystFeedback;
  emotion?: string;
}

const TypewriterText = ({ text, onComplete }: { text: string, onComplete?: () => void }) => {
  const [displayedText, setDisplayedText] = useState("");
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    setDisplayedText("");
    const safeText = text || "";
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(safeText.substring(0, i + 1));
      i++;
      if (i >= safeText.length) {
        clearInterval(interval);
        if (onCompleteRef.current) onCompleteRef.current();
      }
    }, 20); 
    
    return () => clearInterval(interval);
  }, [text]);

  return <span>{displayedText}</span>;
};

export default function TrainingPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState("");
  
  const [activeCharacter, setActiveCharacter] = useState<"mahiru" | "amane">("mahiru");
  const [currentEmotion, setCurrentEmotion] = useState("waiting");
  
  const chatLogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let storedSessionId = localStorage.getItem("mahiru_session_id");
    if (!storedSessionId) {
      storedSessionId = crypto.randomUUID();
      localStorage.setItem("mahiru_session_id", storedSessionId);
    }
    setSessionId(storedSessionId);

    const fetchHistory = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/chat/history?session_id=${storedSessionId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages);
          }
        }
      } catch (err) {
        console.error("Failed to fetch chat history:", err);
      }
    };
    
    fetchHistory();
  }, []);

  useEffect(() => {
    setCurrentEmotion(activeCharacter === "mahiru" ? "waiting" : "happy");
  }, [activeCharacter]);
  
  const getSpriteFilename = (character: "mahiru" | "amane", emotion: string) => {
    if (emotion === "neutral") {
      emotion = character === "mahiru" ? "waiting" : "happy";
    }
    return `${character}_${emotion}.png`;
  };

  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping || isLoading) return;

    const userMessage = input;
    setInput("");
    
    const newMessages = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          message: userMessage, 
          difficulty: "hard", 
          session_id: sessionId,
          character: activeCharacter
        }),
      });
      
      const data = await response.json();
      
      setMessages(prev => [...prev, {
        role: "coach",
        content: data.coach_response || "...",
        feedback: data.feedback,
        emotion: data.emotion || "neutral"
      }]);
      
      setCurrentEmotion(data.emotion || "neutral");
      setIsTyping(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const latestFeedback = messages.filter(m => m.feedback).pop()?.feedback;
  const currentDialogue = messages.length > 0 && messages[messages.length - 1].role === "coach" 
    ? messages[messages.length - 1] 
    : { role: "coach", content: "..." };

  return (
    <div className="min-h-screen flex flex-col bg-[#000000] text-[#EDEDED] font-sans selection:bg-white/30">
      
      {/* Top Border */}
      <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-6 border-b border-white/10 z-10 relative bg-[#000000]">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-[#A0A0A0] hover:text-white transition-colors flex items-center gap-2 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" />
            Home
          </Link>
          <div className="h-4 w-px bg-white/20" />
          <h1 className="font-semibold text-white tracking-tight">Active Evaluation</h1>
        </div>
        
        {/* Character Selector */}
        <div className="flex bg-[#0A0A0A] border border-white/10 rounded-md overflow-hidden">
          <button 
            className={`px-4 py-1.5 text-sm font-medium transition-colors ${activeCharacter === 'mahiru' ? 'bg-white text-black' : 'text-[#A0A0A0] hover:text-white'}`}
            onClick={() => setActiveCharacter('mahiru')}
          >
            Mahiru
          </button>
          <div className="w-px bg-white/10" />
          <button 
            className={`px-4 py-1.5 text-sm font-medium transition-colors ${activeCharacter === 'amane' ? 'bg-white text-black' : 'text-[#A0A0A0] hover:text-white'}`}
            onClick={() => setActiveCharacter('amane')}
          >
            Amane
          </button>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Main Interface */}
        <div className="flex-1 flex flex-col items-center justify-end pb-12 px-4 relative z-10">
          
          {/* Character Display */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none opacity-80 mix-blend-lighten">
            <AnimatePresence mode="wait">
              <motion.img 
                key={`${activeCharacter}-${currentEmotion}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.5 }}
                src={`/${getSpriteFilename(activeCharacter, currentEmotion)}`} 
                alt="Character" 
                className="max-h-[70vh] object-contain"
                onError={(e) => {
                  const fallback = activeCharacter === "mahiru" ? "mahiru_waiting.png" : "amane_happy.png";
                  if (!e.currentTarget.src.includes(fallback)) {
                    e.currentTarget.src = `/${fallback}`;
                  } else {
                    e.currentTarget.style.display = 'none';
                  }
                }} 
              />
            </AnimatePresence>
          </div>

          {/* Dialogue Box */}
          <div className="w-full max-w-3xl bg-[#0A0A0A]/80 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl relative z-10 overflow-hidden">
            
            {/* Header */}
            <div className="bg-white/5 border-b border-white/10 px-6 py-3 flex items-center justify-between">
               <div className="text-xs font-bold uppercase tracking-widest text-[#A0A0A0]">
                 {currentDialogue.role === "coach" ? (activeCharacter === "mahiru" ? "Mahiru" : "Amane") : "You"}
               </div>
            </div>
            
            {/* Dialogue Text */}
            <div className="p-6 md:p-8 min-h-[120px] text-lg leading-relaxed font-light">
              {currentDialogue.role === "coach" && currentDialogue.content !== "..." ? (
                <TypewriterText 
                  text={currentDialogue.content} 
                  onComplete={() => setIsTyping(false)} 
                />
              ) : (
                <span className="text-[#A0A0A0]">{currentDialogue.content}</span>
              )}
            </div>
            
            {/* Input Area */}
            <div className="p-4 border-t border-white/10 bg-[#000000]/50">
              <div className="flex items-center gap-3">
                <input 
                  type="text" 
                  className="flex-1 bg-transparent border-none outline-none text-[#EDEDED] placeholder-[#A0A0A0] font-light px-2"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type your response..."
                  disabled={isLoading || isTyping}
                />
                <button 
                  className={`p-2 rounded-md transition-colors ${!input.trim() || isLoading || isTyping ? 'text-white/20' : 'bg-white text-black hover:bg-gray-200'}`}
                  onClick={handleSend}
                  disabled={isLoading || isTyping || !input.trim()}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          
        </div>

        {/* Real-time Analyst Panel */}
        <div className="w-80 border-l border-white/10 bg-[#0A0A0A] flex flex-col relative z-10">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-sm font-semibold tracking-tight">Real-Time Analysis</h2>
            <p className="text-xs text-[#A0A0A0] mt-1">Live metrics from your speech patterns.</p>
          </div>
          
          <div className="p-6 space-y-6 flex-1 overflow-y-auto">
            
            <div>
              <div className="flex items-center gap-2 mb-2 text-[#A0A0A0]">
                <Activity className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Passiveness</span>
              </div>
              <div className="text-2xl font-semibold">
                {latestFeedback ? latestFeedback.passiveness_score : 0}<span className="text-[#A0A0A0] text-sm">/10</span>
              </div>
              {latestFeedback && latestFeedback.passiveness_score > 5 && (
                <div className="text-xs text-red-400 mt-1 font-medium">Critical passiveness detected</div>
              )}
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-2 text-[#A0A0A0]">
                <MessageSquareWarning className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Apologies</span>
              </div>
              <div className="text-2xl font-semibold">
                {latestFeedback ? latestFeedback.apology_count : 0}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2 text-[#A0A0A0]">
                <PauseCircle className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Hesitations</span>
              </div>
              <div className="text-2xl font-semibold">
                {latestFeedback ? latestFeedback.hesitation_count : 0}
              </div>
            </div>

            <div className="mt-8">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] mb-3">
                Coach Notes
              </div>
              <div className="text-sm text-[#A0A0A0] leading-relaxed p-4 bg-white/5 rounded-md border border-white/10">
                {latestFeedback ? latestFeedback.feedback_notes : "Awaiting input..."}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
