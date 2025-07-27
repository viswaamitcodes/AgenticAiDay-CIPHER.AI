
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import AlertsTable from '@/components/drishti/alerts-table';

export default function AlertsPage() {
  return (
    <div className="p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>All Alerts</CardTitle>
          <CardDescription>Browse and manage all system alerts for this event.</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertsTable />
        </CardContent>
      </Card>
    </div>
  );
}
