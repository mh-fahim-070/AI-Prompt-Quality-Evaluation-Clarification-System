
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

export interface LiveTranscriptionCallbacks {
  onTranscript: (text: string) => void;
  onStatusChange: (active: boolean) => void;
  onError: (error: string) => void;
  initialText?: string;
}

export const startVoiceCapture = async (callbacks: LiveTranscriptionCallbacks) => {
  // Always use process.env.API_KEY directly as per guidelines.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let sessionTranscript = callbacks.initialText || "";

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    
    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      callbacks: {
        onopen: () => {
          callbacks.onStatusChange(true);
          const source = inputAudioContext.createMediaStreamSource(stream);
          const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
          
          scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const l = inputData.length;
            const int16 = new Int16Array(l);
            for (let i = 0; i < l; i++) {
              int16[i] = inputData[i] * 32768;
            }
            let binary = '';
            const bytes = new Uint8Array(int16.buffer);
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            const base64 = btoa(binary);
            
            // Solely rely on sessionPromise resolves and then call `session.sendRealtimeInput`.
            sessionPromise.then(session => {
              session.sendRealtimeInput({ 
                media: { data: base64, mimeType: 'audio/pcm;rate=16000' } 
              });
            });
          };
          
          source.connect(scriptProcessor);
          scriptProcessor.connect(inputAudioContext.destination);
        },
        onmessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.inputTranscription) {
            const newPart = message.serverContent.inputTranscription.text;
            const separator = (sessionTranscript.length > 0 && !sessionTranscript.endsWith(' ')) ? ' ' : '';
            sessionTranscript += separator + newPart;
            callbacks.onTranscript(sessionTranscript);
          }
        },
        onerror: (e) => {
          console.error("Live API Error:", e);
          callbacks.onError("Voice connection error");
          callbacks.onStatusChange(false);
        },
        onclose: () => {
          callbacks.onStatusChange(false);
          if (inputAudioContext.state !== 'closed') {
            inputAudioContext.close();
          }
          stream.getTracks().forEach(track => track.stop());
        }
      },
      config: {
        // Fix: corrected typo in property name from responseModalalities to responseModalities.
        responseModalities: [Modality.AUDIO],
        inputAudioTranscription: {},
        systemInstruction: "You are a highly accurate speech-to-text engine. Transcribe user input exactly as spoken without commentary."
      }
    });

    return sessionPromise;
  } catch (err) {
    callbacks.onError("Microphone access denied");
    throw err;
  }
};
