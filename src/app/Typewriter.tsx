'use client';

import { useState, useEffect, useRef } from 'react';

type Props = {
  text: string;
  speed?: number; // milliseconds per character
};

const Typewriter = ({ text, speed = 50 }: Props) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isTypingComplete, setIsTypingComplete] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const indexRef = useRef(0);
  
    useEffect(() => {
      setDisplayedText('');
      setIsTypingComplete(false);
      indexRef.current = 0;
  
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
  
      if (!text || typeof text !== 'string') {
        setIsTypingComplete(true);
        return;
      }
  
      const typeCharacter = () => {
        if (indexRef.current <= text.length) {
          setDisplayedText(text.slice(0, indexRef.current));
          indexRef.current++;
          timeoutRef.current = setTimeout(typeCharacter, speed);
        } else {
          setIsTypingComplete(true);
        }
      };
  
      typeCharacter();
  
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, [text, speed]);
  
    const showAllText = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (text) {
        setDisplayedText(text);
        setIsTypingComplete(true);
      }
    };
  
    return displayedText;
}

export default Typewriter;
