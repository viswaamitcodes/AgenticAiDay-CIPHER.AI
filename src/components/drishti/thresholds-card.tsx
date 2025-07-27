
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { incidentThresholds } from '@/lib/thresholds';
import { Badge } from '@/components/ui/badge';
import type { IncidentSeverity } from '@/lib/types';

const severityVariantMap: Record<IncidentSeverity, 'critical' | 'high' | 'medium' | 'low'> = {
  Critical: 'critical',
  High: 'high',
  Medium: 'medium',
  Low: 'low',
};


export default function ThresholdsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Incident Trigger Thresholds</CardTitle>
        <CardDescription>
          The AI uses these descriptions to identify and classify incidents.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {incidentThresholds.map((threshold) => (
          <div key={threshold.type} className="p-4 rounded-lg border bg-card-foreground/5">
            <div className="flex justify-between items-start">
              <h3 className="font-semibold text-lg">{threshold.type}</h3>
              <Badge variant={severityVariantMap[threshold.severity]}>{threshold.severity}</Badge>
            </div>
            <p className="text-muted-foreground mt-2 text-sm">{threshold.condition}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
