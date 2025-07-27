
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
import { MoreHorizontal, ChevronsUpDown } from "lucide-react";
import type { Incident, IncidentSeverity, IncidentStatus } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const severityVariantMap: Record<IncidentSeverity, 'critical' | 'high' | 'medium' | 'low'> = {
  Critical: 'critical',
  High: 'high',
  Medium: 'medium',
  Low: 'low',
};

const statusColorMap: Record<IncidentStatus, string> = {
    Active: 'bg-red-500',
    'Under Investigation': 'bg-yellow-500',
    Resolved: 'bg-green-500',
}

export default function IncidentsTable() {
  const { incidents, updateIncidentStatus } = useDrishti();
  const { toast } = useToast();

  const handleStatusChange = async (incidentId: string, status: IncidentStatus) => {
    try {
      await updateIncidentStatus(incidentId, status);
      toast({
        title: "Status Updated",
        description: `Incident status changed to ${status}.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not update the incident status.",
      });
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Severity</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Camera</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Timestamp</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {incidents.map((incident: Incident) => (
          <TableRow key={incident.id}>
            <TableCell className="font-medium">{incident.type}</TableCell>
            <TableCell>
                <Badge variant={severityVariantMap[incident.severity]}>{incident.severity}</Badge>
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${statusColorMap[incident.status]}`} />
                    <span>{incident.status}</span>
                </div>
            </TableCell>
            <TableCell>{incident.camera.name}</TableCell>
            <TableCell className="max-w-xs truncate">{incident.description}</TableCell>
            <TableCell>
              {formatDistanceToNow(new Date(incident.timestamp), { addSuffix: true })}
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => navigator.clipboard.writeText(incident.id)}>
                    Copy Incident ID
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleStatusChange(incident.id, 'Active')}>Active</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusChange(incident.id, 'Under Investigation')}>Under Investigation</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusChange(incident.id, 'Resolved')}>Resolved</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
         {incidents.length === 0 && (
            <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                No incidents found.
                </TableCell>
            </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
