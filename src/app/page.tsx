'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Brain, ChevronLeft, Save, Plus, Settings, Sparkles, MessageSquare, Trash2, ArrowRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { getProfile, getSessionMessages, addSessionMessage, saveTranscription } from '@/services/SupabaseService';
import type { UserProfile, Session, SessionMessage } from '@/services/SupabaseService';
import ConfigurationScreen from '@/components/ConfigurationScreen';
import SessionManager from '@/components/SessionManager';

type Screen = 'config' | 'sessions' | 'interview';

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('sessions');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  
  const [transcription, setTranscription] = useState('');
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCorrecting, setIsCorrecting] = useState(false);
  
  const transcriptBuffer = useRef('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, transcription]);

  useEffect(() => {
    // Load profile on start
    getProfile().then(p => {
      setProfile(p);
      if (!p) {
        setCurrentScreen('config');
      }
    });
  }, []);

  const handleSessionSelect = async (session: Session) => {
    setCurrentSession(session);
    setCurrentScreen('interview');
    const msgs = await getSessionMessages(session.id);
    setMessages(msgs);
  };

  const handleTranscript = (text: string, isFinal: boolean) => {
    setTranscription(text);
    if (isFinal) {
      transcriptBuffer.current += ' ' + text;
      saveTranscription(text, isFinal);
    }
  };

  const userKeywords = profile?.keywords?.map(k => k.correct_word).filter(Boolean) || [];

  const { isRecording, status, errorMessage, startRecording, stopRecording } = useAudioRecorder({
    onTranscript: handleTranscript,
    keywords: userKeywords,
  });

  const toggleListen = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleGenerateResponse = async () => {
    let context = transcriptBuffer.current.trim();
    if (!context) {
      context = transcription.trim(); // fallback to current transcription if buffer is somehow empty
    }
    
    if (context.length > 5) {
      setIsProcessing(true);
      setIsCorrecting(true);
      
      // Stop recording while processing
      if (isRecording) {
        stopRecording();
      }

      try {
        // 1. Correct transcription via backend API
        const correctRes = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            context,
            action: 'correct',
          }),
        });
        
        if (!correctRes.ok) throw new Error('Correction request failed');
        const correctData = await correctRes.json();
        const correctedContext = correctData.response || context;
        setIsCorrecting(false);

        // 2. Save User message to session
        const userMessage: SessionMessage = {
          session_id: currentSession?.id || 'temp',
          role: 'user',
          content: correctedContext,
        };

        setMessages(prev => [...prev, userMessage]);
        
        if (currentSession) {
          await addSessionMessage(userMessage);
        }

        // Fetch latest messages for memory context
        const sessionMessages = currentSession ? await getSessionMessages(currentSession.id) : [];
        const memory = currentSession ? { ...currentSession, messages: sessionMessages } : null;

        // Create empty assistant message for UI
        const assistantMessage: SessionMessage = {
          session_id: currentSession?.id || 'temp',
          role: 'assistant',
          content: '',
        };
        setMessages(prev => [...prev, assistantMessage]);

        // 3. Generate AI response from backend API
        const respondRes = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            context: correctedContext,
            profile,
            session: memory,
            provider: 'groq', // can toggle to openai if needed
            action: 'respond',
          }),
        });

        if (!respondRes.ok) throw new Error('Response request failed');
        const respondData = await respondRes.json();
        const aiResponse = respondData.response || 'No se pudo obtener una respuesta.';

        // Update assistant message with response
        setMessages(prev => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          newMessages[lastIndex] = {
            ...newMessages[lastIndex],
            content: aiResponse,
          };
          return newMessages;
        });

        if (currentSession) {
          await addSessionMessage({
            ...assistantMessage,
            content: aiResponse,
          });
        }

        // Clear local transcription buffers
        setTranscription('');
        transcriptBuffer.current = '';

      } catch (err) {
        console.error('Error during generation:', err);
      } finally {
        setIsProcessing(false);
        setIsCorrecting(false);
      }
    }
  };

  const handleBackToSessions = () => {
    if (isRecording) {
      stopRecording();
    }
    setCurrentScreen('sessions');
    setCurrentSession(null);
    setMessages([]);
    setTranscription('');
    transcriptBuffer.current = '';
  };

  return (
    <main className="flex-1 flex flex-col bg-[#0b0c10] text-[#c5c6c7] font-sans antialiased overflow-hidden min-h-screen">
      {/* Background ambient light */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#1f2833]/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#66fcf1]/5 blur-[120px] pointer-events-none" />

      {currentScreen === 'config' && (
        <div className="flex-1 flex items-center justify-center p-4 md:p-8 z-10 overflow-y-auto">
          <div className="w-full max-w-2xl">
            <ConfigurationScreen onNext={() => setCurrentScreen('sessions')} />
          </div>
        </div>
      )}

      {currentScreen === 'sessions' && (
        <div className="flex-1 flex items-center justify-center p-4 md:p-8 z-10 overflow-y-auto">
          <div className="w-full max-w-md">
            <SessionManager 
              onSessionSelect={handleSessionSelect} 
              onGoConfig={() => setCurrentScreen('config')} 
            />
          </div>
        </div>
      )}

      {currentScreen === 'interview' && (
        <div className="flex-1 flex flex-col h-full max-h-screen relative z-10">
          {/* Header */}
          <header className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b border-[#1f2833]/30 bg-[#0b0c10]/80 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <button 
                onClick={handleBackToSessions}
                className="p-2 rounded-lg bg-[#1f2833]/50 hover:bg-[#1f2833]/80 border border-[#1f2833]/40 transition"
              >
                <ChevronLeft size={20} className="text-[#66fcf1]" />
              </button>
              <div>
                <h1 className="text-sm md:text-base font-semibold text-white truncate max-w-[180px] md:max-w-xs">
                  {currentSession?.name}
                </h1>
                <p className="text-[10px] md:text-xs text-[#45f3ff]/70 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#45f3ff] animate-pulse" />
                  Copiloto Activo
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentScreen('config')}
                className="p-2 rounded-lg bg-[#1f2833]/50 hover:bg-[#1f2833]/80 border border-[#1f2833]/40 transition text-[#c5c6c7] hover:text-white"
              >
                <Settings size={18} />
              </button>
            </div>
          </header>

          {/* Messages & Assistant Content Area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6 space-y-4 max-w-3xl mx-auto w-full min-h-0">
            {messages.length === 0 && !transcription && (
              <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
                <Brain size={48} className="text-[#66fcf1] opacity-60 mb-4 animate-bounce" />
                <h3 className="text-white font-medium text-lg mb-2">Listo para escuchar</h3>
                <p className="text-sm text-[#c5c6c7]/60 max-w-xs">
                  Coloca tu celular cerca de la llamada, presiona el micrófono e inicia la entrevista.
                </p>
              </div>
            )}

            {/* Conversation list */}
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                } w-full animate-fade-in`}
              >
                <div 
                  className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-[#1f2833]/70 text-[#66fcf1] border border-[#1f2833] rounded-tr-none'
                      : 'bg-[#1f2833]/30 text-white border border-[#1f2833]/40 rounded-tl-none shadow-lg shadow-black/10'
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60 block mb-1">
                    {msg.role === 'user' ? 'Entrevistador' : 'Tú (IA Copiloto)'}
                  </span>
                  
                  {msg.role === 'assistant' ? (
                    <div className="markdown-content prose prose-invert max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Current Real-time transcription feedback */}
            {transcription && (
              <div className="flex flex-col items-end w-full animate-pulse">
                <div className="max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed bg-[#66fcf1]/5 text-[#66fcf1] border border-[#66fcf1]/20 rounded-tr-none">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-[#66fcf1]/60 block mb-1">
                    Escuchando en vivo...
                  </span>
                  <p className="italic">{transcription}</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Action / Recording Panel */}
          <div className="p-4 border-t border-[#1f2833]/30 bg-[#0b0c10]/90 backdrop-blur-md flex flex-col gap-3">
            {/* Status indicator / Errors */}
            {errorMessage && (
              <div className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg p-2.5 text-center">
                {errorMessage}
              </div>
            )}

            <div className="max-w-md mx-auto w-full flex items-center justify-between gap-4">
              {/* Mic capture button */}
              <button 
                onClick={toggleListen}
                disabled={isProcessing}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
                  isRecording 
                    ? 'bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 animate-pulse'
                    : 'bg-[#1f2833]/85 hover:bg-[#1f2833] border border-[#1f2833]/50 text-white'
                } disabled:opacity-50`}
              >
                {isRecording ? (
                  <>
                    <MicOff size={18} />
                    <span>Pausar Escucha</span>
                  </>
                ) : (
                  <>
                    <Mic size={18} className="text-[#66fcf1]" />
                    <span>Iniciar Escucha</span>
                  </>
                )}
              </button>

              {/* Generate response button */}
              <button 
                onClick={handleGenerateResponse}
                disabled={isProcessing || (!transcription && !transcriptBuffer.current)}
                className={`py-3 px-6 rounded-xl font-medium flex items-center gap-2 border transition-all ${
                  (transcription || transcriptBuffer.current) && !isProcessing
                    ? 'bg-[#66fcf1] hover:bg-[#45f3ff] text-black border-[#66fcf1] shadow-lg shadow-[#66fcf1]/10'
                    : 'bg-[#1f2833]/40 border-[#1f2833]/60 text-[#c5c6c7]/40 cursor-not-allowed'
                }`}
              >
                {isProcessing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-[#66fcf1] border-t-transparent rounded-full animate-spin" />
                    <span>{isCorrecting ? 'Corrigiendo...' : 'Procesando...'}</span>
                  </>
                ) : (
                  <>
                    <Brain size={18} />
                    <span>Responder</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
