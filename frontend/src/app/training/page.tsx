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

// Continuous floating particles component
const FloatingDust = () => {
  const [particles, setParticles] = useState<Array<{ id: number; left: string; delay: string; duration: string; size: string }>>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      duration: `${10 + Math.random() * 15}s`,
      size: `${Math.random() * 4 + 2}px`
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 mix-blend-overlay">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute bottom-0 bg-[var(--primary-color)] rounded-full blur-[1px]"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            animation: `float ${p.duration} linear ${p.delay} infinite`,
            opacity: 0,
            boxShadow: `0 0 10px var(--primary-color)`
          }}
        />
      ))}
    </div>
  );
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
      
      if (!response.body) return;
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let currentResponse = "";
      let currentFeedback: any = undefined;
      let currentEmotion = "neutral";
      
      setMessages(prev => [...prev, {
        role: "coach",
        content: "",
        emotion: "neutral"
      }]);
      setIsTyping(true);
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'feedback') {
                currentFeedback = data.feedback;
                setMessages(prev => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1].feedback = currentFeedback;
                  return newMsgs;
                });
              } else if (data.type === 'chunk') {
                currentResponse += data.content;
                setMessages(prev => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1].content = currentResponse;
                  return newMsgs;
                });
              } else if (data.type === 'done') {
                currentEmotion = data.emotion;
                setMessages(prev => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1].emotion = currentEmotion;
                  return newMsgs;
                });
                setCurrentEmotion(currentEmotion);
              } else if (data.type === 'error') {
                console.error("Stream error:", data.content);
              }
            } catch (e) {
              // Ignore incomplete JSON chunks from partial splits
            }
          }
        }
      }
      
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
    <div className="min-h-screen flex flex-col bg-[var(--surface-lowest)] text-[var(--text-primary)] overflow-hidden selection:bg-[var(--primary-color)] selection:text-white relative">
      
      <FloatingDust />

      {/* Top Border */}
      <div className="w-full h-[3px] bg-gradient-to-r from-transparent via-[var(--primary-color)] to-transparent opacity-40 z-20 relative" />

      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-6 border-b border-[var(--primary-color)]/10 bg-white/60 backdrop-blur-md z-20 relative shadow-sm">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-[var(--text-secondary)] hover:text-[var(--primary-color)] transition-colors flex items-center gap-2 text-sm font-semibold">
            <ArrowLeft className="w-4 h-4" />
            Return Home
          </Link>
          <div className="h-5 w-px bg-[var(--primary-color)]/20" />
          <h1 className="font-[family-name:var(--font-playfair)] font-bold text-xl tracking-wide text-[var(--text-primary)]">Active Evaluation</h1>
        </div>
        
        {/* Character Selector */}
        <div className="flex bg-white border border-[var(--primary-color)]/20 rounded-full overflow-hidden shadow-sm p-1">
          <button 
            className={`px-6 py-1.5 text-sm font-bold rounded-full transition-all duration-300 ${activeCharacter === 'mahiru' ? 'bg-[var(--primary-color)] text-white shadow-md' : 'text-[var(--text-secondary)] hover:text-[var(--primary-color)] hover:bg-[var(--primary-color)]/5'}`}
            onClick={() => setActiveCharacter('mahiru')}
          >
            Mahiru
          </button>
          <button 
            className={`px-6 py-1.5 text-sm font-bold rounded-full transition-all duration-300 ${activeCharacter === 'amane' ? 'bg-[#8CA899] text-white shadow-md' : 'text-[var(--text-secondary)] hover:text-[#8CA899] hover:bg-[#8CA899]/5'}`}
            onClick={() => setActiveCharacter('amane')}
          >
            Amane
          </button>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden relative z-10">
        
        {/* Main Interface */}
        <div className="flex-1 flex flex-col items-center justify-end pb-12 px-4 relative z-10">
          
          {/* Character Display */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none opacity-90 drop-shadow-2xl">
            <AnimatePresence mode="wait">
              <motion.img 
                key={`${activeCharacter}-${currentEmotion}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                src={`/${getSpriteFilename(activeCharacter, currentEmotion)}`} 
                alt="Character" 
                className="max-h-[75vh] object-contain"
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
          <div className="w-full max-w-3xl bg-white/80 backdrop-blur-xl border border-[var(--primary-color)]/20 rounded-3xl shadow-[0_8px_30px_rgba(212,175,55,0.15)] relative z-10 overflow-visible">
            
            {/* Floating Name Tag */}
            <div className={`absolute -top-5 left-8 px-6 py-1.5 rounded-full text-sm font-bold tracking-widest text-white shadow-md ${currentDialogue.role === "coach" ? (activeCharacter === "mahiru" ? 'bg-[var(--secondary-color)]' : 'bg-[var(--tertiary-color)]') : 'bg-[var(--text-secondary)]'}`}>
              {currentDialogue.role === "coach" ? (activeCharacter === "mahiru" ? "MAHIRU" : "AMANE") : "YOU"}
            </div>
            
            {/* Dialogue Text */}
            <div className="p-8 pt-10 min-h-[140px] text-[1.1rem] leading-relaxed font-medium text-[var(--text-primary)]">
              {currentDialogue.role === "coach" && currentDialogue.content !== "..." ? (
                <TypewriterText 
                  text={currentDialogue.content} 
                  onComplete={() => setIsTyping(false)} 
                />
              ) : (
                <span className="text-[var(--text-secondary)] opacity-70">{currentDialogue.content}</span>
              )}
            </div>
            
            {/* Input Area */}
            <div className="p-4 border-t border-[var(--primary-color)]/10 bg-white/50 rounded-b-3xl">
              <div className="flex items-center gap-3">
                <input 
                  type="text" 
                  className="flex-1 bg-transparent border-none outline-none text-[var(--text-primary)] placeholder-[var(--text-secondary)] font-medium px-4 py-2"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Respond carefully..."
                  disabled={isLoading || isTyping}
                />
                <button 
                  className={`p-3 rounded-full transition-all duration-300 shadow-sm ${!input.trim() || isLoading || isTyping ? 'bg-[var(--surface-low)] text-[var(--text-secondary)] opacity-50' : 'bg-[var(--primary-color)] text-white hover:bg-[#B5952F] hover:shadow-[0_4px_15px_rgba(212,175,55,0.3)] hover:-translate-y-0.5'}`}
                  onClick={handleSend}
                  disabled={isLoading || isTyping || !input.trim()}
                >
                  <Send className="w-5 h-5 ml-1 mt-0.5" />
                </button>
              </div>
            </div>
          </div>
          
        </div>

        {/* Real-time Analyst Panel */}
        <div className="w-80 border-l border-[var(--primary-color)]/10 bg-white/70 backdrop-blur-md flex flex-col relative z-10 shadow-[-4px_0_20px_rgba(212,175,55,0.05)]">
          <div className="p-6 border-b border-[var(--primary-color)]/10 bg-gradient-to-b from-[var(--surface-low)]/50 to-transparent">
            <h2 className="text-lg font-[family-name:var(--font-playfair)] font-bold text-[var(--text-primary)] tracking-wide">Live Analysis</h2>
            <p className="text-xs text-[var(--text-secondary)] font-medium mt-1">Evaluating communication clarity.</p>
          </div>
          
          <div className="p-6 space-y-8 flex-1 overflow-y-auto">
            
            <div className="bg-white p-5 rounded-2xl border border-[var(--primary-color)]/10 shadow-sm">
              <div className="flex items-center gap-2 mb-3 text-[var(--primary-color)]">
                <Activity className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Passiveness</span>
              </div>
              <div className="text-3xl font-[family-name:var(--font-playfair)] font-bold text-[var(--text-primary)]">
                {latestFeedback ? latestFeedback.passiveness_score : 0}<span className="text-[var(--text-secondary)] text-lg">/10</span>
              </div>
              {latestFeedback && latestFeedback.passiveness_score > 5 && (
                <div className="text-xs text-[#D98A94] mt-2 font-bold bg-[#D98A94]/10 px-3 py-1.5 rounded-md inline-block">Correction required</div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-[var(--primary-color)]/10 shadow-sm">
                <div className="flex flex-col gap-1 mb-2 text-[var(--primary-color)]">
                  <MessageSquareWarning className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Apologies</span>
                </div>
                <div className="text-2xl font-[family-name:var(--font-playfair)] font-bold text-[var(--text-primary)]">
                  {latestFeedback ? latestFeedback.apology_count : 0}
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-[var(--primary-color)]/10 shadow-sm">
                <div className="flex flex-col gap-1 mb-2 text-[var(--primary-color)]">
                  <PauseCircle className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Hesitations</span>
                </div>
                <div className="text-2xl font-[family-name:var(--font-playfair)] font-bold text-[var(--text-primary)]">
                  {latestFeedback ? latestFeedback.hesitation_count : 0}
                </div>
              </div>
            </div>

            <div className="mt-8">
              <div className="text-xs font-bold uppercase tracking-widest text-[var(--primary-color)] mb-3 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary-color)]" />
                Coach Notes
              </div>
              <div className="text-sm text-[var(--text-secondary)] font-medium leading-relaxed p-5 bg-[var(--surface-low)] rounded-2xl border border-[var(--primary-color)]/10 shadow-inner">
                {latestFeedback ? latestFeedback.feedback_notes : "Awaiting your first interaction..."}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
