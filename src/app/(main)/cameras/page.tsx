
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Separator } from '@/components/ui/separator';
import type { AnalyzeCameraFrameOutput } from '@/ai/flows/analyze-camera-frame';
import { useToast } from '@/hooks/use-toast';
import { useDrishti } from '@/lib/drishti-context';
import { listenToAllAnalysisResults, resetAllAnalysis } from '@/lib/firebase-service';
import { Button } from '@/components/ui/button';
import { Loader2, Pause, Play, RefreshCw, ShieldAlert } from 'lucide-react';
import CameraAddForm from '@/components/drishti/camera-add-form';
import CameraGrid from '@/components/drishti/camera-grid';
import CameraTable from '@/components/drishti/camera-table';
import { useAuth } from '@/lib/auth-context';
import ProtectedRoute from '@/components/drishti/protected-route';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function CamerasPage() {
  const { cameras, addIncident, addAlert, eventId } = useDrishti();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [analysisResults, setAnalysisResults] = useState<Record<string, AnalyzeCameraFrameOutput>>({});
  const [isResetting, setIsResetting] = useState(false);
  const [isAnalysisRunning, setIsAnalysisRunning] = useState(true);

  useEffect(() => {
    if (!eventId) return;
    const unsubscribe = listenToAllAnalysisResults(eventId, (results) => {
      setAnalysisResults(results);
    });
    return () => unsubscribe();
  }, [eventId]);

  const handleAnalysisComplete = useCallback(async (
    cameraId: string, 
    result: AnalyzeCameraFrameOutput | null, 
    error: any
  ) => {
    if (error) {
      console.error(`Failed to analyze frame for ${cameraId}:`, error);
      return;
    }

    if (result) {
      if (result.newAlerts && result.newAlerts.length > 0) {
        for (const alertInfo of result.newAlerts) {
          const cameraInfo = cameras.find(c => c.id === cameraId) || { 
              id: cameraId,
              eventId,
              name: cameraId === 'cam-webcam' ? 'Your Webcam' : 'Unknown Camera',
              location: cameraId === 'cam-webcam' ? 'Local Feed' : 'Unknown Location',
              status: 'Online' as const,
              lastSeen: new Date().toISOString(),
              coordinates: { lat: 0, lng: 0 },
              zone: 'Zone-A',
              streamImage: ''
            };

          const incidentData = {
            type: alertInfo.type,
            severity: alertInfo.severity,
            status: 'Active' as const,
            camera: cameraInfo,
            description: alertInfo.description,
          };
          
          const newIncidentId = await addIncident(incidentData);
          addAlert({
            id: `alert-${Date.now()}-${Math.random()}`,
            incidentId: newIncidentId,
            message: alertInfo.description,
            severity: alertInfo.severity,
            timestamp: new Date().toISOString(),
            acknowledged: false,
          });

          toast({
            title: `New Alert: ${alertInfo.type}`,
            description: alertInfo.description,
            variant: 'destructive',
          });
        }
      }
    }
  }, [addIncident, addAlert, toast, cameras, eventId]);

    const handleResetAnalysis = async () => {
    setIsResetting(true);
    try {
      await resetAllAnalysis(eventId);
      toast({
        title: "Analysis Reset",
        description: "All persisted AI analysis data for this event has been cleared.",
      });
    } catch (error) {
      console.error("Failed to reset analysis:", error);
      toast({
        title: "Error",
        description: "Could not reset analysis data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };


  return (
    <ProtectedRoute>
      <div className="p-4 sm:p-6 space-y-6">
        <div className="mb-6">
          <h1 className="font-headline text-2xl font-bold">Camera Management</h1>
          <p className="text-muted-foreground">
            View your camera sources, including live webcams and video uploads for this event.
          </p>
        </div>

        {userProfile?.role === 'Operator' ? (
           <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You do not have the required permissions to access this page. Please contact an administrator if you believe this is an error.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <CameraAddForm />
            
            <Separator />

            <CameraTable />
            
            <Separator />

            <div className="flex justify-between items-center mb-6">
              <div>
                  <h2 className="font-headline text-xl font-bold">Live Camera Feeds</h2>
                  <p className="text-muted-foreground">
                  Real-time monitoring from all active cameras for this event.
                  </p>
              </div>
              <div className="flex items-center gap-4">
                  <Button onClick={() => setIsAnalysisRunning(prev => !prev)} variant="outline">
                      {isAnalysisRunning ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                      {isAnalysisRunning ? 'Pause Analysis' : 'Resume Analysis'}
                  </Button>
                  <Button onClick={handleResetAnalysis} disabled={isResetting} variant="outline">
                    {isResetting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    {isResetting ? 'Resetting...' : 'Reset Analysis'}
                  </Button>
              </div>
            </div>
            <CameraGrid onAnalysisComplete={handleAnalysisComplete} analysisResults={analysisResults} isAnalysisRunning={isAnalysisRunning} />
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
