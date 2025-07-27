import AICommandCenter from '@/components/drishti/ai-command-center';

export default function AICommandCenterPage() {
  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="font-headline text-2xl font-bold">Talk with Drishti</h1>
        <p className="text-muted-foreground">
          Interact with the Drishti AI using voice or text to get real-time reports and insights.
        </p>
      </div>
      <AICommandCenter />
    </div>
  );
}
