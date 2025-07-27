
'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Mic, StopCircle, Bot, User, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { drishtiCommandCenter } from '@/ai/flows/drishti-command-center';
import { textToSpeech } from '@/ai/flows/text-to-speech';
import { useDrishti } from '@/lib/drishti-context';

const initialMessage = {
    role: 'ai' as const,
    content: "Hello! I am Drishti, your AI assistant. How can I help you with the security system today?"
};

export default function AICommandCenter() {
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [conversation, setConversation] = useState<{ role: 'user' | 'ai'; content: string }[]>([initialMessage]);
  const recognition = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isSpeechSupported, setIsSpeechSupported] = useState<boolean | null>(null);

  const { toast } = useToast();
  const { eventId } = useDrishti();

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSpeechSupported(false);
      toast({
        variant: 'destructive',
        title: 'Browser Not Supported',
        description: 'Speech recognition is not supported in your browser.',
      });
      return;
    }
    
    setIsSpeechSupported(true);
    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = false;
    recognitionInstance.lang = 'en-US';

    recognitionInstance.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setPrompt(transcript);
      handleProcessCommand(transcript);
    };

    recognitionInstance.onend = () => {
      setIsListening(false);
    };

    recognitionInstance.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      toast({
        variant: 'destructive',
        title: 'Voice Error',
        description: `An error occurred during speech recognition: ${event.error}`,
      });
    };
    
    recognition.current = recognitionInstance;

  }, [toast]);

  const handleToggleListening = () => {
    if (isListening) {
      recognition.current?.stop();
      setIsListening(false);
    } else {
      recognition.current?.start();
      setIsListening(true);
    }
  };

  const handleProcessCommand = async (commandText?: string) => {
    const command = typeof commandText === 'string' ? commandText : prompt;
    if (!command.trim() || !eventId) return;

    setIsProcessing(true);
    setConversation(prev => [...prev, { role: 'user', content: command }]);
    setPrompt('');

    try {
      const response = await drishtiCommandCenter({ query: command, eventId });
      setConversation(prev => [...prev, { role: 'ai', content: response.answer }]);
      
      const audioResponse = await textToSpeech(response.answer);
      if (audioRef.current) {
        audioRef.current.src = audioResponse.media;
        audioRef.current.play();
      }

    } catch (error) {
      console.error('Error processing command:', error);
      const errorMessage = 'Sorry, I encountered an error trying to respond. Please try again.';
      setConversation(prev => [...prev, { role: 'ai', content: errorMessage }]);
      toast({
        variant: 'destructive',
        title: 'AI Error',
        description: 'Could not process your command.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Talk with Drishti</CardTitle>
        <CardDescription>
          Ask questions about system status, incidents, or camera analytics for this event.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-96 overflow-y-auto rounded-md border bg-muted/50 p-4 space-y-6">
          {conversation.map((entry, index) => (
            <div key={index} className={`flex items-start gap-4 ${entry.role === 'user' ? 'justify-end' : ''}`}>
              {entry.role === 'ai' && <Bot className="h-6 w-6 text-primary flex-shrink-0" />}
              <div className={`max-w-prose rounded-lg p-3 ${entry.role === 'ai' ? 'bg-background' : 'bg-primary text-primary-foreground'}`}>
                <p>{entry.content}</p>
              </div>
              {entry.role === 'user' && <User className="h-6 w-6 text-primary flex-shrink-0" />}
            </div>
          ))}
        </div>

        <div className="relative">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Type your command or use the microphone..."
            className="pr-24"
            disabled={isProcessing}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleProcessCommand();
              }
            }}
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleListening}
              disabled={!isSpeechSupported || isProcessing}
              className={isListening ? 'text-destructive' : ''}
            >
              {isListening ? <StopCircle className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              <span className="sr-only">{isListening ? 'Stop listening' : 'Start listening'}</span>
            </Button>
            <Button onClick={() => handleProcessCommand()} disabled={isProcessing || !prompt.trim()}>
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send
            </Button>
          </div>
        </div>
        <audio ref={audioRef} className="hidden" />
      </CardContent>
    </Card>
  );
}
