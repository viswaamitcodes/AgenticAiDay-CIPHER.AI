
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Loader2 } from 'lucide-react';

const publicPaths = ['/login', '/signup'];

const ProtectedRoute = ({ children, requiredRole }: { children: React.ReactNode, requiredRole?: string }) => {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) {
      return; 
    }

    const isPublicPath = publicPaths.includes(pathname);
    
    // If user is not logged in and trying to access a protected page
    if (!user && !isPublicPath) {
      router.push('/login');
      return;
    }

    // If user is logged in and trying to access a login/signup page
    if (user && isPublicPath) {
        router.push('/');
        return;
    }

    // Handle role-based access
    if (requiredRole && userProfile?.role !== requiredRole) {
        router.push('/'); // Redirect to a safe page if role doesn't match
        return;
    }

  }, [user, userProfile, loading, router, pathname, requiredRole]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If user is not logged in and on a public page, show the page
  if (!user && publicPaths.includes(pathname)) {
      return <>{children}</>;
  }

  // If user is logged in, show the protected content
  if (user) {
      if (requiredRole && userProfile?.role !== requiredRole) {
          // This will be briefly visible before redirect happens
          return (
             <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="ml-4">Redirecting...</p>
            </div>
          )
      }
      return <>{children}</>;
  }

  return null;
};

export default ProtectedRoute;
