
'use client';
import AnalyticsCharts from '@/components/drishti/analytics-charts';
import ThresholdsCard from '@/components/drishti/thresholds-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function AnalyticsPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Live Analytics</CardTitle>
          <CardDescription>Real-time system analytics and reports for this event.</CardDescription>
        </CardHeader>
        <CardContent>
          <AnalyticsCharts />
        </CardContent>
      </Card>
      <ThresholdsCard />
    </div>
  );
}
