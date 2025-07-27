
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import IncidentsTable from '@/components/drishti/incidents-table';

export default function IncidentsPage() {
  return (
    <div className="p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>All Incidents</CardTitle>
          <CardDescription>Review, manage, and resolve all security incidents recorded for this event.</CardDescription>
        </CardHeader>
        <CardContent>
          <IncidentsTable />
        </CardContent>
      </Card>
    </div>
  );
}
