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
}

// Custom Typewriter Component for Visual Novel text rendering
const TypewriterText = ({ text, onComplete }: { text: string, onComplete?: () => void }) => {
  const [displayedText, setDisplayedText] = useState("");
  
  useEffect(() => {
    setDisplayedText("");
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(text.substring(0, i + 1));
      i++;
      if (i >= text.length) {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, 25); // Classic VN typing speed
    
    return () => clearInterval(interval);
  }, [text, onComplete]);

  return <span>{displayedText}</span>;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  const spriteRef = useRef(null);
  const chatLogRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat log
  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    // Anime.js continuous floating animation
    if (spriteRef.current) {
      anime({
        targets: spriteRef.current,
        translateY: [15, -15],
        direction: 'alternate',
        loop: true,
        easing: 'easeInOutSine',
        duration: 3000
      });
    }
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isTyping || isLoading) return;

    const userMsg = input;
    setInput("");
    
    const newMessages = [...messages, { role: "user" as const, content: userMsg }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const res = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, difficulty: "neutral" })
      });
      
      const data = await res.json();
      
      setMessages(prev => [...prev, {
        role: "coach",
        content: data.coach_response,
        feedback: data.feedback
      }]);
      
      setIsTyping(true);
      
      // Anime.js reactive pulse
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
  
  // Find the last message to display in the main dialogue box
  const currentDialogue = messages.length > 0 && messages[messages.length - 1].role === "coach" 
    ? messages[messages.length - 1] 
    : { role: "coach", content: "..." };

  return (
    <div className="vn-container">
      {/* Character Sprite */}
      <div className="character-display">
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        >
          <div ref={spriteRef} className="character-sprite">
            <img src="/mahiru_sprite.png" alt="Mahiru" className="character-image" />
          </div>
        </motion.div>
      </div>

      {/* UI Overlay */}
      <div className="ui-layer">
        
        {/* Dialogue Box & Chat Log */}
        <motion.div 
          className="glass-panel dialogue-box"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          {/* Chat History Log */}
          {messages.length > 1 && (
            <div className="chat-log" ref={chatLogRef}>
              {messages.slice(0, -1).map((msg, i) => (
                <div key={i} className={`log-entry ${msg.role}`}>
                  <div className={`log-name ${msg.role}`}>
                    {msg.role === 'coach' ? 'Mahiru' : 'You'}
                  </div>
                  <div>{msg.content}</div>
                </div>
              ))}
            </div>
          )}

          <div className="character-name">
            {currentDialogue.role === "coach" ? "Mahiru" : "You"}
          </div>
          
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

        {/* Analyst Panel */}
        <motion.div 
          className="glass-panel analyst-panel"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
        >
          <div className="analyst-header">Analyst Overlay</div>
          
          <div className="metric-row">
            <span>Passiveness</span>
            <span style={{ color: (latestFeedback?.passiveness_score || 0) > 5 ? 'var(--accent-pink)' : 'var(--text-primary)' }}>
              {latestFeedback ? latestFeedback.passiveness_score : 0}/10
            </span>
          </div>
          <div className="metric-row">
            <span>Apologies</span>
            <span style={{ color: (latestFeedback?.apology_count || 0) > 0 ? 'var(--accent-pink)' : 'var(--text-primary)' }}>
              {latestFeedback ? latestFeedback.apology_count : 0}
            </span>
          </div>
          <div className="metric-row">
            <span>Hesitations</span>
            <span style={{ color: (latestFeedback?.hesitation_count || 0) > 0 ? 'var(--accent-pink)' : 'var(--text-primary)' }}>
              {latestFeedback ? latestFeedback.hesitation_count : 0}
            </span>
          </div>
          
          <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--accent-cyan)' }}>COACH NOTES:</strong><br /><br />
            {latestFeedback ? latestFeedback.feedback_notes : "Awaiting input..."}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
