
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import CommanderManagement from '@/components/drishti/commander-management';
import { useAuth } from '@/lib/auth-context';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';
import ProtectedRoute from '@/components/drishti/protected-route';

export default function SettingsPage() {
  const { userProfile } = useAuth();

  return (
    <ProtectedRoute>
      <div className="p-4 sm:p-6 space-y-6">
        {userProfile?.role === 'Operator' ? (
           <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You do not have the required permissions to access this page. Please contact an administrator if you believe this is an error.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Event Settings</CardTitle>
                <CardDescription>General settings for this event.</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Event-specific settings interface will be here.</p>
              </CardContent>
            </Card>
            <CommanderManagement />
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
