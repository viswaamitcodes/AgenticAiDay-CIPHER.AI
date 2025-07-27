
import type { Timestamp } from 'firebase/firestore';

export type CameraStatus = 'Online' | 'Offline' | 'Alert';
export type IncidentType = 'Crowd surge' | 'Unauthorized access' | 'Suspicious behavior' | 'Emergency' | 'Theft';
export type IncidentSeverity = 'Critical' | 'High' | 'Medium' | 'Low';
export type IncidentStatus = 'Active' | 'Under Investigation' | 'Resolved';
export type UserRole = 'Admin' | 'Security Officer' | 'Operator';
export type EmergencyType = 'Police' | 'Ambulance' | 'Fire' | 'Drone' | 'None';

export interface DrishtiEvent {
  id: string;
  name: string;
  createdAt: string;
  userId: string;
}

export interface Camera {
  id: string;
  eventId: string;
  name: string;
  location: string;
  status: CameraStatus;
  lastSeen: string;
  coordinates: { lat: number; lng: number };
  zone: string;
  streamImage: string;
}

export interface Incident {
  id: string;
  eventId: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  timestamp: string;
  camera: Camera;
  assignedTo?: string;
  description: string;
}

export interface Alert {
  id: string;
  eventId: string;
  incidentId: string;
  message: string;
  severity: IncidentSeverity;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  lastActive: string;
}

// Note: This is now `UserProfile` to avoid conflict with Firebase's `User` type.
export type User = UserProfile;


export interface Zone {
  id: string;
  name: string;
  cameraIds: string[];
  riskLevel: IncidentSeverity;
}

export interface AnalyticsData {
  date: string;
  crowdDensity: number[];
  incidents: number;
  cameraUptime: number;
  peakHours: number[];
}

export interface CrowdAnalytics {
  time: string;
  density: number;
}

export interface CrowdAnalyticsDataPoint {
    eventId: string;
    count: number;
    timestamp: Timestamp;
}

export interface CrowdDetection {
  id: string;
  eventId: string;
  cameraId: string;
  x: number;
  y: number;
  timestamp: Timestamp;
}

export interface Commander {
  id: string;
  eventId: string;
  name: string;
  contactNumber: string;
  assignedCameraId: string;
}
