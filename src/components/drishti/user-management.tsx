
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useDrishti } from '@/lib/drishti-context';
import type { UserProfile, UserRole } from '@/lib/types';
import { addUser, deleteUser } from '@/lib/firebase-service';
import { Loader2, PlusCircle, Trash2, MoreHorizontal } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from '@/lib/auth-context';


const userRoles: UserRole[] = ['Admin', 'Security Officer', 'Operator'];

export default function UserManagement() {
  const { users } = useDrishti();
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('Operator');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddUser = async () => {
    if (!newUserName || !newUserEmail) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please provide a name and email for the new user.',
      });
      return;
    }
    setIsAdding(true);
    try {
      // Note: This only adds the user to the Firestore DB.
      // For a real app, you'd want a process to invite them to create an account
      // or to create an auth user for them via the Admin SDK in a backend.
      await addUser({
        name: newUserName,
        email: newUserEmail,
        role: newUserRole,
      });
      toast({
        title: 'User Added',
        description: `${newUserName} has been added to the system. They will need to sign up to create their login credentials.`,
      });
      setNewUserName('');
      setNewUserEmail('');
      setNewUserRole('Operator');
    } catch (error) {
      console.error("Failed to add user:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not add the user. Please try again.',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (user.id === userProfile?.id) {
        toast({
            variant: "destructive",
            title: "Cannot Delete Self",
            description: "You cannot delete your own account.",
        });
        return;
    }
    try {
      await deleteUser(user.id);
      toast({
        title: 'User Deleted',
        description: `${user.name} has been removed from the system.`,
      });
    } catch (error) {
      console.error("Failed to delete user:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not delete the user. This might be a protected user or a backend error.',
      });
    }
  };

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };


  return (
     <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>Add, view, and manage system users and their roles.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="p-4 border rounded-lg space-y-4">
          <h3 className="font-medium">Add New User</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="user-name">Full Name</Label>
              <Input id="user-name" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="e.g., John Smith" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-email">Email Address</Label>
              <Input id="user-email" type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="e.g., j.smith@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-role">Role</Label>
              <Select value={newUserRole} onValueChange={(value) => setNewUserRole(value as UserRole)}>
                <SelectTrigger id="user-role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {userRoles.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddUser} disabled={isAdding} className="w-full">
                {isAdding ? <Loader2 className="animate-spin" /> : <PlusCircle />}
                {isAdding ? 'Adding...' : 'Add User'}
              </Button>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-4">Current Users</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(user.lastActive), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem disabled>Edit User</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-destructive" disabled={user.id === userProfile?.id}>
                              Delete User
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete {user.name} from the system. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteUser(user)}>
                            Confirm Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
