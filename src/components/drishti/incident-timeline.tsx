
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useDrishti } from '@/lib/drishti-context';
import { formatDistanceToNow } from 'date-fns';
import { ShieldAlert, Users, DoorClosed, AlertTriangle, Video } from 'lucide-react';
import { Badge } from '../ui/badge';
import type { IncidentSeverity, IncidentType } from '@/lib/types';
import { useEffect, useState } from 'react';

const incidentIconMap: Record<IncidentType, React.ElementType> = {
  'Crowd surge': Users,
  'Unauthorized access': DoorClosed,
  'Suspicious behavior': AlertTriangle,
  'Emergency': ShieldAlert,
  'Theft': ShieldAlert,
};

const severityVariantMap: Record<IncidentSeverity, 'critical' | 'high' | 'medium' | 'low'> = {
  Critical: 'critical',
  High: 'high',
  Medium: 'medium',
  Low: 'low',
};

const TimeAgo = ({ timestamp }: { timestamp: string }) => {
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    // This effect runs only on the client, after hydration
    const update = () => setTimeAgo(formatDistanceToNow(new Date(timestamp), { addSuffix: true }));
    update();
    const timer = setInterval(update, 60000); // update every minute
    return () => clearInterval(timer);
  }, [timestamp]);
  
  // Render a placeholder on the server and initial client render
  if (!timeAgo) {
    return null;
  }

  return <>{timeAgo}</>;
}


export default function IncidentTimeline() {
  const { incidents } = useDrishti();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Incidents</CardTitle>
        <CardDescription>Timeline of the latest security events.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-6">
          {incidents.length > 0 && <div className="absolute left-3 top-3 h-full w-0.5 bg-border" />}
          {incidents.map((incident) => {
            const Icon = incidentIconMap[incident.type] || AlertTriangle;
            return (
              <div key={incident.id} className="relative flex items-start gap-4">
                <div className="z-10 flex h-6 w-6 items-center justify-center rounded-full bg-card">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary">
                    <Icon className="h-4 w-4 text-secondary-foreground" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{incident.type}</p>
                    <span className="text-xs text-muted-foreground">
                      <TimeAgo timestamp={incident.timestamp} />
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{incident.description}</p>
                  <div className="mt-2 flex items-center gap-4">
                    <Badge variant={severityVariantMap[incident.severity]}>{incident.severity}</Badge>
                     {incident.camera && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Video className="h-3 w-3" />
                            <span>{incident.camera.name}</span>
                        </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
