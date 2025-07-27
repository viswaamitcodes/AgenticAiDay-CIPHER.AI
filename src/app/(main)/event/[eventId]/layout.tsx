
'use client';

import { useParams } from 'next/navigation';
import { DrishtiProvider } from '@/lib/drishti-context';
import ProtectedRoute from '@/components/drishti/protected-route';


export default function EventLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const eventId = params.eventId as string;

  if (!eventId) {
    // This can happen briefly on navigation, child will handle redirect
    return <>{children}</>;
  }

  return (
    <ProtectedRoute>
      <DrishtiProvider eventId={eventId}>
        {children}
      </DrishtiProvider>
    </ProtectedRoute>
  );
}
