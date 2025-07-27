
'use client';

import UserManagement from '@/components/drishti/user-management';
import ProtectedRoute from '@/components/drishti/protected-route';

export default function UsersPage() {
  return (
    <ProtectedRoute requiredRole="Admin">
        <div className="p-4 sm:p-6">
            <UserManagement />
        </div>
    </ProtectedRoute>
  );
}
