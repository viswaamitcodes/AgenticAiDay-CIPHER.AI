
'use client';

import Header from '@/components/drishti/header';
import { SidebarNav } from '@/components/drishti/sidebar-nav';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DrishtiProvider } from '@/lib/drishti-context';
import ProtectedRoute from '@/components/drishti/protected-route';


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
        <SidebarProvider>
          <div className="flex h-screen w-full">
            <SidebarNav />
            <div className="flex flex-1 flex-col overflow-hidden">
              <Header />
              <SidebarInset>
                <main className="flex-1 overflow-y-auto bg-background">
                  {children}
                </main>
              </SidebarInset>
            </div>
          </div>
        </SidebarProvider>
    </ProtectedRoute>
  );
}
