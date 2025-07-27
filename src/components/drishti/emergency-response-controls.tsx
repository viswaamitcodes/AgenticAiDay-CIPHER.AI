
'use client';

import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { set, ref, onValue, off } from "firebase/database";
import { rtdb } from '@/lib/firebase';
import type { EmergencyType } from '@/lib/types';
import { useDrishti } from '@/lib/drishti-context';

import { Button } from '@/components/ui/button';
import { Siren, Shield, Ambulance, FireExtinguisher, Wind, Ban, Video, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '../ui/label';
import { setIotStatus, listenToIotStatus } from '@/lib/firebase-service';


const emergencyTypes: { type: EmergencyType; label: string; icon: React.ElementType; className: string, sound: string }[] = [
  { type: 'Police', label: 'Police', icon: Shield, className: 'bg-blue-600 hover:bg-blue-700', sound: '/sounds/police-siren.mp3' },
  { type: 'Ambulance', label: 'Ambulance', icon: Ambulance, className: 'bg-red-600 hover:bg-red-700', sound: '/sounds/ambulance-siren.mp3' },
  { type: 'Fire', label: 'Fire Alarm', icon: FireExtinguisher, className: 'bg-orange-600 hover:bg-orange-700', sound: '/sounds/fire-truck-siren.mp3' },
  { type: 'Drone', label: 'Deploy Drone', icon: Wind, className: 'bg-gray-600 hover:bg-gray-700', sound: '/sounds/drone-sound.mp3' },
];

export default function EmergencyResponseControls() {
  const { toast } = useToast();
  const { cameras, commanders, addIncident, addAlert, eventId } = useDrishti();
  const [activeEmergency, setActiveEmergency] = useState<EmergencyType>('None');
  const [selectedCameraId, setSelectedCameraId] = useState<string>('global');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const unsubscribe = listenToIotStatus((status) => {
        const currentStatus = status || 'None';
        setActiveEmergency(currentStatus);
        
        const emergencyInfo = emergencyTypes.find(e => e.type === currentStatus);
        const audio = audioRef.current;
        
        if (!audio) return;
        
        try {
            if (emergencyInfo && audio.src !== window.location.origin + emergencyInfo.sound) {
            audio.src = emergencyInfo.sound;
            audio.loop = true;
            audio.play().catch(e => console.error("Audio play failed:", e));
            } else if (currentStatus === 'None') {
            audio.pause();
            audio.currentTime = 0;
            audio.src = '';
            }
        } catch (error) {
            console.error(`Audio playback error for ${currentStatus}:`, error);
        }
    });

    return () => {
      unsubscribe();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []); 
  
   useEffect(() => {
    audioRef.current = new Audio();
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);


  const handleTriggerEmergency = async (emergency: typeof emergencyTypes[0]) => {
    try {
      await setIotStatus(eventId, selectedCameraId, emergency.type);
      
      let toastDescription = `Broadcasting global ${emergency.label.toLowerCase()} alert.`;

      if (selectedCameraId !== 'global') {
          const camera = cameras.find(c => c.id === selectedCameraId);
          if (camera) {
              const commander = commanders.find(c => c.assignedCameraId === selectedCameraId);
              const commanderName = commander ? commander.name : 'the assigned commander';

              const incidentId = await addIncident({
                  type: 'Emergency',
                  severity: 'Critical',
                  status: 'Active',
                  camera: camera,
                  description: `Manual ${emergency.label} signal triggered for ${camera.name}.`,
              });

              addAlert({
                  id: `alert-${Date.now()}`,
                  incidentId,
                  message: `${emergency.label} alert for ${camera.name}. Notifying ${commanderName}.`,
                  severity: 'Critical',
                  timestamp: new Date().toISOString(),
                  acknowledged: false,
              });

              toastDescription += ` Alert also sent to ${commanderName} for response at ${camera.name}.`;
          }
      }

      toast({
        title: `${emergency.label} Signal Activated!`,
        description: toastDescription,
      });

    } catch (error) {
        console.error("Error triggering emergency:", error);
        toast({
            variant: "destructive",
            title: "Failed to Trigger",
            description: "Could not send command to the IoT device."
        })
    }
  };

  const handleCancelEmergency = async () => {
    try {
        await setIotStatus(eventId, selectedCameraId, 'None');
        toast({
            title: 'Alert Canceled',
            description: `Global command has been reset. All units should stand down.`,
        });
    } catch (error) {
        console.error("Error canceling emergency:", error);
         toast({
            variant: "destructive",
            title: "Failed to Cancel",
            description: "Could not send cancel command."
        })
    }
  };

  return (
    <div className="space-y-6">
       <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle>Emergency Triggers</CardTitle>
          <CardDescription>
            Select a specific camera for targeted alerts, or "Global Broadcast" for a system-wide hardware trigger. All button presses activate global hardware.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <div className="max-w-md space-y-2">
            <Label htmlFor="camera-select">Alert Target</Label>
            <Select value={selectedCameraId} onValueChange={setSelectedCameraId}>
              <SelectTrigger id="camera-select">
                <SelectValue placeholder="Select a target..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" /> Global Broadcast (Hardware Only)
                  </div>
                </SelectItem>
                {cameras.map(camera => (
                  <SelectItem key={camera.id} value={camera.id}>
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4" /> {camera.name} ({camera.location})
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
           </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {emergencyTypes.map((emergency) => {
            const Icon = emergency.icon;
            const isActive = activeEmergency === emergency.type;
            return (
              <Button
                key={emergency.type}
                onClick={() => handleTriggerEmergency(emergency)}
                disabled={activeEmergency !== 'None' && !isActive}
                className={cn(
                  "h-24 text-lg flex-col gap-2",
                  emergency.className,
                  isActive && "ring-4 ring-offset-2 ring-offset-background ring-white"
                 )}
              >
                <Icon className="h-8 w-8" />
                {emergency.label}
              </Button>
            );
          })}
           <Button
              onClick={handleCancelEmergency}
              disabled={activeEmergency === 'None'}
              className="h-24 text-lg flex-col gap-2 bg-green-600 hover:bg-green-700"
            >
              <Ban className="h-8 w-8" />
              Cancel All
            </Button>
      </div>
    </div>
  );
}
