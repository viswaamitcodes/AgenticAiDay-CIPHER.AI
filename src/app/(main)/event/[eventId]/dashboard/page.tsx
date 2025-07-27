
'use client';

import { useState, useEffect, useCallback } from 'react';
import StatsCard from '@/components/drishti/stats-card';
import CameraGrid from '@/components/drishti/camera-grid';
import IncidentTimeline from '@/components/drishti/incident-timeline';
import AnalyticsCharts from '@/components/drishti/analytics-charts';
import { useDrishti } from '@/lib/drishti-context';
import { Video, ShieldAlert, Users, CheckCircle, RefreshCw, Loader2, Play, Pause } from 'lucide-react';
import type { AnalyzeCameraFrameOutput } from '@/ai/flows/analyze-camera-frame';
import { useToast } from '@/hooks/use-toast';
import { listenToAllAnalysisResults, resetAllAnalysis } from '@/lib/firebase-service';
import { Button } from '@/components/ui/button';
import Heatmap from '@/components/drishti/heatmap';

export default function DashboardPage() {
  const { cameras, incidents, addIncident, addAlert, eventId, logCrowdCount } = useDrishti();
  const { toast } = useToast();

  const [activeIncidentsCount, setActiveIncidentsCount] = useState(
    incidents.filter(inc => inc.status === 'Active').length
  );
  
  const [analysisResults, setAnalysisResults] = useState<Record<string, AnalyzeCameraFrameOutput>>({});
  const [isResetting, setIsResetting] = useState(false);
  const [isAnalysisRunning, setIsAnalysisRunning] = useState(true);
  const [lastLoggedCount, setLastLoggedCount] = useState<number | null>(null);

  const totalCrowdCount = Object.values(analysisResults).reduce((sum, result) => sum + (result?.crowdCount || 0), 0);
  const onlineCameras = cameras.filter(cam => cam.status === 'Online').length;

  useEffect(() => {
    setActiveIncidentsCount(incidents.filter(inc => inc.status === 'Active').length);
  }, [incidents]);

  useEffect(() => {
    if (totalCrowdCount > 0 && totalCrowdCount !== lastLoggedCount) {
      logCrowdCount(totalCrowdCount);
      setLastLoggedCount(totalCrowdCount);
    }
  }, [analysisResults, totalCrowdCount, lastLoggedCount, logCrowdCount]);

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

    if (result && result.newAlerts && result.newAlerts.length > 0) {
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
  }, [addIncident, addAlert, toast, cameras, eventId]);

  const handleResetAnalysis = async () => {
    setIsResetting(true);
    try {
      if (eventId) {
        await resetAllAnalysis(eventId);
        toast({
          title: "Analysis Reset",
          description: "All persisted AI analysis data for this event has been cleared.",
        });
      }
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
    <div className="p-4 sm:p-6">
       <div className="mb-4 flex items-center justify-end gap-4">
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

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="Active Incidents"
          value={String(activeIncidentsCount)}
          icon={ShieldAlert}
          description="Incidents requiring immediate attention."
          className="border-l-4 border-l-high"
        />
        <StatsCard
          title="Crowd Count (Live)"
          value={String(totalCrowdCount)}
          icon={Users}
          description="Total estimated from all feeds."
          className="border-l-4 border-l-primary"
        />
        <StatsCard
          title="System Status"
          value="Operational"
          icon={CheckCircle}
          description="All systems are running smoothly."
          className="border-l-4 border-l-success"
        />
        <StatsCard
          title="Cameras Online"
          value={`${onlineCameras + 1} / ${cameras.length + 1}`}
          icon={Video}
          description="Total number of operational cameras."
          className="border-l-4 border-l-low"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <CameraGrid onAnalysisComplete={handleAnalysisComplete} analysisResults={analysisResults} isAnalysisRunning={isAnalysisRunning} />
          <AnalyticsCharts />
        </div>
        <div className="flex flex-col gap-6 lg:col-span-1">
          <Heatmap />
          <IncidentTimeline />
        </div>
      </div>
    </div>
  );
}

