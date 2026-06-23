import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useInitiatives, useDeleteInitiative } from '@/hooks/useInitiatives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  FolderOpen,
  Layers,
  ChevronRight,
  Building2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const InitiativesManagement = () => {
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Fetch all initiatives (no filter) for admin view
  const { data: allInitiatives, isLoading } = useInitiatives({ search });
  const deleteInitiative = useDeleteInitiative();
  const { toast } = useToast();

  // Separate:
  // - Sub-initiatives: have a parent_id
  // - Main categories: no parent_id AND no direct partners (they serve as folder/drill-down)
  // - Standalone initiatives: no parent_id AND have direct partners (shown directly on portal)
  const subInitiatives = allInitiatives?.filter((i) => !!i.parent_id) ?? [];
  const topLevel = allInitiatives?.filter((i) => !i.parent_id) ?? [];
  const mainCategories = topLevel.filter((i) => (i.initiative_partners?.length || 0) === 0);
  const standaloneInitiatives = topLevel.filter((i) => (i.initiative_partners?.length || 0) > 0);

  // Group sub-initiatives by parent_id
  const subsByParent: Record<string, typeof subInitiatives> = {};
  subInitiatives.forEach((sub) => {
    const pid = (sub as any).parent_id as string;
    if (!subsByParent[pid]) subsByParent[pid] = [];
    subsByParent[pid].push(sub);
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteInitiative.mutateAsync(deleteId);
      toast({ title: 'Deleted successfully' });
    } catch {
      toast({ variant: 'destructive', title: 'Failed to delete', description: 'Please try again.' });
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Initiatives</h1>
          <p className="text-muted-foreground mt-1">
            Manage main categories and their initiatives
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link to="/admin/categories/new">
              <FolderOpen className="mr-2 h-4 w-4" />
              Add Main Category
            </Link>
          </Button>
          <Button asChild>
            <Link to="/admin/initiatives/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Initiative
            </Link>
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search initiatives..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {mainCategories.length === 0 && standaloneInitiatives.length === 0 && subInitiatives.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-xl text-center">
              <Layers className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-lg font-medium text-muted-foreground">No initiatives yet</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Start by creating a Main Category (e.g., KYC, Voice Bots) or a standalone Initiative
              </p>
              <div className="flex gap-3">
                <Button asChild variant="outline">
                  <Link to="/admin/categories/new">
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Add Main Category
                  </Link>
                </Button>
                <Button asChild>
                  <Link to="/admin/initiatives/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Initiative
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Main Categories Section */}
              {mainCategories.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <FolderOpen className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Main Categories
                    </h2>
                    <Badge variant="secondary" className="text-xs">{mainCategories.length}</Badge>
                  </div>

                  <div className="space-y-4">
                    {mainCategories.map((category) => {
                      const subs = subsByParent[category.id] ?? [];
                      return (
                        <Card key={category.id} className="border border-border/60">
                          {/* Category header row */}
                          <CardHeader className="pb-3 pt-4 px-5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                  <FolderOpen className="h-4 w-4 text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-base text-foreground truncate">
                                      {category.name}
                                    </span>
                                    <Badge variant="outline" className="text-xs shrink-0 border-primary/40 text-primary">
                                      Main Category
                                    </Badge>
                                    <Badge
                                      variant={category.status === 'active' ? 'default' : 'secondary'}
                                      className="text-xs shrink-0"
                                    >
                                      {category.status}
                                    </Badge>
                                  </div>
                                  {category.description && (
                                    <p className="text-sm text-muted-foreground mt-0.5 truncate max-w-md">
                                      {category.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs text-muted-foreground">
                                  {subs.length} initiative{subs.length !== 1 ? 's' : ''}
                                </span>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem asChild>
                                      <Link to={`/admin/categories/${category.id}`}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Edit Category
                                      </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => setDeleteId(category.id)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete Category
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </CardHeader>

                          {/* Sub-initiatives under this category */}
                          {subs.length > 0 && (
                            <CardContent className="pt-0 pb-3 px-5">
                              <div className="border-t border-border/50 pt-3 space-y-2">
                                {subs.map((sub) => (
                                  <div
                                    key={sub.id}
                                    className="flex items-center justify-between pl-6 pr-2 py-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                      <div className="h-7 w-7 rounded-md bg-background border border-border/60 flex items-center justify-center shrink-0">
                                        <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                                      </div>
                                      <div className="min-w-0">
                                        <span className="font-medium text-sm text-foreground truncate block">
                                          {sub.name}
                                        </span>
                                        {sub.description && (
                                          <span className="text-xs text-muted-foreground truncate block max-w-xs">
                                            {sub.description}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <Building2 className="h-3.5 w-3.5" />
                                        <span>{sub.initiative_partners?.length || 0} partner{(sub.initiative_partners?.length || 0) !== 1 ? 's' : ''}</span>
                                      </div>
                                      <Badge
                                        variant={sub.status === 'active' ? 'default' : 'secondary'}
                                        className="text-xs"
                                      >
                                        {sub.status}
                                      </Badge>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <MoreHorizontal className="h-3.5 w-3.5" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem asChild>
                                            <Link to={`/admin/initiatives/${sub.id}`}>
                                              <Pencil className="mr-2 h-4 w-4" />
                                              Edit & Manage Partners
                                            </Link>
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            className="text-destructive"
                                            onClick={() => setDeleteId(sub.id)}
                                          >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          )}

                          {/* Empty state for category with no initiatives */}
                          {subs.length === 0 && (
                            <CardContent className="pt-0 pb-4 px-5">
                              <div className="border-t border-border/50 pt-3">
                                <div className="pl-6 flex items-center gap-2 text-sm text-muted-foreground">
                                  <span>No initiatives yet.</span>
                                  <Link
                                    to="/admin/initiatives/new"
                                    className="text-primary hover:underline font-medium"
                                  >
                                    Add one →
                                  </Link>
                                </div>
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Standalone initiatives (have direct partners, no parent category) */}
              {standaloneInitiatives.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Layers className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Standalone Initiatives
                    </h2>
                    <Badge variant="secondary" className="text-xs">{standaloneInitiatives.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {standaloneInitiatives.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between px-4 py-3 rounded-lg border border-border/60 bg-card hover:border-primary/30 transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <span className="font-medium text-sm truncate block">{item.name}</span>
                            {item.description && (
                              <span className="text-xs text-muted-foreground truncate block">{item.description}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Building2 className="h-3.5 w-3.5" />
                            <span>{item.initiative_partners?.length || 0} partner{(item.initiative_partners?.length || 0) !== 1 ? 's' : ''}</span>
                          </div>
                          <Badge variant={item.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                            {item.status}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link to={`/admin/initiatives/${item.id}`}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit & Manage Partners
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteId(item.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this item and all associated partner configurations.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InitiativesManagement;
