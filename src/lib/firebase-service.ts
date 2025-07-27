

import { collection, getDocs, setDoc, doc, writeBatch, getDoc, onSnapshot, query, addDoc, serverTimestamp, orderBy, limit, where, Timestamp, deleteDoc, updateDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, rtdb } from './firebase';
import type { Camera, CrowdAnalyticsDataPoint, Incident, CrowdDetection, CameraStatus, Commander, EmergencyType, IncidentStatus, UserProfile, UserRole } from './types';
import type { AnalyzeCameraFrameOutput } from '@/ai/flows/analyze-camera-frame';
import { ref as dbRef, set, onValue, off } from 'firebase/database';

const CAMERAS_COLLECTION = 'cameras';
const ANALYSIS_RESULTS_COLLECTION = 'analysis_results';
const CROWD_ANALYTICS_HISTORY_COLLECTION = 'crowd_analytics_history';
const INCIDENTS_COLLECTION = 'incidents';
const CROWD_DETECTIONS_COLLECTION = 'crowd_detections';
const COMMANDERS_COLLECTION = 'commanders';
const IOT_STATUS_COLLECTION = 'iot_status';
const USERS_COLLECTION = 'users';


// Function to listen to camera changes in real-time
export function listenToCameras(eventId: string, callback: (cameras: Camera[]) => void) {
    const q = query(collection(db, CAMERAS_COLLECTION), where('eventId', '==', eventId));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const cameras: Camera[] = [];
        querySnapshot.forEach((doc) => {
            cameras.push(doc.data() as Camera);
        });
        callback(cameras);
    });
    return unsubscribe;
}

// Function to add a new camera to Firestore
export async function addCamera(camera: Omit<Camera, 'id'>, eventId: string): Promise<void> {
    try {
        const id = `cam-${Date.now()}`;
        const newCamera: Camera = {
            id,
            eventId,
            ...camera,
        }
        await setDoc(doc(db, CAMERAS_COLLECTION, id), newCamera);
    } catch (error) {
        console.error("Error adding camera: ", error);
        throw error;
    }
}

// Function to delete a camera from Firestore
export async function deleteCamera(cameraId: string): Promise<void> {
    try {
        await deleteDoc(doc(db, CAMERAS_COLLECTION, cameraId));
    } catch (error) {
        console.error("Error deleting camera: ", error);
        throw error;
    }
}

// Function to update a camera's status
export async function updateCameraStatus(cameraId: string, status: CameraStatus): Promise<void> {
    try {
        await updateDoc(doc(db, CAMERAS_COLLECTION, cameraId), { status });
    } catch (error) {
        console.error("Error updating camera status: ", error);
        throw error;
    }
}


