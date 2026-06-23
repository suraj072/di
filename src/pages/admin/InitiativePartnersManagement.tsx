import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useInitiative } from '@/hooks/useInitiatives';
import { useInitiativePartners, useDeleteInitiativePartner } from '@/hooks/useInitiativePartners';
import { usePartners } from '@/hooks/usePartners';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Plus, MoreHorizontal, Pencil, Trash2, Loader2, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCreateInitiativePartner } from '@/hooks/useInitiativePartners';

const InitiativePartnersManagement = () => {
  const { id: initiativeId } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [addPartnerOpen, setAddPartnerOpen] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');

  const { data: initiative, isLoading: loadingInitiative } = useInitiative(initiativeId!);
  const { data: initiativePartners, isLoading: loadingPartners } = useInitiativePartners(initiativeId!);
  const { data: allPartners } = usePartners();
  const deleteInitiativePartner = useDeleteInitiativePartner();
  const createInitiativePartner = useCreateInitiativePartner();

  // Filter out partners already added to this initiative
  const availablePartners = allPartners?.filter(
    (p) => !initiativePartners?.some((ip) => ip.partner_id === p.id)
  );

  const handleDelete = async () => {
    if (!deleteId || !initiativeId) return;

    try {
      await deleteInitiativePartner.mutateAsync({ id: deleteId, initiativeId });
      toast({ title: 'Partner removed from initiative' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to remove partner',
        description: 'Please try again.',
      });
    } finally {
      setDeleteId(null);
    }
  };

  const handleAddPartner = async () => {
    if (!selectedPartnerId || !initiativeId) return;

    try {
      await createInitiativePartner.mutateAsync({
        initiative_id: initiativeId,
        partner_id: selectedPartnerId,
      });
      toast({ title: 'Partner added to initiative' });
      setAddPartnerOpen(false);
      setSelectedPartnerId('');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to add partner',
        description: 'Please try again.',
      });
    }
  };

  if (loadingInitiative || loadingPartners) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/initiatives">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {initiative?.name} - Partners
          </h1>
          <p className="text-muted-foreground">
            Manage partners and their integration details for this initiative
          </p>
        </div>
        <Dialog open={addPartnerOpen} onOpenChange={setAddPartnerOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Partner
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Partner to Initiative</DialogTitle>
              <DialogDescription>
                Select a partner to add to this initiative. You can configure details after adding.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Select value={selectedPartnerId} onValueChange={setSelectedPartnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a partner" />
                </SelectTrigger>
                <SelectContent>
                  {availablePartners?.map((partner) => (
                    <SelectItem key={partner.id} value={partner.id}>
                      {partner.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availablePartners?.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  All partners have been added to this initiative.{' '}
                  <Link to="/admin/partners/new" className="text-primary hover:underline">
                    Create a new partner
                  </Link>
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAddPartnerOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddPartner} 
                  disabled={!selectedPartnerId || createInitiativePartner.isPending}
                >
                  {createInitiativePartner.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Add Partner
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Partners ({initiativePartners?.length || 0})
          </CardTitle>
          <CardDescription>
            Partners integrated with this initiative along with their commercial and technical details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {initiativePartners && initiativePartners.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partner</TableHead>
                  <TableHead>Integration Cost</TableHead>
                  <TableHead>Annual Cost</TableHead>
                  <TableHead>API Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initiativePartners.map((ip) => (
                  <TableRow key={ip.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {ip.partner?.logo_url ? (
                          <img
                            src={ip.partner.logo_url}
                            alt={ip.partner.name}
                            className="h-8 w-8 rounded object-contain"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {ip.partner?.name?.charAt(0) || 'P'}
                            </span>
                          </div>
                        )}
                        <span className="font-medium">{ip.partner?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {ip.integration_cost 
                        ? `₹${Number(ip.integration_cost).toLocaleString('en-IN')}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {ip.annual_cost 
                        ? `₹${Number(ip.annual_cost).toLocaleString('en-IN')}`
                        : '-'}
                    </TableCell>
                    <TableCell>{ip.api_version || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={ip.partner?.status === 'active' ? 'default' : 'secondary'}>
                        {ip.partner?.status || 'unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/admin/initiatives/${initiativeId}/partners/${ip.id}`}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteId(ip.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No partners added yet</p>
              <p className="text-sm">Click "Add Partner" to add a partner to this initiative</p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Partner</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this partner from the initiative? 
              This will also remove all associated configuration data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InitiativePartnersManagement;
