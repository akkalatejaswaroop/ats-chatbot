import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

// --- Helper Types and Components (assuming they are in separate files) ---

// From types.ts
enum Role {
  USER = 'user',
  MODEL = 'model',
}

interface Message {
  id: string;
  role: Role;
  content: string;
}

// --- Main App Component ---

const App: React.FC = () => {
  // --- STATE MANAGEMENT ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // This ref will hold the chat session instance from the Gemini API
  const chatSessionRef = useRef<any | null>(null);

  // --- API KEY HANDLING (CORRECTED FOR VITE) ---
  // For Vite, environment variables MUST start with VITE_ and are accessed via import.meta.env
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

  // --- EFFECTS ---

  // 1. Initialize the chat session when the component mounts
  useEffect(() => {
    const initializeChat = async () => {
      setIsLoading(true);
      setError(null);

      if (!API_KEY) {
        setError("API Key is missing. Make sure you have set the VITE_GEMINI_API_KEY environment variable in your .env file or deployment service (like Netlify).");
        setIsLoading(false);
        return;
      }

      try {
        // The import is now at the top of the file, so we can use it directly.
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        chatSessionRef.current = model.startChat({
          history: [],
          generationConfig: {
            maxOutputTokens: 1000,
          },
        });

        // Set the initial greeting message from the assistant
        setMessages([
          {
            id: 'initial-message',
            role: Role.MODEL,
            content: "Hello! I'm an assistant powered by Gemini. How can I help you today?",
          },
        ]);

      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during initialization.";
        console.error("Initialization Error:", e);
        setError(`Failed to initialize the chatbot. Please check your API key and setup.\n\nError: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    };

    initializeChat();
  }, [API_KEY]); // Rerun if API_KEY changes (it shouldn't, but it's a dependency)

  // 2. Auto-scroll to the latest message
  useEffect(() => {
    if (chatContainerRef.current) {
      const { scrollHeight } = chatContainerRef.current;
      chatContainerRef.current.scrollTo({ top: scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  // --- SEND MESSAGE HANDLER ---
  const handleSendMessage = async (userInput: string) => {
    if (isLoading || !chatSessionRef.current) return;

    setIsLoading(true);
    setError(null);

    const userMessage: Message = { id: `user-${Date.now()}`, role: Role.USER, content: userInput };
    setMessages(prevMessages => [...prevMessages, userMessage]);

    try {
      const result = await chatSessionRef.current.sendMessage(userInput);
      const response = result.response;
      const responseContent = response.text();

      if (!responseContent) {
        throw new Error("Received an empty response from the API.");
      }

      const modelMessage: Message = {
        id: `model-${Date.now()}`,
        role: Role.MODEL,
        content: responseContent.trim()
      };
      
      setMessages(prev => [...prev, modelMessage]);

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      console.error("API Error:", e);
      // Add the error message to the chat for visibility
      const errorResponseMessage: Message = {
        id: `error-${Date.now()}`,
        role: Role.MODEL,
        content: `Sorry, I ran into a problem. Please try again.\n\n*Error: ${errorMessage}*`,
      };
      setMessages(prev => [...prev, errorResponseMessage]);
      setError(`API Error: ${errorMessage}`); // Also set error state for the main error banner
    } finally {
      setIsLoading(false);
    }
  };

  // --- RENDER ---
  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans">
      <header className="p-4 text-center border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <h1 className="text-2xl sm:text-3xl text-gray-800 font-bold">AI Powered Chatbot</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Developed by <code className="bg-gray-200 text-gray-700 font-mono rounded px-1.5 py-0.5 text-xs">Akkala Teja Swaroop</code>
        </p>
      </header>

      <main ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="max-w-4xl mx-auto">
          {messages.map(msg => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {isLoading && messages.length > 0 && (
            <ThinkingIndicator />
          )}
          {error && (
            <div className="p-4 my-4 bg-red-100 border border-red-300 rounded-lg text-red-800 max-w-4xl mx-auto">
              <p className="font-bold">An Error Occurred:</p>
              <p className="whitespace-pre-wrap text-sm mt-1">{error}</p>
            </div>
          )}
        </div>
      </main>

      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading || !chatSessionRef.current} />
    </div>
  );
};

// --- Child Components ---

const ChatMessage: React.FC<{ message: Message }> = ({ message }) => {
  const isModel = message.role === Role.MODEL;
  
  const wrapperClasses = isModel ? "justify-start" : "justify-end";
  const bubbleClasses = isModel 
    ? "bg-white border border-gray-200" 
    : "bg-blue-500 text-white";
  const authorClasses = isModel ? "text-gray-600" : "text-blue-300";

  return (
    <div className={`flex items-start gap-3 my-4 ${wrapperClasses}`}>
      {isModel && (
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center border-2 border-blue-200 flex-shrink-0">
          <svg className="w-5 h-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-12h2v2h-2zm0 4h2v6h-2z"/></svg>
        </div>
      )}
      <div className="flex flex-col max-w-2xl">
          <div className={`p-3 md:p-4 rounded-xl shadow-sm ${bubbleClasses}`}>
              <p className="whitespace-pre-wrap text-base">{message.content}</p>
          </div>
          <span className={`text-xs mt-1 px-2 ${isModel ? 'text-left' : 'text-right'} ${authorClasses}`}>
              {isModel ? 'Gemini Assistant' : 'You'}
          </span>
      </div>
    </div>
  );
};

const ThinkingIndicator: React.FC = () => (
  <div className="flex items-start gap-3 my-4 justify-start">
    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center border-2 border-blue-200 flex-shrink-0">
        <svg className="w-5 h-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-12h2v2h-2zm0 4h2v6h-2z"/></svg>
    </div>
    <div className="max-w-2xl p-4 rounded-xl shadow-sm bg-white border border-gray-200">
        <div className="flex items-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mx-0.5"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse [animation-delay:0.2s] mx-0.5"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse [animation-delay:0.4s] mx-0.5"></div>
        </div>
    </div>
  </div>
);

const ChatInput: React.FC<{ onSendMessage: (input: string) => void; isLoading: boolean }> = ({ onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <footer className="p-4 bg-white border-t border-gray-200 sticky bottom-0">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message here..."
          disabled={isLoading}
          className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 transition-shadow"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-4 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </footer>
  );
};

export default App;
