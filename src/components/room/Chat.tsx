'use client';

import { useState, useEffect, useRef } from 'react';
import { database } from '@/lib/firebase';
import { ref, onValue, push, set } from 'firebase/database';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User } from '@/app/providers';
import { Trash2, Send, Mic, MicOff } from 'lucide-react';
import { filterProfanity } from '@/ai/flows/profanity-filter';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


interface ChatProps {
  roomId: string;
  user: User;
  isHost: boolean;
  isSeated: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
}

interface Message {
  sender: string;
  text: string;
  timestamp: number;
}

const Chat = ({ roomId, user, isHost, isSeated, isMuted, onToggleMute }: ChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const chatRef = ref(database(), `rooms/${roomId}/chat`);
    const listener = onValue(chatRef, (snapshot) => {
      const data = snapshot.val();
      const loadedMessages: Message[] = data ? Object.values(data) : [];
      setMessages(loadedMessages.sort((a, b) => a.timestamp - b.timestamp));
    });
    return () => onValue(chatRef, listener);
  }, [roomId]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport) {
      const isScrolledToBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 100;
      
      if(isScrolledToBottom) {
        setTimeout(() => {
            if (viewportRef.current) {
                viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
            }
        }, 100);
      }
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || isSending) return;

    setIsSending(true);
    try {
        const { filteredText } = await filterProfanity({ text: newMessage });

        const chatRef = ref(database(), `rooms/${roomId}/chat`);
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

  const handleClearChat = async () => {
    const chatRef = ref(database(), `rooms/${roomId}/chat`);
    await set(chatRef, null);
  };

  return (
    <Card className="h-full flex flex-col bg-card border-none rounded-t-2xl">
      <CardHeader className="flex flex-row items-center justify-between p-4">
        <CardTitle className="text-lg">الدردشة</CardTitle>
        {isHost && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm">
                  <Trash2 className="me-2 text-destructive" />
                  مسح الدردشة
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle>
                <AlertDialogDescription>
                  هذا الإجراء سيقوم بحذف سجل الدردشة بالكامل لجميع المستخدمين في الغرفة. لا يمكن التراجع عن هذا الإجراء.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearChat} className="bg-destructive hover:bg-destructive/90">
                  نعم، قم بالمسح
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden p-0">
        <ScrollArea className="h-full" viewportRef={viewportRef}>
           <div className="p-4 space-y-4">
            {messages.length > 0 ? messages.map((msg, index) => (
              <div key={index} className="flex flex-col">
                <span className="font-bold text-sm text-accent">{msg.sender}</span>
                <p className="text-md text-foreground break-words">{msg.text}</p>
              </div>
            )) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <p>لا توجد رسائل بعد. ابدأ المحادثة!</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="flex w-full items-center gap-2">
           {isSeated && (
            <Button type="button" size="icon" variant="ghost" onClick={onToggleMute}>
              {isMuted ? <MicOff className="w-5 h-5 text-destructive" /> : <Mic className="w-5 h-5 text-accent" />}
            </Button>
          )}
          <Input
            type="text"
            placeholder="اكتب رسالتك..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="bg-input border-border focus:ring-accent"
            disabled={isSending}
          />
          <Button type="submit" size="icon" disabled={isSending || !newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
};

export default Chat;
