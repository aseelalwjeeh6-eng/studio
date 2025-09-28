'use client';

import { useState, useEffect, useRef } from 'react';
import { database } from '@/lib/firebase';
import { ref, onValue, push } from 'firebase/database';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User } from '@/app/providers';
import { Bot, Send } from 'lucide-react';
import { filterProfanity } from '@/ai/flows/profanity-filter';

interface ChatProps {
  roomId: string;
  user: User;
}

interface Message {
  sender: string;
  text: string;
  timestamp: number;
}

const Chat = ({ roomId, user }: ChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const chatRef = ref(database, `rooms/${roomId}/chat`);
    onValue(chatRef, (snapshot) => {
      const data = snapshot.val();
      const loadedMessages: Message[] = data ? Object.values(data) : [];
      setMessages(loadedMessages.sort((a, b) => a.timestamp - b.timestamp));
    });
  }, [roomId]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || isSending) return;

    setIsSending(true);
    try {
        const { filteredText } = await filterProfanity({ text: newMessage });

        const chatRef = ref(database, `rooms/${roomId}/chat`);
        const messageData = {
            sender: user.name,
            text: filteredText,
            timestamp: Date.now(),
        };
        await push(chatRef, messageData);
        setNewMessage('');
    } catch(error) {
        console.error("Error sending message:", error);
    } finally {
        setIsSending(false);
    }
  };

  return (
    <Card className="h-full flex flex-col bg-card border-none rounded-t-2xl">
      <CardHeader className="flex flex-row items-center justify-between p-4">
        <CardTitle className="text-lg">الدردشة</CardTitle>
        <Button variant="ghost" size="sm">
            <Bot className="me-2" />
            لخص لي
        </Button>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden p-0">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="p-4 space-y-4">
            {messages.map((msg, index) => (
              <div key={index} className="flex flex-col">
                <span className="font-bold text-sm text-accent">{msg.sender}</span>
                <p className="text-md text-foreground">{msg.text}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="flex w-full items-center gap-2">
          <Input
            type="text"
            placeholder="اكتب رسالتك..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="bg-input border-border focus:ring-accent"
            disabled={isSending}
          />
          <Button type="submit" size="icon" disabled={isSending}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
};

export default Chat;
