"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import anime from "animejs";

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
    }, 25); 
    
    return () => clearInterval(interval);
  }, [text]);

  return <span>{displayedText}</span>;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState("");
  // Emotion state moved to after activeCharacter
  
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
  
  // Support for both characters
  const [activeCharacter, setActiveCharacter] = useState<"mahiru" | "amane">("mahiru");
  const [currentEmotion, setCurrentEmotion] = useState("waiting");
  
  // When active character changes, reset emotion to their default
  useEffect(() => {
    setCurrentEmotion(activeCharacter === "mahiru" ? "waiting" : "impressed");
  }, [activeCharacter]);
  
  const getSpriteFilename = (character: "mahiru" | "amane", emotion: string) => {
    // The backend now outputs the exact image filename based on the available files
    // If the emotion is still 'neutral' from an old chat, map it to the defaults
    if (emotion === "neutral") {
      emotion = character === "mahiru" ? "waiting" : "impressed";
    }
    return `${character}_${emotion}.png`;
  };
  
  const spriteRef = useRef(null);
  const chatLogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (spriteRef.current) {
      anime({
        targets: spriteRef.current,
        translateY: [10, -10],
        direction: 'alternate',
        loop: true,
        easing: 'easeInOutSine',
        duration: 3500
      });
    }
  }, []);

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
      
      if (spriteRef.current) {
        anime({
          targets: spriteRef.current,
          scale: [1, 1.05, 1],
          duration: 400,
          easing: 'easeOutQuad'
        });
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
    <div className="vn-container">
      <div className="bg-vignette" />
      
      {/* Character Selector HUD */}
      <div className="character-selector">
        <button 
          className={`char-btn mahiru ${activeCharacter === 'mahiru' ? 'active' : ''}`}
          onClick={() => setActiveCharacter('mahiru')}
        >
          Mahiru
        </button>
        <button 
          className={`char-btn amane ${activeCharacter === 'amane' ? 'active' : ''}`}
          onClick={() => setActiveCharacter('amane')}
        >
          Amane
        </button>
      </div>

      <div className="character-display">
        <motion.div 
          key={activeCharacter} // Re-animate when character switches
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div ref={spriteRef} className="character-sprite">
            <img src={`/${getSpriteFilename(activeCharacter, currentEmotion)}`} alt={`${activeCharacter} ${currentEmotion}`} className="character-image" 
              onError={(e) => {
                // Fallback to neutral if specific emotion doesn't exist
                const fallback = activeCharacter === "mahiru" ? "mahiru_waiting.png" : "amane_impressed.png";
                if (!e.currentTarget.src.includes(fallback)) {
                  e.currentTarget.src = `/${fallback}`;
                } else {
                  e.currentTarget.style.display = 'none';
                }
              }} 
            />
          </div>
        </motion.div>
      </div>

      <div className="ui-layer">
        
        <div className="dialogue-wrapper">
          
          {/* Chat History Log */}
          {messages.length > 1 && (
            <div className="chat-log" ref={chatLogRef}>
              {messages.slice(0, -1).map((msg, i) => (
                <div key={i} className={`log-entry ${msg.role} ${msg.role === 'coach' ? activeCharacter : ''}`}>
                  <div className={`log-name ${msg.role} ${msg.role === 'coach' ? activeCharacter : ''}`}>
                    {msg.role === 'coach' ? (activeCharacter === 'mahiru' ? 'Mahiru' : 'Amane') : 'You'}
                  </div>
                  <div>{msg.content}</div>
                </div>
              ))}
            </div>
          )}

          {/* Floating Name Tag */}
          <div className={`name-tag ${currentDialogue.role === "coach" ? activeCharacter : "user"}`}>
            {currentDialogue.role === "coach" ? (activeCharacter === "mahiru" ? "Mahiru" : "Amane") : "You"}
          </div>
          
          <motion.div 
            className={`dialogue-box ${activeCharacter}`}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <div className="dialogue-text">
              {currentDialogue.role === "coach" && currentDialogue.content !== "..." ? (
                <TypewriterText 
                  text={currentDialogue.content} 
                  onComplete={() => setIsTyping(false)} 
                />
              ) : (
                <span>{currentDialogue.content}</span>
              )}
            </div>

            <div className="input-container">
              <input 
                type="text" 
                className="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your response..."
                disabled={isLoading || isTyping}
              />
              <button 
                className="send-button"
                onClick={handleSend}
                disabled={isLoading || isTyping || !input.trim()}
              >
                {isLoading ? "..." : "Send"}
              </button>
            </div>
          </motion.div>
        </div>

        <motion.div 
          className="analyst-panel"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <div className="analyst-header">Analyst Overlay</div>
          
          <div className="metric-row">
            <span>Passiveness</span>
            <span style={{ color: (latestFeedback?.passiveness_score || 0) > 5 ? 'var(--mahiru-color)' : 'var(--text-primary)' }}>
              {latestFeedback ? latestFeedback.passiveness_score : 0}/10
            </span>
          </div>
          <div className="metric-row">
            <span>Apologies</span>
            <span style={{ color: (latestFeedback?.apology_count || 0) > 0 ? 'var(--mahiru-color)' : 'var(--text-primary)' }}>
              {latestFeedback ? latestFeedback.apology_count : 0}
            </span>
          </div>
          <div className="metric-row">
            <span>Hesitations</span>
            <span style={{ color: (latestFeedback?.hesitation_count || 0) > 0 ? 'var(--mahiru-color)' : 'var(--text-primary)' }}>
              {latestFeedback ? latestFeedback.hesitation_count : 0}
            </span>
          </div>
          
          <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--amane-color)' }}>COACH NOTES:</strong><br /><br />
            {latestFeedback ? latestFeedback.feedback_notes : "Awaiting input..."}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