// Function to upload a video to Firebase Storage
export async function uploadVideo(file: File, eventId: string): Promise<string> {
    try {
        const videoStorageRef = storageRef(storage, `events/${eventId}/videos/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(videoStorageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (error) {
        console.error("Error uploading video: ", error);
        throw error;
    }
}

// === Analysis Persistence ===

// Save analysis result for a specific camera
export async function saveAnalysisResult(eventId: string, cameraId: string, result: AnalyzeCameraFrameOutput): Promise<void> {
  try {
    const docId = `${eventId}_${cameraId}`;
    await setDoc(doc(db, ANALYSIS_RESULTS_COLLECTION, docId), { ...result, eventId, cameraId });
  } catch (error) {
    console.error(`Error saving analysis for ${cameraId}:`, error);
    throw error;
  }
}

// Listen for all analysis results in real-time for an event
export function listenToAllAnalysisResults(eventId: string, callback: (results: Record<string, AnalyzeCameraFrameOutput>) => void) {
  const q = query(collection(db, ANALYSIS_RESULTS_COLLECTION), where('eventId', '==', eventId));
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const results: Record<string, AnalyzeCameraFrameOutput> = {};
    querySnapshot.forEach((doc) => {
        const data = doc.data() as any;
        results[data.cameraId] = data as AnalyzeCameraFrameOutput;
    });
    callback(results);
  });
  return unsubscribe;
}


// Reset all analysis data for an event
export async function resetAllAnalysis(eventId: string): Promise<void> {
  try {
    const batch = writeBatch(db);
    
    const collectionsToClear = [
        ANALYSIS_RESULTS_COLLECTION, 
        CROWD_ANALYTICS_HISTORY_COLLECTION, 
        INCIDENTS_COLLECTION, 
        CROWD_DETECTIONS_COLLECTION
    ];

    for(const collectionName of collectionsToClear) {
        const snapshot = await getDocs(query(collection(db, collectionName), where('eventId', '==', eventId)));
        snapshot.docs.forEach((d) => {
          batch.delete(d.ref);
        });
    }
    
    await batch.commit();
  } catch (error) {
    console.error("Error resetting analysis data:", error);
    throw error;
  }
}

// === Crowd Analytics History ===

export async function logCrowdCount(eventId: string, totalCount: number): Promise<void> {
    try {
        await addDoc(collection(db, CROWD_ANALYTICS_HISTORY_COLLECTION), {
            eventId,
            count: totalCount,
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.error("Error logging crowd count:", error);
    }
}

export async function getCrowdAnalyticsHistory(eventId: string, minutes: number = 15): Promise<CrowdAnalyticsDataPoint[]> {
    try {
        const timeLimit = Timestamp.fromMillis(Date.now() - minutes * 60 * 1000);
        const q = query(
            collection(db, CROWD_ANALYTICS_HISTORY_COLLECTION),
            where("eventId", "==", eventId)
        );
        const querySnapshot = await getDocs(q);
        const history = querySnapshot.docs
            .map(doc => doc.data() as CrowdAnalyticsDataPoint)
            .filter(data => data.timestamp && data.timestamp.toMillis() >= timeLimit.toMillis())
            .sort((a,b) => a.timestamp.toMillis() - b.timestamp.toMillis());

        return history;
    } catch (error) {
        console.error("Error fetching crowd analytics history:", error);
        return [];
    }
}

// === Incident Management ===

export async function addIncident(incident: Omit<Incident, 'id' | 'timestamp'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, INCIDENTS_COLLECTION), {
        ...incident,
        timestamp: serverTimestamp(),
    });
    await updateDoc(docRef, { id: docRef.id });
    return docRef.id;
  } catch (error) {
    console.error("Error adding incident:", error);
    throw error;
  }
}

export function listenToIncidents(
  eventId: string,
  callback: (incidents: Incident[]) => void,
  count?: number
) {
  let q;
  const constraints = [
    where('eventId', '==', eventId),
  ];

  if (count) {
    constraints.push(limit(count));
  }
  
  q = query(collection(db, INCIDENTS_COLLECTION), ...constraints);

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const incidents: Incident[] = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        incidents.push({
            ...data,
            id: doc.id,
            timestamp: (data.timestamp as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
        } as Incident);
    });

    // Sort on the client
    incidents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    callback(incidents);
  }, (error) => {
    console.error('FirebaseError in listenToIncidents:', error.message);
  });

  return unsubscribe;
}


export async function updateIncidentStatus(incidentId: string, status: IncidentStatus): Promise<void> {
    try {
        const incidentRef = doc(db, INCIDENTS_COLLECTION, incidentId);
        await updateDoc(incidentRef, { status });
    } catch (error) {
        console.error("Error updating incident status: ", error);
        throw error;
    }
}


// === Crowd Detections for Heatmap ===

export async function updateCrowdDetectionsFromAnalysis(
  eventId: string,
  cameraId: string,
  peoplePositions: { x: number; y: number }[]
) {
  const batch = writeBatch(db);
  const tenSecondsAgo = Timestamp.fromMillis(Date.now() - 10000);

  const detectionsQuery = query(
    collection(db, CROWD_DETECTIONS_COLLECTION),
    where('eventId', '==', eventId),
    where('cameraId', '==', cameraId)
  );
  
  try {
    const detectionsSnapshot = await getDocs(detectionsQuery);
    
    detectionsSnapshot.forEach(doc => {
      const detection = doc.data() as CrowdDetection;
      if (detection.timestamp.toMillis() < tenSecondsAgo.toMillis()) {
        batch.delete(doc.ref);
      }
    });

    for (const pos of peoplePositions) {
      const detection: Omit<CrowdDetection, 'id'> = {
        eventId,
        cameraId,
        x: pos.x,
        y: pos.y,
        timestamp: Timestamp.now(),
      };
      const docRef = doc(collection(db, CROWD_DETECTIONS_COLLECTION));
      batch.set(docRef, detection);
    }
    await batch.commit();

  } catch (error) {
    console.error('Error updating crowd detections for heatmap:', error);
  }
}

export function listenToCrowdDetectionsForCamera(
  eventId: string,
  cameraId: string,
  callback: (detections: CrowdDetection[]) => void
) {
  const q = query(
    collection(db, CROWD_DETECTIONS_COLLECTION),
    where('eventId', '==', eventId),
    where('cameraId', '==', cameraId)
  );

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const detections: CrowdDetection[] = [];
    querySnapshot.forEach((doc) => {
      detections.push({ id: doc.id, ...doc.data() } as CrowdDetection);
    });
    callback(detections);
  }, (error) => {
    console.error(`Error listening to crowd detections for ${cameraId}:`, error);
  });

  return unsubscribe;
}

// === Commander Management ===
export function listenToCommanders(eventId: string, callback: (commanders: Commander[]) => void) {
  const q = query(collection(db, COMMANDERS_COLLECTION), where('eventId', '==', eventId));
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const commanders: Commander[] = [];
    querySnapshot.forEach((doc) => {
      commanders.push({ id: doc.id, ...doc.data() } as Commander);
    });
    callback(commanders);
  });
  return unsubscribe;
}

export async function addCommander(commander: Omit<Commander, 'id'>, eventId: string): Promise<string> {
  try {
    const newCommander = { ...commander, eventId };
    const docRef = await addDoc(collection(db, COMMANDERS_COLLECTION), newCommander);
    await updateDoc(docRef, { id: docRef.id });
    return docRef.id;
  } catch (error) {
    console.error("Error adding commander:", error);
    throw error;
  }
}

export async function deleteCommander(commanderId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COMMANDERS_COLLECTION, commanderId));
  } catch (error) {
    console.error("Error deleting commander:", error);
    throw error;
  }
}

// === User Management ===
export function listenToUsers(callback: (users: UserProfile[]) => void) {
  const q = query(collection(db, USERS_COLLECTION), orderBy('name'));
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const users: UserProfile[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      users.push({
        id: doc.id,
        ...data,
        lastActive: (data.lastActive as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
      } as UserProfile);
    });
    callback(users);
  });
  return unsubscribe;
}

export async function addUser(user: { name: string; email: string; role: UserRole }): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, USERS_COLLECTION), {
      ...user,
      avatar: `https://i.pravatar.cc/150?u=${user.email}`,
      lastActive: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding user:", error);
    throw error;
  }
}

export async function deleteUser(userId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, USERS_COLLECTION, userId));
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
}


// === IoT Actions (Realtime Database) ===
export async function setIotStatus(eventId: string, cameraId: string, status: EmergencyType): Promise<void> {
  try {
    // Global command for hardware
    const globalStatusRef = dbRef(rtdb, GLOBAL_COMMAND_PATH);
    await set(globalStatusRef, status);

    // Event-specific log
    const eventStatusRef = dbRef(rtdb, `iot_status/${eventId}/${cameraId}/status`);
    await set(eventStatusRef, status);

  } catch (error) {
    console.error(`Error setting IoT status for camera ${cameraId}:`, error);
    throw error;
  }
}

export const GLOBAL_COMMAND_PATH = 'iot_status/global_command/status';

export function listenToIotStatus(
  // eventId: string, // No longer needed for listening
  // cameraId: string,
  callback: (status: EmergencyType | null) => void
): () => void {
  // Always listen to the global path
  const statusRef = dbRef(rtdb, GLOBAL_COMMAND_PATH);
  
  const listener = onValue(statusRef, (snapshot) => {
    const status = snapshot.val();
    callback(status || 'None');
  }, (error) => {
    console.error(`Error listening to global IoT status:`, error);
    callback(null);
  });

  return () => off(statusRef, 'value', listener);
}
