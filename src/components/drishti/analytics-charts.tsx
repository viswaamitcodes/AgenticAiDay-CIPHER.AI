
'use client';

import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useDrishti } from '@/lib/drishti-context';
import type { IncidentType } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';

export default function AnalyticsCharts() {
  const { crowdAnalytics, incidents } = useDrishti();

  const incidentTypeCounts = incidents.reduce((acc, incident) => {
    acc[incident.type] = (acc[incident.type] || 0) + 1;
    return acc;
  }, {} as Record<IncidentType, number>);

  const incidentChartData = Object.entries(incidentTypeCounts).map(([name, count]) => ({ name, count }));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Crowd Analytics</CardTitle>
          <CardDescription>Crowd density over the last 15 minutes.</CardDescription>
        </CardHeader>
        <CardContent>
          {crowdAnalytics.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={crowdAnalytics}>
                <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))',
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="density" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] w-full items-center justify-center">
              <Skeleton className="h-full w-full" />
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Incidents by Type</CardTitle>
          <CardDescription>Breakdown of all historical incidents.</CardDescription>
        </CardHeader>
        <CardContent>
          {incidentChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={incidentChartData}>
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))',
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
             <div className="flex h-[300px] w-full items-center justify-center">
              <Skeleton className="h-full w-full" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
