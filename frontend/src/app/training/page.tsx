"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Send, Activity, MessageSquareWarning, PauseCircle, Mic, RotateCcw } from "lucide-react";

const SUPPORTED_LANGUAGES = [
  { code: "en-IN", name: "English" },
  { code: "hi-IN", name: "Hindi" },
  { code: "ta-IN", name: "Tamil" },
  { code: "te-IN", name: "Telugu" },
  { code: "kn-IN", name: "Kannada" },
  { code: "ml-IN", name: "Malayalam" },
  { code: "mr-IN", name: "Marathi" },
  { code: "gu-IN", name: "Gujarati" },
  { code: "bn-IN", name: "Bengali" },
  { code: "pa-IN", name: "Punjabi" },
];

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
    }, 45); 
    
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
  const [isRecording, setIsRecording] = useState(false);
  const [sessionId, setSessionId] = useState("");
  
  const [activeCharacter, setActiveCharacter] = useState<"mahiru" | "amane">("mahiru");
  const [activeLanguage, setActiveLanguage] = useState("en-IN");
  const [currentEmotion, setCurrentEmotion] = useState("waiting");
  
  const chatLogRef = useRef<HTMLDivElement>(null);
  
  // WebSocket and Audio refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const recordingAudioCtxRef = useRef<AudioContext | null>(null);
  const isRecordingRef = useRef(false);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (audioCtxRef.current) audioCtxRef.current.close();
      if (recordingAudioCtxRef.current) recordingAudioCtxRef.current.close();
      if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  useEffect(() => {
    const key = `${activeCharacter}_session_id`;
    let storedSessionId = localStorage.getItem(key);
    if (!storedSessionId) {
      storedSessionId = crypto.randomUUID();
      localStorage.setItem(key, storedSessionId);
    }
    setSessionId(storedSessionId);

    // Clear current messages when switching character
    setMessages([]);

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

    // Force WS reconnect with new character parameters
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, [activeCharacter]);

  // Force WS reconnect when language changes
  useEffect(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, [activeLanguage]);

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

  const connectWebSocket = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return wsRef.current;
    
    const ws = new WebSocket(`ws://localhost:8000/ws/voice-chat?session_id=${sessionId}&character=${activeCharacter}&difficulty=hard&language=${activeLanguage}`);
    wsRef.current = ws;
    
    ws.onmessage = async (event) => {
      if (event.data instanceof Blob) {
        // Binary audio chunk (TTS)
        const arrayBuffer = await event.data.arrayBuffer();
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
          nextStartTimeRef.current = audioCtxRef.current.currentTime;
        }
        
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') await ctx.resume();
        
        let buffer = arrayBuffer;
        
        // Strip WAV header if present (44 bytes starting with "RIFF")
        if (buffer.byteLength >= 44) {
          const view = new DataView(buffer);
          if (view.getUint32(0, false) === 0x52494646) { // "RIFF"
            buffer = buffer.slice(44);
          }
        }
        
        if (buffer.byteLength % 2 !== 0) {
          buffer = buffer.slice(0, buffer.byteLength - 1);
        }
        
        const int16 = new Int16Array(buffer);
        const float32 = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) {
          float32[i] = int16[i] / 0x8000;
        }
        
        const audioBuffer = ctx.createBuffer(1, float32.length, 16000);
        audioBuffer.getChannelData(0).set(float32);
        
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        
        // Slow down speech slightly for a more relaxed and understandable coach voice
        const playbackSpeed = 0.90;
        source.playbackRate.value = playbackSpeed;
        
        source.connect(ctx.destination);
        
        const startTime = Math.max(ctx.currentTime, nextStartTimeRef.current);
        source.start(startTime);
        
        // Adjust the next start time accounting for the slowed playback rate
        nextStartTimeRef.current = startTime + (audioBuffer.duration / playbackSpeed);
      } else {
        // Text message
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'transcript') {
            setMessages(prev => [...prev, { role: "user", content: data.text }]);
            setMessages(prev => [...prev, { role: "coach", content: "", emotion: "neutral" }]);
            setIsTyping(true);
          } else if (data.type === 'feedback') {
            setMessages(prev => {
              const newMsgs = [...prev];
              const userIdx = newMsgs.map(m => m.role).lastIndexOf("user");
              if (userIdx >= 0) newMsgs[userIdx].feedback = data.feedback;
              return newMsgs;
            });
          } else if (data.type === 'chunk') {
            setMessages(prev => {
              const newMsgs = [...prev];
              const lastIdx = newMsgs.length - 1;
              newMsgs[lastIdx] = { ...newMsgs[lastIdx], content: newMsgs[lastIdx].content + data.content };
              return newMsgs;
            });
          } else if (data.type === 'emotion' || data.type === 'done') {
            setCurrentEmotion(data.emotion);
            setMessages(prev => {
              const newMsgs = [...prev];
              newMsgs[newMsgs.length - 1].emotion = data.emotion;
              return newMsgs;
            });
          } else if (data.type === 'turn_complete') {
            setIsLoading(false);
          }
        } catch (e) {
          console.error("Failed to parse WS message", e);
        }
      }
    };
    
    return ws;
  };

  const handleStartRecording = async () => {
    if (isLoading || isTyping) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setIsRecording(true);
      isRecordingRef.current = true;
      setIsLoading(true); // Prevent text sending while recording
      
      const ws = connectWebSocket();
      // Wait for WS to open if not already
      if (ws.readyState !== WebSocket.OPEN) {
        await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
      }
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      recordingAudioCtxRef.current = audioCtx;
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      
      scriptProcessorRef.current = processor;
      
      processor.onaudioprocess = (e) => {
        if (!isRecordingRef.current) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(pcmData.buffer);
        }
      };
      
      source.connect(processor);
      processor.connect(audioCtx.destination);
    } catch (e) {
      console.error("Failed to access microphone", e);
      setIsLoading(false);
      setIsRecording(false);
    }
  };

  const handleStopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);
    isRecordingRef.current = false;
    
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (recordingAudioCtxRef.current) {
      recordingAudioCtxRef.current.close();
      recordingAudioCtxRef.current = null;
    }
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "stop_speaking" }));
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || isTyping || isRecording) return;
    
    const userText = input.trim();
    setInput("");
    setIsLoading(true);
    
    // Add user message to UI immediately
    setMessages(prev => [...prev, { role: "user", content: userText }]);
    
    // Add empty coach message to be filled
    setMessages(prev => [...prev, { role: "coach", content: "", emotion: "neutral" }]);
    setIsTyping(true);

    try {
      const res = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          difficulty: "hard",
          session_id: sessionId,
          character: activeCharacter,
          language: activeLanguage
        }),
      });

      if (!res.body) throw new Error("No response body");
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === 'feedback') {
              setMessages(prev => {
                const newMsgs = [...prev];
                const userIdx = newMsgs.map(m => m.role).lastIndexOf("user");
                if (userIdx >= 0) newMsgs[userIdx].feedback = data.feedback;
                return newMsgs;
              });
            } else if (data.type === 'chunk') {
              setMessages(prev => {
                const newMsgs = [...prev];
                const lastIdx = newMsgs.length - 1;
                newMsgs[lastIdx] = { ...newMsgs[lastIdx], content: newMsgs[lastIdx].content + data.content };
                return newMsgs;
              });
            } else if (data.type === 'emotion' || data.type === 'done') {
              setCurrentEmotion(data.emotion);
              setMessages(prev => {
                const newMsgs = [...prev];
                newMsgs[newMsgs.length - 1].emotion = data.emotion;
                return newMsgs;
              });
            }
          }
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewSession = () => {
    const newSessionId = crypto.randomUUID();
    const key = `${activeCharacter}_session_id`;
    localStorage.setItem(key, newSessionId);
    setSessionId(newSessionId);
    setMessages([]);
    setCurrentEmotion("waiting");
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const latestFeedback = messages.filter(m => m.feedback).pop()?.feedback;
  const currentDialogue = messages.length > 0 && messages[messages.length - 1].role === "coach" 
    ? messages[messages.length - 1] 
    : { role: "coach", content: "..." };

  return (
    <div suppressHydrationWarning className="min-h-screen flex flex-col bg-[var(--surface-lowest)] text-[var(--text-primary)] overflow-hidden selection:bg-[var(--primary-color)] selection:text-white relative">
      
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
          <div className="h-5 w-px bg-[var(--primary-color)]/20 ml-4" />
          <button 
            onClick={handleNewSession}
            className="flex items-center gap-2 text-sm font-semibold px-4 py-1.5 rounded-full bg-white border border-[var(--primary-color)]/20 text-[var(--text-secondary)] hover:text-[var(--primary-color)] hover:border-[var(--primary-color)] hover:shadow-md transition-all ml-2"
          >
            <RotateCcw className="w-4 h-4" />
            New Session
          </button>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Language Selector */}
          <select 
            suppressHydrationWarning
            value={activeLanguage}
            onChange={(e) => setActiveLanguage(e.target.value)}
            className="bg-white border border-[var(--primary-color)]/20 text-[var(--text-secondary)] text-sm font-semibold rounded-full px-4 py-2 outline-none focus:border-[var(--primary-color)] transition-colors shadow-sm cursor-pointer"
          >
            {SUPPORTED_LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>

          {/* Character Selector */}
          <div className="flex bg-white border border-[var(--primary-color)]/20 rounded-full overflow-hidden shadow-sm p-1">
            <button 
              suppressHydrationWarning
              className={`px-6 py-1.5 text-sm font-bold rounded-full transition-all duration-300 ${activeCharacter === 'mahiru' ? 'bg-[var(--primary-color)] text-white shadow-md' : 'text-[var(--text-secondary)] hover:text-[var(--primary-color)] hover:bg-[var(--primary-color)]/5'}`}
              onClick={() => setActiveCharacter('mahiru')}
            >
              Mahiru
            </button>
            <button 
              suppressHydrationWarning
              className={`px-6 py-1.5 text-sm font-bold rounded-full transition-all duration-300 ${activeCharacter === 'amane' ? 'bg-[#8CA899] text-white shadow-md' : 'text-[var(--text-secondary)] hover:text-[#8CA899] hover:bg-[#8CA899]/5'}`}
              onClick={() => setActiveCharacter('amane')}
            >
              Amane
            </button>
          </div>
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
                  text={currentDialogue.content.replace(/<\s*emotion\s*>.*?<\s*\/\s*emotion\s*>/gi, '').replace(/<\s*(?!emotion\b)[a-z_]+\s*>/gi, '').trim()} 
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
                  suppressHydrationWarning
                  type="text" 
                  className="flex-1 bg-transparent border-none outline-none text-[var(--text-primary)] placeholder-[var(--text-secondary)] font-medium px-4 py-2"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Respond carefully..."
                  disabled={isLoading || isTyping || isRecording}
                />
                
                <button 
                  suppressHydrationWarning
                  className={`p-3 rounded-full transition-all duration-300 shadow-sm ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]' : isLoading || isTyping ? 'bg-[var(--surface-low)] text-[var(--text-secondary)] opacity-50' : 'bg-gradient-to-r from-[#D4AF37] to-[#B5952F] text-white hover:shadow-[0_4px_15px_rgba(212,175,55,0.4)] hover:-translate-y-0.5'}`}
                  onMouseDown={handleStartRecording}
                  onMouseUp={handleStopRecording}
                  onMouseLeave={handleStopRecording}
                  disabled={isLoading && !isRecording}
                  title="Hold to Speak"
                >
                  <Mic className="w-5 h-5" />
                </button>

                <button 
                  suppressHydrationWarning
                  className={`p-3 rounded-full transition-all duration-300 shadow-sm ${!input.trim() || isLoading || isTyping ? 'bg-[var(--surface-low)] text-[var(--text-secondary)] opacity-50' : 'bg-[var(--primary-color)] text-white hover:bg-[#B5952F] hover:shadow-[0_4px_15px_rgba(212,175,55,0.3)] hover:-translate-y-0.5'}`}
                  onClick={handleSend}
                  disabled={isLoading || isTyping || !input.trim() || isRecording}
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
