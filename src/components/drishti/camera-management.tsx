
'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Upload, Video, ScanSearch, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { addCamera, uploadVideo } from '@/lib/firebase-service';
import { useDrishti } from '@/lib/drishti-context';

export default function CameraManagement() {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  const { refreshCameras } = useDrishti();


  useEffect(() => {
    const getCameraPermission = async () => {
       if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('Camera API not supported in this browser.');
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Unsupported Browser',
          description: 'Your browser does not support camera access.',
        });
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
          description: 'Please enable camera permissions in your browser settings.',
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
  }, [toast]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoSrc(URL.createObjectURL(file));
    }
  };
  
  const handleUploadAndAnalyze = async () => {
    if (!videoFile) return;

    setIsUploading(true);
    try {
      const videoUrl = await uploadVideo(videoFile);
      const newCamera = {
        id: `cam-${Date.now()}`,
        name: videoFile.name,
        location: 'Uploaded Video',
        status: 'Online' as const,
        lastSeen: new Date().toISOString(),
        coordinates: { lat: 0, lng: 0 },
        zone: 'Uploaded',
        streamImage: videoUrl,
      };
      await addCamera(newCamera);
      await refreshCameras(); // Refresh the camera list after adding a new one.
      toast({
        title: 'Upload Successful',
        description: 'Your video has been uploaded and added as a new camera source.',
      });
      setVideoFile(null);
      setVideoSrc(null);
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: 'Could not upload the video. Please try again.',
      });
    } finally {
      setIsUploading(false);
    }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Camera Sources</CardTitle>
        <CardDescription>View live feeds and uploaded videos.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Live Webcam
            </CardTitle>
            <CardDescription>Your primary device camera.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
              <video ref={videoRef} className="h-full w-full object-cover" autoPlay muted playsInline />
              {hasCameraPermission === false && (
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-black/60 p-4 text-center">
                   <Alert variant="destructive" className="w-full">
                    <AlertTitle>Camera Access Required</AlertTitle>
                    <AlertDescription>
                      Please enable camera permissions in your browser.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between">
                <Badge variant={hasCameraPermission ? 'online' : 'offline'}>
                    {hasCameraPermission ? 'Online' : 'Offline'}
                </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Video
            </CardTitle>
            <CardDescription>Upload a video file for analysis.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="aspect-video w-full overflow-hidden rounded-lg border bg-muted">
              {videoSrc ? (
                <video src={videoSrc} className="h-full w-full object-cover" controls autoPlay muted playsInline loop />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center space-y-4">
                  <Upload className="h-12 w-12 text-muted-foreground" />
                  <Label htmlFor="video-upload" className="cursor-pointer text-primary hover:underline">
                    Click to upload a video
                  </Label>
                  <Input id="video-upload" type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
                </div>
              )}
            </div>
             <div className="mt-4 flex items-center justify-between">
                <Badge variant={videoSrc ? 'online' : 'offline'}>
                    {videoSrc ? 'Ready' : 'No Video'}
                </Badge>
                <Button onClick={handleUploadAndAnalyze} disabled={!videoFile || isUploading}>
                  {isUploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {isUploading ? 'Uploading...' : 'Upload'}
                </Button>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
