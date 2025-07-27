
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useDrishti } from '@/lib/drishti-context';
import type { Commander } from '@/lib/types';
import { addCommander, deleteCommander } from '@/lib/firebase-service';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function CommanderManagement() {
  const { cameras, commanders, eventId } = useDrishti();
  const { toast } = useToast();

  const [newCommanderName, setNewCommanderName] = useState('');
  const [newCommanderPhone, setNewCommanderPhone] = useState('');
  const [assignedCameraId, setAssignedCameraId] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddCommander = async () => {
    if (!newCommanderName || !newCommanderPhone || !assignedCameraId) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please fill out all fields for the commander.',
      });
      return;
    }
    setIsAdding(true);
    try {
      await addCommander({
        name: newCommanderName,
        contactNumber: newCommanderPhone,
        assignedCameraId,
      }, eventId);
      toast({
        title: 'Commander Added',
        description: `${newCommanderName} has been added to the roster for this event.`,
      });
      setNewCommanderName('');
      setNewCommanderPhone('');
      setAssignedCameraId('');
    } catch (error) {
      console.error("Failed to add commander:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not add the commander. Please try again.',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteCommander = async (commanderId: string) => {
    try {
      await deleteCommander(commanderId);
      toast({
        title: 'Commander Removed',
        description: 'The commander has been removed from the roster.',
      });
    } catch (error) {
      console.error("Failed to delete commander:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not remove the commander. Please try again.',
      });
    }
  };

  const getCameraNameById = (cameraId: string) => {
    const camera = cameras.find(c => c.id === cameraId);
    return camera ? `${camera.name} (${camera.location})` : 'Unknown Camera';
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Commander Configuration</CardTitle>
        <CardDescription>Manage response commanders and their assigned cameras for this event.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 border rounded-lg space-y-4">
          <h3 className="font-medium">Add New Commander</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="commander-name">Name</Label>
              <Input id="commander-name" value={newCommanderName} onChange={(e) => setNewCommanderName(e.target.value)} placeholder="e.g., Jane Doe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commander-phone">Contact Number</Label>
              <Input id="commander-phone" value={newCommanderPhone} onChange={(e) => setNewCommanderPhone(e.target.value)} placeholder="e.g., +15551234567" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="camera-select">Assign to Camera</Label>
              <Select value={assignedCameraId} onValueChange={setAssignedCameraId}>
                <SelectTrigger id="camera-select">
                  <SelectValue placeholder="Select a camera" />
                </SelectTrigger>
                <SelectContent>
                  {cameras.map(camera => (
                    <SelectItem key={camera.id} value={camera.id}>{camera.name} - {camera.location}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddCommander} disabled={isAdding} className="w-full">
                {isAdding ? <Loader2 className="animate-spin" /> : <PlusCircle />}
                {isAdding ? 'Adding...' : 'Add Commander'}
              </Button>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-4">Commander Roster</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact Number</TableHead>
                <TableHead>Assigned Camera</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commanders.map((commander) => (
                <TableRow key={commander.id}>
                  <TableCell>{commander.name}</TableCell>
                  <TableCell>{commander.contactNumber}</TableCell>
                  <TableCell>{getCameraNameById(commander.assignedCameraId)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="destructive" size="icon" onClick={() => handleDeleteCommander(commander.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
               {commanders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No commanders configured for this event.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
