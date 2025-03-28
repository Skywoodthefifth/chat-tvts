'use client'

import { useState, useRef, useEffect } from 'react';
import { saveAs } from 'file-saver'; // Import file-saver

export default function Home() {
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([]);
  const [isRecording, setIsRecording] = useState(false);
  const audioBlob = useRef<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined); // New state for audio URL
  const [userInput, setUserInput] = useState<string>(''); // New state for text input
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const [isLoading, setIsLoading] = useState(false); // New state for loading spinner

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
    fetch('http://127.0.0.1:8000/api/v1/clear-history', {
      method: 'POST',
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

      const response = await fetch('http://127.0.0.1:8000/api/v1/stt', {
        method: 'POST',
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

    const response = await fetch('http://127.0.0.1:8000/api/v1/llm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
      await fetch('http://127.0.0.1:8000/api/v1/clear-history', {
        method: 'POST',
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

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userInput }]);

    // Add bot response
    const botResponse = await generateBotResponse(userInput);

    setUserInput(''); // Clear input field

    // Call TTS endpoint to get audio response
    const ttsResponse = await fetch('http://127.0.0.1:8000/api/v1/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
              className={`mic-button ${isRecording ? 'recording' : ''}`}
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
            >
              🎤
            </button>
            {isLoading && <div className="loading-spinner">⏳</div>} {/* Loading spinner */}
            <textarea 
              value={userInput} 
              onChange={(e) => setUserInput(e.target.value)} 
              placeholder="Type your message here..." 
              className="text-input-box"
            />
            <button onClick={handleSendMessage} className="send-button">
              Send
            </button>
            <button onClick={handleClearHistory} className="clear-history-button">
              Clear
            </button>
          </div>
        </div>
  );
}
