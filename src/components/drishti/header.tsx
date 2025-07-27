
'use client';

import { Menu, Bot, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSidebar } from '@/components/ui/sidebar';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DrishtiEvent } from '@/lib/types';
import { Separator } from '../ui/separator';

export default function Header() {
  const { toggleSidebar } = useSidebar();
  const { userProfile, logOut } = useAuth();
  const router = useRouter();
  const params = useParams();
  const eventId = params.eventId as string;
  const [currentEvent, setCurrentEvent] = useState<DrishtiEvent | null>(null);

  useEffect(() => {
    if (!eventId) return;

    const fetchEvent = async () => {
        const eventDocRef = doc(db, 'events', eventId);
        const eventDocSnap = await getDoc(eventDocRef);

        if (eventDocSnap.exists()) {
            setCurrentEvent(eventDocSnap.data() as DrishtiEvent);
        }
    }

    fetchEvent();
  }, [eventId])

  const handleLogout = async () => {
    await logOut();
    router.push('/login');
  };
  
  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle Sidebar</span>
      </Button>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
            <Bot className="h-7 w-7 text-primary" />
            <h1 className="font-headline text-xl font-semibold">Drishti AI</h1>
        </div>
        <Separator orientation="vertical" className="h-6" />
        <div className="text-sm text-muted-foreground">by cipher.ai</div>
      </div>
      
      {currentEvent && (
        <div className="ml-4 hidden md:block">
            <span className="font-medium text-muted-foreground">Event:</span>{' '}
            <span className="font-semibold text-foreground">{currentEvent.name}</span>
        </div>
      )}


      <div className="relative ml-auto flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={userProfile?.avatar} alt={userProfile?.name} />
                <AvatarFallback>{userProfile ? getInitials(userProfile.name) : '...'}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{userProfile?.name || 'Loading...'}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {eventId && <Link href={`/event/${eventId}/settings`} passHref>
              <DropdownMenuItem as="a">Settings</DropdownMenuItem>
            </Link>}
            <DropdownMenuItem>Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
