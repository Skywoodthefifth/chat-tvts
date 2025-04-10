'use client'

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import 'dotenv/config';

const MIN_TEXTAREA_HEIGHT = 32; // Minimum height for the textarea

export default function Home() {
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([]);
  const [isRecording, setIsRecording] = useState(false);
  const audioBlob = useRef<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined); // New state for audio URL
  const [userInput, setUserInput] = useState<string>(''); // New state for text input
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const [isLoading, setIsLoading] = useState(false); // New state for loading spinner
  const [isDisableClicked, setIsDisableClicked] = useState(false); // New state for disabling button

  const textareaRef = useRef(null);

  const url = process.env.NEXT_PUBLIC_HOST || 'http://localhost:8000'; // Default to localhost if not set

  useLayoutEffect(() => {
    // Reset height - important to shrink on delete
    textareaRef.current.style.height = "inherit";
    // Set height
    textareaRef.current.style.height = `${Math.max(
      textareaRef.current.scrollHeight,
      MIN_TEXTAREA_HEIGHT
    )}px`;
  }, [userInput]);

  // Initialize media recorder
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        mediaRecorder.current = new MediaRecorder(stream);
        
        mediaRecorder.current.ondataavailable = (e) => {
          audioChunks.current.push(e.data);
        };

        mediaRecorder.current.onstop = async () => {
          const blob = new Blob(audioChunks.current, { type: 'audio/wav' });
          audioBlob.current = blob; // Update useRef instead of useState
          // setAudioUrl(URL.createObjectURL(blob)); // Create URL for audio playback
          audioChunks.current = [];
        };
      })
      .catch(err => console.error('Error accessing microphone:', err));
  }, []);

  useEffect(() => {
    // Clear history on page reload
    fetch(`${url}/api/v1/clear-history`, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
    }).then(() => console.log("Conversation history cleared on reload."));
  }, []);

  const startRecording = () => {
    if (mediaRecorder.current) {
      mediaRecorder.current.start();
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      setIsLoading(true); // Show loading spinner

      // Add a 5-second delay before calling handleTranscribe
      setTimeout(async () => {
        await handleTranscribe();
        setIsLoading(false); // Hide loading spinner after transcription
      }, 5000);
    }
  };

  const handleTranscribe = async () => {
    if (!audioBlob.current) return;

    const file = new File([audioBlob.current], 'recording.wav', { type: 'audio/wav' });

    try {
      // Send audio to your backend which uses OpenAI API
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${url}/api/v1/stt`, {
        method: 'POST',
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
        body: formData,
        mode: 'cors', // Add this line to fix CORS error
      });

      const result = await response.json();

      // Apply transcription to text input
      setUserInput(result.transcription);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Mock function for bot response - replace with actual API call
  const generateBotResponse = async (text: string) => {
    // Implement your chatbot logic here

    const response = await fetch(`${url}/api/v1/llm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({ message: text }),
      mode: 'cors', // Add this line to fix CORS error
    });

    const result = await response.json();

    return result.response;
  };

  const saveAudioFile = () => {
    if (audioBlob.current) {
      saveAs(audioBlob.current, 'recording.wav');
    }
  };

  const handleClearHistory = async () => {
    try {
      await fetch(`${url}/api/v1/clear-history`, {
        method: 'POST',
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      });
      console.log("Conversation history cleared.");
      setMessages([]); // Clear local messages
    } catch (error) {
      console.error("Error clearing history:", error);
    }

    setUserInput(''); // Clear input field
  };

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;

    setIsDisableClicked(true); // Show loading spinner
    setUserInput(''); // Clear input field

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userInput }]);

    // Add bot response
    const botResponse = await generateBotResponse(userInput);

    setUserInput(''); // Clear input field

    // Call TTS endpoint to get audio response
    const ttsResponse = await fetch(`${url}/api/v1/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({ text: botResponse }),
      mode: 'cors', // Add this line to fix CORS error
    });

    setMessages(prev => [...prev, { role: 'bot', content: botResponse }]);

    if (ttsResponse.ok) {
      const audioBlob = await ttsResponse.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      setAudioUrl(audioUrl); // Set audio URL for playback
      const audio = new Audio(audioUrl);
      audio.play(); // Play the audio immediately
    }

    setIsDisableClicked(false); // Hide loading spinner
  };

  return (
        <div className="chat-container">
          <div className="chat-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.role}`}>
                <div className={`bubble ${msg.role}`}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
          
          <div className="recording-controls">
            {audioBlob.current && (
              <>
                <button hidden onClick={handleTranscribe} className="transcribe-button">
                  Submit
                </button>
                <audio hidden controls src={audioUrl} /> {/* Audio playback control */}
              </>
            )}
          </div>

          <div className="text-input-controls">
            <button 
              disabled={isDisableClicked}
              className={`mic-button ${isRecording ? 'recording' : ''} ${isDisableClicked ? "cursor-not-allowed" : "cursor-pointer"}`}
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
            >
              🎤
            </button>
            {isLoading && <div className="loading-spinner">⏳</div>} {/* Loading spinner */}
            <textarea 
              ref={textareaRef}
              style={{
                minHeight: MIN_TEXTAREA_HEIGHT,
                resize: 'none',
              }}
              value={userInput} 
              onChange={(e) => setUserInput(e.target.value)} 
              placeholder="Type your message here..." 
              className="text-input-box"
            />
            <button disabled={isDisableClicked} onClick={handleSendMessage} className={`send-button ${isDisableClicked ? "cursor-not-allowed" : "cursor-pointer"}`}>
              Send
            </button>
            <button disabled={isDisableClicked} onClick={handleClearHistory} className={`clear-history-button ${isDisableClicked ? "cursor-not-allowed" : "cursor-pointer"}`}>
              Clear
            </button>
          </div>
        </div>
  );
}
