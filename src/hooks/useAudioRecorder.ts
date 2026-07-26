import { useState, useRef, useEffect } from 'react';

interface UseAudioRecorderProps {
  onTranscript: (text: string, isFinal: boolean) => void;
  keywords?: string[];
}

export function useAudioRecorder({ onTranscript, keywords = [] }: UseAudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<'idle' | 'fetching_token' | 'connecting' | 'recording' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = async () => {
    try {
      setStatus('fetching_token');
      setErrorMessage('');

      // 1. Fetch temporary token from server
      const tokenRes = await fetch('/api/deepgram/token');
      if (!tokenRes.ok) {
        throw new Error('Failed to fetch Deepgram token from server API');
      }
      const { token } = await tokenRes.json();
      if (!token) {
        throw new Error('No token returned from Deepgram API');
      }

      setStatus('connecting');

      // 2. Build WebSocket URL with query params
      const baseKeywords = [
        'inner join', 'left join', 'right join', 'sql',
        'react', 'javascript', 'typescript', 'playwright',
        'cypress', 'selenium', 'bdd', 'tdd', 'modelo v',
        'smoke testing', 'sanity testing', 'regression testing',
        'page object model', 'locator', 'xpath', 'api',
        'postman', 'jmeter', 'docker', 'azure', 'git',
        'scrum', 'istqb', 'token', 'jwt'
      ];
      
      const allKeywords = [...baseKeywords, ...keywords];
      const keywordsParam = allKeywords.map(k => `keyword=${encodeURIComponent(k)}:10`).join('&');

      const wsUrl = `wss://api.deepgram.com/v1/listen?model=nova-2&language=es-419&smart_format=true&punctuate=true&interim_results=true`;
      
      const socket = new WebSocket(wsUrl, ['token', token]);
      socketRef.current = socket;

      socket.onopen = async () => {
        console.log('Deepgram WebSocket connected');
        
        // 3. Request microphone access with filters to improve audio quality
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
          streamRef.current = stream;

          // Find supported mime type
          let mimeType = 'audio/webm';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'audio/ogg';
          }
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'audio/mp4';
          }
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ''; // Default
          }

          const mediaRecorder = mimeType 
            ? new MediaRecorder(stream, { mimeType })
            : new MediaRecorder(stream);
            
          mediaRecorderRef.current = mediaRecorder;

          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
              console.log('Sending audio chunk of size:', event.data.size);
              socket.send(event.data);
            }
          };

          // Record in 250ms chunks
          mediaRecorder.start(250);
          setIsRecording(true);
          setStatus('recording');
        } catch (mediaErr: any) {
          console.error('Microphone error:', mediaErr);
          socket.close();
          setStatus('error');
          setErrorMessage(mediaErr.message || 'Microphone access denied');
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Deepgram message:', data);
          const transcript = data.channel?.alternatives?.[0]?.transcript;
          const isFinal = data.is_final;
          
          if (transcript) {
            onTranscript(transcript, isFinal);
          }
        } catch (e) {
          console.error('Error parsing socket data', e);
        }
      };

      socket.onerror = (err) => {
        console.error('Deepgram socket error:', err);
      };

      socket.onclose = () => {
        console.log('Deepgram WebSocket closed');
        stopRecordingState();
      };

    } catch (err: any) {
      console.error('Start recording error:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Failed to start recording');
      stopRecordingState();
    }
  };

  const stopRecordingState = () => {
    setIsRecording(false);
    if (status !== 'error') {
      setStatus('idle');
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    streamRef.current = null;
  };

  const stopRecording = () => {
    stopRecordingState();
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    isRecording,
    status,
    errorMessage,
    startRecording,
    stopRecording,
  };
}
