'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Armchair, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { User as UserType } from '@/app/providers';

export type Seat = {
  id: number;
  user: UserType | null;
};

interface SeatsProps {
  seats: Seat[];
  onTakeSeat: (seatId: number) => void;
}

const Seats = ({ seats, onTakeSeat }: SeatsProps) => {
  const avatarImages = PlaceHolderImages.filter(p => p.id.startsWith('avatar'));

  return (
    <Card className="bg-card/50 backdrop-blur-lg border-accent/20">
      <CardContent className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {seats.map((seat, index) => (
            <div
              key={seat?.id ?? index}
              onClick={() => !seat?.user && onTakeSeat(seat.id)}
              className={cn(
                'aspect-square rounded-lg flex flex-col items-center justify-center gap-2 transition-all',
                !seat?.user ? 'cursor-pointer bg-muted/30 hover:bg-muted/50' : 'cursor-default'
              )}
            >
              {seat?.user ? (
                <>
                  <Avatar className="h-16 w-16 border-2 border-accent">
                    <AvatarImage src={avatarImages[index % avatarImages.length]?.imageUrl} data-ai-hint={avatarImages[index % avatarImages.length]?.imageHint} />
                    <AvatarFallback><User /></AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-foreground truncate">{seat.user.name}</span>
                </>
              ) : (
                <>
                  <Armchair className="h-16 w-16 text-muted-foreground/50" />
                  <span className="text-sm text-muted-foreground">مقعد فارغ</span>
                </>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default Seats;
