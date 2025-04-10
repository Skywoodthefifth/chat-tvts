import React from 'react';
import './TypingIndicator.css';

export default function TypingIndicator({ name = "Bot" }: { name?: string }) {
  return (
    <div className="typing-indicator">
      <span className="dot"></span>
      <span className="dot"></span>
      <span className="dot"></span>
      <span className="text">{name} is typing...</span>
    </div>
  );
}
