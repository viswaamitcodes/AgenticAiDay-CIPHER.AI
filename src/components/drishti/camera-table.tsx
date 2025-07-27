
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
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDrishti } from "@/lib/drishti-context";
import { deleteCamera } from "@/lib/firebase-service";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";
import type { Camera, CameraStatus } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { formatDistanceToNow } from "date-fns";


const statusVariantMap: Record<CameraStatus, 'online' | 'offline' | 'destructive'> = {
  Online: 'online',
  Offline: 'offline',
  Alert: 'destructive'
};

export default function CameraTable() {
  const { cameras, updateCameraStatus } = useDrishti();
  const { toast } = useToast();

  const handleDelete = async (cameraId: string) => {
    try {
      await deleteCamera(cameraId);
      toast({
        title: "Camera Deleted",
        description: "The camera has been successfully removed.",
      });
    } catch (error) {
      console.error("Failed to delete camera:", error);
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: "Could not delete the camera. Please try again.",
      });
    }
  };

  const handleStatusChange = async (camera: Camera, newStatus: boolean) => {
    const status = newStatus ? 'Online' : 'Offline';
    try {
      await updateCameraStatus(camera.id, status);
      toast({
        title: "Status Updated",
        description: `${camera.name} is now ${status}.`,
      });
    } catch (error) {
      console.error("Failed to update status:", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not update camera status. Please try again.",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Camera Registry</CardTitle>
        <CardDescription>Manage your connected camera devices.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Seen</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cameras.map((camera) => (
              <TableRow key={camera.id}>
                <TableCell className="font-medium">{camera.name}</TableCell>
                <TableCell>{camera.location}</TableCell>
                <TableCell>
                  <Badge variant={statusVariantMap[camera.status]}>{camera.status}</Badge>
                </TableCell>
                 <TableCell>
                  {formatDistanceToNow(new Date(camera.lastSeen), { addSuffix: true })}
                </TableCell>
                <TableCell className="text-right space-x-2">
                   <Switch
                      checked={camera.status === 'Online'}
                      onCheckedChange={(checked) => handleStatusChange(camera, checked)}
                      aria-label="Toggle camera status"
                    />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the
                          camera and its associated data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(camera.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
