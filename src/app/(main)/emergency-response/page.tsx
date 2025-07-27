
'use client';

import EmergencyResponseControls from '@/components/drishti/emergency-response-controls';
import ProtectedRoute from '@/components/drishti/protected-route';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';


export default function EmergencyResponsePage() {
  const { userProfile } = useAuth();

  return (
    <ProtectedRoute>
      <div className="p-4 sm:p-6">
         <div className="mb-6">
          <h1 className="font-headline text-2xl font-bold">Emergency Response</h1>
          <p className="text-muted-foreground">
            Trigger real-world alerts and actions for this event via connected IoT devices.
          </p>
        </div>

        {userProfile?.role === 'Operator' ? (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You do not have the required permissions to access this page. Please contact an administrator if you believe this is an error.
            </AlertDescription>
          </Alert>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Manual Triggers</CardTitle>
              <CardDescription>
                Select a camera location and trigger the appropriate emergency response. The action will be sent to the configured IoT device for that location.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmergencyResponseControls />
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  );
}
