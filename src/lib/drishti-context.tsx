
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Camera, Incident, Alert, CrowdAnalytics, CrowdDetection, IncidentStatus, User, Commander } from './types';
import { mockAlerts } from './mock-data';
import { 
    getCrowdAnalyticsHistory, 
    listenToIncidents, 
    addIncident as addIncidentToDb, 
    listenToCameras, 
    listenToCrowdDetectionsForCamera, 
    updateCameraStatus as updateCameraStatusInDb, 
    updateIncidentStatus as updateIncidentStatusInDb,
    listenToUsers,
    listenToCommanders,
    logCrowdCount as logCrowdCountToDb
} from './firebase-service';
import { format } from 'date-fns';
import { useAuth } from './auth-context';

interface DrishtiContextState {
  eventId: string;
  cameras: Camera[];
  incidents: Incident[];
  alerts: Alert[];
  users: User[];
  commanders: Commander[];
  crowdAnalytics: CrowdAnalytics[];
  crowdDetections: CrowdDetection[];
  logCrowdCount: (count: number) => Promise<void>;
  addIncident: (incident: Omit<Incident, 'id' | 'timestamp' | 'eventId'>) => Promise<string>;
  addAlert: (alert: Omit<Alert, 'eventId'>) => void;
  acknowledgeAlert: (alertId: string, userId: string) => void;
  setSelectedCameraForHeatmap: (cameraId: string) => void;
  updateCameraStatus: (cameraId: string, status: 'Online' | 'Offline' | 'Alert') => void;
  updateIncidentStatus: (incidentId: string, status: IncidentStatus) => Promise<void>;
}

const DrishtiContext = createContext<DrishtiContextState | undefined>(undefined);

export const DrishtiProvider = ({ children, eventId }: { children: ReactNode, eventId: string }) => {
  const { user: authUser } = useAuth();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [commanders, setCommanders] = useState<Commander[]>([]);
  const [crowdAnalytics, setCrowdAnalytics] = useState<CrowdAnalytics[]>([]);
  const [crowdDetections, setCrowdDetections] = useState<CrowdDetection[]>([]);
  const [selectedCameraForHeatmap, setSelectedCameraForHeatmap] = useState<string>('cam-webcam');
  const pathname = usePathname();

  const fetchCrowdAnalytics = useCallback(async () => {
    if (!eventId) return;
    try {
        const history = await getCrowdAnalyticsHistory(eventId, 15);
        const formattedHistory = history.map(dataPoint => ({
            time: format(dataPoint.timestamp.toDate(), 'HH:mm:ss'),
            density: dataPoint.count
        }));
        setCrowdAnalytics(formattedHistory);
    } catch (error) {
        console.error("Failed to fetch crowd analytics:", error);
    }
  }, [eventId]);

  useEffect(() => {
    if (!authUser || !eventId) return;

    const unsubscribeCameras = listenToCameras(eventId, setCameras);
    const unsubscribeUsers = listenToUsers(setUsers);
    const unsubscribeCommanders = listenToCommanders(eventId, setCommanders);
    
    fetchCrowdAnalytics();
    const analyticsTimer = setInterval(fetchCrowdAnalytics, 5000);

    const incidentLimit = pathname.includes('/incidents') ? undefined : 6;
    const unsubscribeIncidents = listenToIncidents(eventId, setIncidents, incidentLimit);


    return () => {
        unsubscribeCameras();
        unsubscribeUsers();
        unsubscribeCommanders();
        clearInterval(analyticsTimer);
        unsubscribeIncidents();
    }
  }, [fetchCrowdAnalytics, pathname, authUser, eventId]);
  
  useEffect(() => {
    if (!selectedCameraForHeatmap || !eventId) return;

    const unsubscribeDetections = listenToCrowdDetectionsForCamera(eventId, selectedCameraForHeatmap, (detections) => {
      setCrowdDetections(detections);
    });

    return () => unsubscribeDetections();
  }, [selectedCameraForHeatmap, eventId]);


  const addIncident = async (incident: Omit<Incident, 'id' | 'timestamp' | 'eventId'>): Promise<string> => {
    return await addIncidentToDb({ ...incident, eventId });
  };

  const logCrowdCount = async (count: number) => {
      await logCrowdCountToDb(eventId, count);
  }
  
  const addAlert = (alert: Omit<Alert, 'eventId'>) => {
    const newAlert: Alert = {
      ...alert,
      eventId,
    }
    setAlerts(prev => [newAlert, ...prev]);
  };
  
  const acknowledgeAlert = (alertId: string, userId: string) => {
    setAlerts(prevAlerts =>
      prevAlerts.map(alert =>
        alert.id === alertId ? { ...alert, acknowledged: true, acknowledgedBy: userId } : alert
      )
    );
  };

  const updateCameraStatus = async (cameraId: string, status: 'Online' | 'Offline' | 'Alert') => {
    try {
      await updateCameraStatusInDb(cameraId, status);
    } catch (error) {
      console.error(`Failed to update status for ${cameraId}:`, error);
    }
  };
  
  const updateIncidentStatus = async (incidentId: string, status: IncidentStatus) => {
    try {
      await updateIncidentStatusInDb(incidentId, status);
    } catch (error) {
      console.error(`Failed to update incident status for ${incidentId}:`, error);
      throw error;
    }
  };

  const value: DrishtiContextState = {
    eventId,
    cameras,
    incidents,
    alerts,
    users,
    commanders,
    crowdAnalytics,
    crowdDetections,
    logCrowdCount,
    addIncident,
    addAlert,
    acknowledgeAlert,
    setSelectedCameraForHeatmap,
    updateCameraStatus,
    updateIncidentStatus,
  };

  return (
    <DrishtiContext.Provider value={value}>
      {children}
    </DrishtiContext.Provider>
  );
};

export const useDrishti = (): DrishtiContextState => {
  const context = useContext(DrishtiContext);
  if (context === undefined) {
    throw new Error('useDrishti must be used within a DrishtiProvider');
  }
  return context;
};
