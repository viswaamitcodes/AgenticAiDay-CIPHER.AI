
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDrishti } from "@/lib/drishti-context";
import { useToast } from "@/hooks/use-toast";
import { Check } from "lucide-react";
import type { Alert, IncidentSeverity } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useParams } from "next/navigation";

const severityVariantMap: Record<IncidentSeverity, 'critical' | 'high' | 'medium' | 'low'> = {
  Critical: 'critical',
  High: 'high',
  Medium: 'medium',
  Low: 'low',
};

export default function AlertsTable() {
  const { alerts, acknowledgeAlert } = useDrishti();
  const { toast } = useToast();
  const params = useParams();
  const eventId = params.eventId as string;

  const handleAcknowledge = (alertId: string) => {
    acknowledgeAlert(alertId, 'Admin User');
    toast({
      title: "Alert Acknowledged",
      description: "The alert has been marked as seen.",
    });
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Severity</TableHead>
          <TableHead>Message</TableHead>
          <TableHead>Timestamp</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {alerts.map((alert: Alert) => (
          <TableRow key={alert.id}>
            <TableCell>
              <Badge variant={severityVariantMap[alert.severity]}>{alert.severity}</Badge>
            </TableCell>
            <TableCell className="font-medium">{alert.message}</TableCell>
            <TableCell>
              {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
            </TableCell>
            <TableCell>
              {alert.acknowledged ? (
                <Badge variant="outline">Acknowledged</Badge>
              ) : (
                <Badge variant="destructive">New</Badge>
              )}
            </TableCell>
            <TableCell className="text-right space-x-2">
                <Link href={`/event/${eventId}/incidents?incidentId=${alert.incidentId}`}>
                    <Button variant="outline" size="sm">View Incident</Button>
                </Link>
                {!alert.acknowledged && (
                    <Button size="sm" onClick={() => handleAcknowledge(alert.id)}>
                        <Check className="mr-2 h-4 w-4" />
                        Acknowledge
                    </Button>
                )}
            </TableCell>
          </TableRow>
        ))}
        {alerts.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="h-24 text-center">
              No alerts found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
