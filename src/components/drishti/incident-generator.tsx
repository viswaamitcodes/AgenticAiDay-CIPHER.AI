
'use client';

import { useState, useMemo, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { generateIncidentSummary, type GenerateIncidentSummaryInput } from '@/ai/flows/real-time-incident-summary';
import { useDrishti } from '@/lib/drishti-context';
import type { Camera, IncidentType } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertTriangle, Wand2, Upload } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import React from 'react';

const incidentTypes: IncidentType[] = ['Crowd surge', 'Unauthorized access', 'Suspicious behavior', 'Emergency', 'Theft'];

const PLACEHOLDER_IMAGE_DATA_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

function IncidentGeneratorContent() {
  const { cameras } = useDrishti();
  const searchParams = useSearchParams();
  const cameraIdFromUrl = searchParams.get('cameraId');

  const [selectedCameraId, setSelectedCameraId] = useState<string>(cameraIdFromUrl || (cameras.length > 0 ? cameras[0].id : ''));
  const [selectedIncidentType, setSelectedIncidentType] = useState<IncidentType>(incidentTypes[0]);
  const [summary, setSummary] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaSource, setMediaSource] = useState('webcam');
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoDataUri, setVideoDataUri] = useState<string | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (cameraIdFromUrl) {
      setSelectedCameraId(cameraIdFromUrl);
    }
  }, [cameraIdFromUrl]);

  useEffect(() => {
    if (mediaSource !== 'webcam') return;

    const getCameraPermission = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCameraPermission(false);
        return;
      }
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use this app.',
        });
      }
    };

    getCameraPermission();
    
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [toast, mediaSource]);


  const selectedCamera = useMemo(() => {
    return cameras.find((cam) => cam.id === selectedCameraId);
  }, [selectedCameraId, cameras]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setError(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUri = e.target?.result as string;
        setVideoDataUri(dataUri);
        setVideoSrc(URL.createObjectURL(file));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateSummary = async () => {
    if (!selectedCamera) return;

    let cameraStream = PLACEHOLDER_IMAGE_DATA_URI;
    if (mediaSource === 'upload' && videoDataUri) {
        cameraStream = videoDataUri;
    } else if (mediaSource === 'webcam' && videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        if (stream.active) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                cameraStream = canvas.toDataURL('image/jpeg');
            }
        }
    } else if (mediaSource === 'upload' && !videoDataUri) {
        setError('Please upload a video file first.');
        return;
    }


    setIsLoading(true);
    setError(null);
    setSummary('');

    try {
      const input: GenerateIncidentSummaryInput = {
        cameraStream,
        incidentType: selectedIncidentType,
        location: selectedCamera.location,
      };

      const result = await generateIncidentSummary(input);
      setSummary(result.summary);
    } catch (e) {
      console.error(e);
      setError('Failed to generate summary. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <Card className="h-full">
           <Tabs value={mediaSource} onValueChange={setMediaSource} className="w-full">
            <CardHeader>
                <CardTitle>Live Feed</CardTitle>
                <div className="flex justify-between items-center">
                    <CardDescription>{selectedCamera?.name} - {selectedCamera?.location}</CardDescription>
                    <TabsList>
                        <TabsTrigger value="webcam">Webcam</TabsTrigger>
                        <TabsTrigger value="upload">Upload</TabsTrigger>
                    </TabsList>
                </div>
            </CardHeader>
            <CardContent>
                <TabsContent value="webcam">
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
                         <video ref={videoRef} className="h-full w-full object-cover" autoPlay muted playsInline />
                         {hasCameraPermission === false && (
                             <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
                                <Alert variant="destructive" className="w-4/5">
                                  <AlertTitle>Camera Access Required</AlertTitle>
                                  <AlertDescription>
                                    Please allow camera access.
                                  </AlertDescription>
                                </Alert>
                             </div>
                          )}
                    </div>
                </TabsContent>
                <TabsContent value="upload">
                  <div className="aspect-video w-full overflow-hidden rounded-lg border">
                    {videoSrc ? (
                      <video src={videoSrc} className="h-full w-full object-cover" controls autoPlay muted playsInline loop />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center space-y-4 bg-muted">
                        <Upload className="h-12 w-12 text-muted-foreground" />
                        <Label htmlFor="video-upload" className="cursor-pointer text-primary hover:underline">
                          Click to upload a video
                        </Label>
                        <Input id="video-upload" type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
                      </div>
                    )}
                  </div>
                </TabsContent>
            </CardContent>
           </Tabs>
        </Card>
      </div>

      <div className="flex flex-col gap-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Generation Controls</CardTitle>
            <CardDescription>Select a camera, incident type, and media source to generate a report.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="camera-select">Camera Location</Label>
              <Select value={selectedCameraId} onValueChange={setSelectedCameraId}>
                <SelectTrigger id="camera-select" aria-label="Select camera">
                  <SelectValue placeholder="Select a camera location" />
                </SelectTrigger>
                <SelectContent>
                  {cameras.map((camera: Camera) => (
                    <SelectItem key={camera.id} value={camera.id}>
                      {camera.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="incident-type-select">Incident Type</Label>
              <Select value={selectedIncidentType} onValueChange={(value) => setSelectedIncidentType(value as IncidentType)}>
                 <SelectTrigger id="incident-type-select" aria-label="Select incident type">
                  <SelectValue placeholder="Select an incident type" />
                </SelectTrigger>
                <SelectContent>
                  {incidentTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
             <Button onClick={handleGenerateSummary} disabled={isLoading} className="w-full">
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              Generate Summary
            </Button>
          </CardContent>
        </Card>

        <Card className="flex-grow">
          <CardHeader>
            <CardTitle>AI Generated Summary</CardTitle>
            <CardDescription>A concise summary of the event based on the selected inputs.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {summary && !isLoading && (
              <Textarea
                readOnly
                value={summary}
                className="h-32 resize-none bg-muted"
                aria-label="AI Generated Summary"
              />
            )}
            {!summary && !isLoading && !error && (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed">
                <p className="text-sm text-muted-foreground">Summary will appear here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Wrap the component in Suspense to handle the client-side `useSearchParams` hook.
export default function IncidentGenerator() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <IncidentGeneratorContent />
    </Suspense>
  );
}
