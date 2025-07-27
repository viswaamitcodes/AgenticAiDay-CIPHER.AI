
import { subDays, subHours, format } from 'date-fns';
import type { Camera, Incident, User, Alert, CrowdAnalytics } from './types';

export const mockUsers: User[] = [
  {
    id: 'user-001',
    name: 'Admin User',
    email: 'admin@drishti.ai',
    role: 'Admin',
    avatar: 'https://i.pravatar.cc/150?u=admin@drishti.ai',
    lastActive: new Date().toISOString(),
  },
  {
    id: 'user-002',
    name: 'Ravi Kumar',
    email: 'ravi.kumar@drishti.ai',
    role: 'Security Officer',
    avatar: 'https://i.pravatar.cc/150?u=ravi.kumar@drishti.ai',
    lastActive: subHours(new Date(), 2).toISOString(),
  },
  {
    id: 'user-003',
    name: 'Priya Sharma',
    email: 'priya.sharma@drishti.ai',
    role: 'Operator',
    avatar: 'https://i.pravatar.cc/150?u=priya.sharma@drishti.ai',
    lastActive: subHours(new Date(), 1).toISOString(),
  },
];

export const mockAlerts: Alert[] = [];
//   { id: 'alert-001', eventId: 'evt-001', incidentId: 'inc-002', message: 'Critical crowd density detected', severity: 'Critical', timestamp: subHours(new Date(), 0.25).toISOString(), acknowledged: false },
//   { id: 'alert-002', eventId: 'evt-001', incidentId: 'inc-001', message: 'Suspicious object detected', severity: 'High', timestamp: subHours(new Date(), 1).toISOString(), acknowledged: true, acknowledgedBy: 'Ravi Kumar' },
//   { id: 'alert-003', eventId: 'evt-001', incidentId: 'inc-003', message: 'Perimeter breach attempt', severity: 'Medium', timestamp: subHours(new Date(), 5).toISOString(), acknowledged: true, acknowledgedBy: 'Admin User' },
//   { id: 'alert-004', eventId: 'evt-001', incidentId: 'inc-001', message: 'Subject match not found', severity: 'Low', timestamp: subHours(new Date(), 0.5).toISOString(), acknowledged: false },
// ];

export const mockCrowdAnalytics: CrowdAnalytics[] = Array.from({ length: 12 }, (_, i) => ({
  time: format(subHours(new Date(), 11 - i), 'ha'),
  density: Math.floor(Math.random() * (i < 4 || i > 9 ? 40 : 90)) + 10,
}));
