
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDrishti } from '@/lib/drishti-context';
import type { Camera, CameraStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { analyzeCameraFrame, AnalyzeCameraFrameOutput } from '@/ai/flows/analyze-camera-frame';
import { saveAnalysisResult, updateCrowdDetectionsFromAnalysis } from '@/lib/firebase-service';
import { Loader2, Users, AlertCircle } from 'lucide-react';

const statusVariantMap: Record<CameraStatus, 'online' | 'offline' | 'destructive'> = {
  Online: 'online',
  Offline: 'offline',
  Alert: 'destructive',
};

interface CameraGridProps {
  onAnalysisComplete: (cameraId: string, result: AnalyzeCameraFrameOutput | null, error: any) => void;
  analysisResults: Record<string, AnalyzeCameraFrameOutput>;
  isAnalysisRunning: boolean;
}

export default function CameraGrid({ onAnalysisComplete, analysisResults, isAnalysisRunning }: CameraGridProps) {
  const { cameras, updateCameraStatus, eventId } = useDrishti();
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const { toast } = useToast();

  const [loadingState, setLoadingState] = useState<Record<string, boolean>>({});
  const [errorState, setErrorState] = useState<Record<string, string | null>>({});
  const lastAnalysisTime = useRef<Record<string, number>>({});
  const animationFrameId = useRef<number>();

  useEffect(() => {
    // Assign the webcam ref
    videoRefs.current['cam-webcam'] = document.getElementById('video-cam-webcam') as HTMLVideoElement;
    // Assign other camera refs
    cameras.forEach(camera => {
      videoRefs.current[camera.id] = document.getElementById(`video-${camera.id}`) as HTMLVideoElement;
    });
  }, [cameras]);


  const captureFrameAndAnalyze = useCallback(async (cameraId: string) => {
    const videoElement = videoRefs.current[cameraId];
    if (!videoElement || videoElement.readyState < 3 || loadingState[cameraId] || errorState[cameraId] || videoElement.paused || !isAnalysisRunning) {
      return;
    }
  
    setLoadingState(prev => ({ ...prev, [cameraId]: true }));
    
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setLoadingState(prev => ({ ...prev, [cameraId]: false }));
      return;
    }
  
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    const frameDataUri = canvas.toDataURL('image/jpeg');
  
    try {
      const result = await analyzeCameraFrame({ frameDataUri });
      await saveAnalysisResult(eventId, cameraId, result);
      await updateCrowdDetectionsFromAnalysis(eventId, cameraId, result.peoplePositions);
      onAnalysisComplete(cameraId, result, null);
    } catch (error) {
      console.error(`Analysis failed for ${cameraId}:`, error);
      onAnalysisComplete(cameraId, null, error);
      toast({
        title: "Analysis Failed",
        description: `Could not analyze feed for ${cameraId}. The AI model may have returned an error.`,
        variant: "destructive"
      });
    } finally {
      setLoadingState(prev => ({ ...prev, [cameraId]: false }));
    }
  }, [onAnalysisComplete, toast, loadingState, errorState, isAnalysisRunning, eventId]);


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
        const webcamVideoElement = document.getElementById('video-cam-webcam') as HTMLVideoElement;
        if (webcamVideoElement) {
          webcamVideoElement.srcObject = stream;
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
      Object.values(videoRefs.current).forEach(videoElement => {
        if (videoElement && videoElement.srcObject) {
          const stream = videoElement.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
        }
      });
    };
  }, [toast]);
  
  useEffect(() => {
    const analysisLoop = () => {
        if (!isAnalysisRunning) {
            animationFrameId.current = requestAnimationFrame(analysisLoop);
            return;
        }

        const now = Date.now();
        Object.keys(videoRefs.current).forEach(cameraId => {
            const lastTime = lastAnalysisTime.current[cameraId] || 0;
            if (now - lastTime > 2000) { // Throttle to 2 seconds
                lastAnalysisTime.current[cameraId] = now;
                captureFrameAndAnalyze(cameraId);
            }
        });

        animationFrameId.current = requestAnimationFrame(analysisLoop);
    };

    animationFrameId.current = requestAnimationFrame(analysisLoop);

    return () => {
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
        }
    };
  }, [isAnalysisRunning, captureFrameAndAnalyze]);

  const handleVideoError = useCallback((cameraId: string) => {
    setErrorState(prev => ({
        ...prev,
        [cameraId]: "The video failed to load. The source might be an unsupported format, a network error occurred (e.g., CORS, Mixed Content), or the URL is incorrect. Ensure the stream URL is correct and the server is properly configured.",
    }));
    updateCameraStatus(cameraId, 'Alert');
  }, [updateCameraStatus]);

  const handleVideoEnded = useCallback(async (camera: Camera) => {
    if (camera.location !== 'Live Stream') return;
  
    const videoElement = videoRefs.current[camera.id];
    if (videoElement) {
      try {
        // Append a timestamp to the URL to bypass the cache.
        const url = new URL(camera.streamImage);
        url.searchParams.set('t', Date.now().toString());

        // Fetch the video data directly, explicitly bypassing the browser cache.
        const response = await fetch(url.href, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Failed to fetch stream: ${response.status} ${response.statusText}`);
        }
        const videoBlob = await response.blob();
        const objectURL = URL.createObjectURL(videoBlob);
        
        // Clean up the old object URL from memory to prevent leaks.
        if (videoElement.src && videoElement.src.startsWith('blob:')) {
          URL.revokeObjectURL(videoElement.src);
        }
  
        // Set the new source and play the video.
        videoElement.src = objectURL;
        await videoElement.play();
      } catch (error) {
        console.error('Error reloading video stream:', error);
        handleVideoError(camera.id);
      }
    }
  }, [handleVideoError]);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Camera Feeds</CardTitle>
        <CardDescription>Real-time monitoring from active cameras with AI-powered crowd count.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {/* Webcam Feed */}
        <div className="group relative">
          <video 
            id="video-cam-webcam"
            className="w-full aspect-video rounded-md bg-muted" 
            autoPlay 
            muted 
            playsInline
          />
          
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

          <div className="absolute bottom-0 left-0 right-0 flex items-end rounded-b-lg bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
            <div className="flex w-full items-center justify-between">
              <div>
                <h3 className="font-semibold">Your Webcam</h3>
                <p className="text-xs text-slate-300">Live Feed</p>
              </div>
              <Badge variant={hasCameraPermission ? 'online' : 'offline'}>
                {hasCameraPermission ? 'Online' : 'Offline'}
              </Badge>
            </div>
          </div>
           {/* Crowd Count Overlay */}
           <div className="absolute right-4 top-4 z-10">
            {loadingState['cam-webcam'] && <Loader2 className="h-5 w-5 animate-spin text-white" />}
            {analysisResults['cam-webcam'] && !loadingState['cam-webcam'] && (
              <Badge variant="secondary" className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                {analysisResults['cam-webcam'].crowdCount}
              </Badge>
            )}
          </div>
        </div>

        {/* Other Camera Feeds */}
        {cameras.map((camera) => (
          <div key={camera.id} className="group relative">
            <video
              id={`video-${camera.id}`}
              src={camera.streamImage}
              className="rounded-lg object-cover w-full aspect-video bg-muted"
              autoPlay
              muted
              playsInline
              loop={camera.location !== 'Live Stream'}
              crossOrigin="anonymous"
              onEnded={() => handleVideoEnded(camera)}
              onError={() => handleVideoError(camera.id)}
            />
            {errorState[camera.id] && (
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-black/70 p-4 text-center text-white">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                  <p className="mt-2 text-sm font-semibold">Stream Error</p>
                  <p className="mt-1 text-xs">{errorState[camera.id]}</p>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 flex items-end rounded-b-lg bg-gradient-to-t from-black/80 via-transparent to-transparent p-4 text-white opacity-100 transition-opacity">
                <div className="flex w-full items-center justify-between">
                    <div>
                        <h3 className="font-semibold">{camera.name}</h3>
                        <p className="text-xs text-muted-foreground">{camera.location}</p>
                    </div>
                    <Badge variant={statusVariantMap[camera.status]}>{camera.status}</Badge>
                </div>
            </div>
             {/* Crowd Count Overlay */}
            <div className="absolute right-4 top-4 z-10">
              {loadingState[camera.id] && !errorState[camera.id] && <Loader2 className="h-5 w-5 animate-spin text-white" />}
              {analysisResults?.[camera.id] && !loadingState[camera.id] && !errorState[camera.id] && (
                <Badge variant="secondary" className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4" />
                  {analysisResults[camera.id].crowdCount}
                </Badge>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
