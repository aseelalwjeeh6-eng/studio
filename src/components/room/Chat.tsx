'use client';

import { useState, useEffect, useRef } from 'react';
import { database } from '@/lib/firebase';
import { ref, onValue, push, set, off } from 'firebase/database';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { User } from '@/app/providers';
import { Trash2, Send, Mic, MicOff, MessageCircle } from 'lucide-react';
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
import { filterProfanity } from '@/ai/flows/profanity-filter';


interface ChatProps {
  roomId: string;
  user: User;
  isHost: boolean;
  isSeated: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
}

export interface Message {
  sender: string;
  text: string;
  timestamp: number;
  isSystemMessage?: boolean;
}

const Chat = ({ roomId, user, isHost, isSeated, isMuted, onToggleMute }: ChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!roomId) return;
    const chatRef = ref(database, `rooms/${roomId}/chat`);
    const listener = onValue(chatRef, (snapshot) => {
      const data = snapshot.val();
      const loadedMessages: Message[] = data ? Object.values(data) : [];
      setMessages(loadedMessages.sort((a, b) => a.timestamp - b.timestamp));
    });
    return () => off(chatRef, 'value', listener);
  }, [roomId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || isSending) return;

    setIsSending(true);
    try {
        const { filteredText } = await filterProfanity({ text: newMessage });

        const chatRef = ref(database, `rooms/${roomId}/chat`);
        const messageData: Message = {
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
    const chatRef = ref(database, `rooms/${roomId}/chat`);
    await set(chatRef, null);
  };

  return (
    <div className="flex flex-col h-full w-full bg-card/50 backdrop-blur-lg rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2"><MessageCircle className="text-accent" /><span>الدردشة</span></h2>
            {isHost && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                      <Trash2 className="me-2 text-destructive" />
                      مسح
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
        </div>
        <div className="flex-grow overflow-y-auto pr-2 space-y-4">
        {messages.length > 0 ? messages.map((msg, index) => (
            <div key={index}>
            {msg.isSystemMessage ? (
                <p className="text-sm text-muted-foreground italic text-center py-1">
                    {msg.text}
                </p>
            ) : (
                <div className="flex flex-col">
                    <span className="font-bold text-sm text-accent">{msg.sender}</span>
                    <p className="text-md text-foreground break-words">{msg.text}</p>
                </div>
            )}
            </div>
        )) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
                <p>لا توجد رسائل بعد. ابدأ المحادثة!</p>
            </div>
        )}
        <div ref={chatEndRef} />
        </div>
        <form onSubmit={handleSendMessage} className="flex w-full items-center gap-2 mt-4">
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
            className="bg-input/80 backdrop-blur-sm border-border focus:ring-accent"
            disabled={isSending}
          />
          <Button type="submit" size="icon" disabled={isSending || !newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
    </div>
  );
};

export default Chat;
