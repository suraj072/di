import { useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, UserPlus, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface AdminUser {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  email?: string;
  full_name?: string;
}

const AdminAccess = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [removeId, setRemoveId] = useState<string | null>(null);

  const { data: adminUsers, isLoading } = useQuery<AdminUser[]>({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/api/admin/users'),
  });

  const addAdmin = useMutation({
    mutationFn: (email: string) => api.post('/api/admin/users', { email }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: 'Admin access granted successfully' });
      setNewAdminEmail('');
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Failed to grant admin access', description: error.message });
    },
  });

  const removeAdmin = useMutation({
    mutationFn: (roleId: string) => api.patch(`/api/admin/users/${roleId}`, { role: 'user' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: 'Admin access revoked' });
      setRemoveId(null);
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Failed to revoke admin access' });
      setRemoveId(null);
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Access Management</h1>
        <p className="text-muted-foreground">Grant or revoke admin access for users</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Grant Admin Access
          </CardTitle>
          <CardDescription>
            Enter the email address of a registered user to grant them admin access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="user@tvscredit.com"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAdmin.mutate(newAdminEmail); } }}
              className="flex-1 max-w-md"
            />
            <Button
              onClick={() => addAdmin.mutate(newAdminEmail)}
              disabled={!newAdminEmail.trim() || addAdmin.isPending}
            >
              {addAdmin.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Grant Access
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            The user must already have a registered account on this portal.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Current Admins ({adminUsers?.length || 0})
          </CardTitle>
          <CardDescription>Users with admin privileges</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : adminUsers && adminUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adminUsers.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.full_name || '-'}</TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>
                      <Badge className="bg-primary/10 text-primary border-primary/20">Admin</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(admin.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setRemoveId(admin.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No admin users found</p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!removeId} onOpenChange={() => setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Admin Access</AlertDialogTitle>
            <AlertDialogDescription>
              This will downgrade the user to a regular user. They will lose all admin privileges.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeId && removeAdmin.mutate(removeId)}
              className="bg-destructive text-destructive-foreground"
            >
              Revoke Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminAccess;
