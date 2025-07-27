
'use client';

import { useDrishti } from '@/lib/drishti-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { IncidentSeverity } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const severityVariantMap: Record<IncidentSeverity, 'critical' | 'high' | 'medium' | 'low'> = {
  Critical: 'critical',
  High: 'high',
  Medium: 'medium',
  Low: 'low',
};

export default function AlertsPanel() {
  const { alerts } = useDrishti();
  const params = useParams();
  const eventId = params.eventId as string;

  return (
    <div className="mt-4 flex h-full flex-col">
      <div className="flex-grow space-y-4 overflow-y-auto">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="flex items-start gap-4 rounded-lg border p-4"
          >
            <div className="mt-1">
              <Badge variant={severityVariantMap[alert.severity]}>{alert.severity}</Badge>
            </div>
            <div className="flex-1">
              <p className="font-medium">{alert.message}</p>
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 border-t pt-4">
        <Link href={`/event/${eventId}/alerts`}>
          <Button className="w-full">View All Alerts</Button>
        </Link>
      </div>
    </div>
  );
}
