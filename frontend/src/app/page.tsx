"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as animeModule from "animejs";

// @ts-ignore - Handle various anime.js export shapes
const anime = animeModule.default || animeModule;

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

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Reference for anime.js character animation
  const characterRef = useRef(null);

  useEffect(() => {
    if (characterRef.current) {
      anime({
        targets: characterRef.current,
        translateY: [10, -10],
        direction: 'alternate',
        loop: true,
        easing: 'easeInOutSine',
        duration: 2000
      });
    }
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
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
      
      // Pulse animation on new message
      if (characterRef.current) {
        anime({
          targets: characterRef.current,
          scale: [1, 1.02, 1],
          duration: 500,
          easing: 'easeOutElastic(1, .8)'
        });
      }
      
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const latestFeedback = messages.filter(m => m.feedback).pop()?.feedback;
  const currentDialogue = messages.length > 0 ? messages[messages.length - 1] : { role: "coach", content: "Hey. We have some work to do. Let's start with your boundary setting." };

  return (
    <div className="vn-container">
      {/* Background elements */}
      
      {/* Character Sprite Placeholder */}
      <div className="character-display">
        <motion.div 
          ref={characterRef}
          className="character-sprite"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          {/* Add actual sprite image here later */}
        </motion.div>
      </div>

      {/* UI Overlay */}
      <div className="ui-layer">
        {/* Dialogue Box */}
        <motion.div 
          className="glass-panel dialogue-box"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="character-name">
            {currentDialogue.role === "coach" ? "Mahiru" : "You"}
          </div>
          
          <AnimatePresence mode="wait">
            <motion.div 
              key={messages.length}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="dialogue-text"
            >
              {currentDialogue.content}
            </motion.div>
          </AnimatePresence>

          <div className="input-container">
            <input 
              type="text" 
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your response..."
              disabled={isLoading}
            />
            <button 
              className="send-button"
              onClick={handleSend}
              disabled={isLoading}
            >
              {isLoading ? "..." : "Send"}
            </button>
          </div>
        </motion.div>

        {/* Analyst Panel */}
        <motion.div 
          className="glass-panel analyst-panel"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="analyst-header">Analyst Overlay (No Escapism)</div>
          
          <div className="metric-row">
            <span>Passiveness</span>
            <span style={{ color: latestFeedback?.passiveness_score > 5 ? 'var(--accent-color)' : 'white' }}>
              {latestFeedback ? latestFeedback.passiveness_score : 0}/10
            </span>
          </div>
          <div className="metric-row">
            <span>Apologies</span>
            <span>{latestFeedback ? latestFeedback.apology_count : 0}</span>
          </div>
          <div className="metric-row">
            <span>Hesitations</span>
            <span>{latestFeedback ? latestFeedback.hesitation_count : 0}</span>
          </div>
          
          <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <strong>Coach Notes:</strong><br />
            {latestFeedback ? latestFeedback.feedback_notes : "Awaiting input..."}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
