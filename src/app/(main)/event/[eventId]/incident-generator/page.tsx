
import IncidentGenerator from '@/components/drishti/incident-generator';

export default function IncidentGeneratorPage() {
  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="font-headline text-2xl font-bold">AI Incident Summary Generator</h1>
        <p className="text-muted-foreground">
          Generate real-time incident summaries using AI analysis of camera feeds.
        </p>
      </div>
      <IncidentGenerator />
    </div>
  );
}
