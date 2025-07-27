
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, PlusCircle, ArrowRight } from 'lucide-react';
import { collection, addDoc, onSnapshot, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DrishtiEvent } from '@/lib/types';
import { format } from 'date-fns';
import ProtectedRoute from '@/components/drishti/protected-route';

const EVENTS_COLLECTION = 'events';

export default function EventSelectionPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<DrishtiEvent[]>([]);
  const [newEventName, setNewEventName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const q = query(collection(db, EVENTS_COLLECTION), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const eventsData: DrishtiEvent[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        eventsData.push({
          id: doc.id,
          name: data.name,
          createdAt: (data.createdAt?.toDate() || new Date()).toISOString(),
          userId: data.userId
        });
      });
      setEvents(eventsData);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleCreateEvent = async () => {
    if (!newEventName.trim() || !user) return;
    setIsCreating(true);
    try {
      const docRef = await addDoc(collection(db, EVENTS_COLLECTION), {
        name: newEventName,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
      router.push(`/event/${docRef.id}/dashboard`);
    } catch (error) {
      console.error('Error creating event:', error);
      // Optionally, show a toast notification
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectEvent = (eventId: string) => {
    router.push(`/event/${eventId}/dashboard`);
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">Welcome to Drishti AI</CardTitle>
            <CardDescription>Select an event to monitor or create a new one to begin.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 border rounded-lg space-y-4">
              <h3 className="font-medium">Create New Event</h3>
              <div className="flex items-end gap-4">
                <div className="flex-grow space-y-2">
                  <Label htmlFor="event-name">Event Name</Label>
                  <Input
                    id="event-name"
                    value={newEventName}
                    onChange={(e) => setNewEventName(e.target.value)}
                    placeholder="e.g., Music Festival 2024"
                    disabled={isCreating}
                  />
                </div>
                <Button onClick={handleCreateEvent} disabled={isCreating || !newEventName.trim()}>
                  {isCreating ? <Loader2 className="animate-spin" /> : <PlusCircle />}
                  {isCreating ? 'Creating...' : 'Create Event'}
                </Button>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-4">Or Select an Existing Event</h3>
              {isLoading ? (
                 <div className="flex justify-center items-center h-24">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 </div>
              ) : (
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Event Name</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {events.length > 0 ? (
                            events.map((event) => (
                            <TableRow key={event.id}>
                                <TableCell className="font-medium">{event.name}</TableCell>
                                <TableCell>{format(new Date(event.createdAt), 'PPpp')}</TableCell>
                                <TableCell className="text-right">
                                <Button size="sm" onClick={() => handleSelectEvent(event.id)}>
                                    Open <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                                </TableCell>
                            </TableRow>
                            ))
                        ) : (
                            <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center">
                                No events found. Create one to get started.
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
