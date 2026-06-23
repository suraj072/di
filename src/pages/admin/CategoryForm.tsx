import { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useInitiative, useCreateInitiative, useUpdateInitiative } from '@/hooks/useInitiatives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ArrowLeft, Loader2, FolderOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

const CategoryForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEditing = !!id;

  const { data: initiative, isLoading } = useInitiative(id!);
  const createInitiative = useCreateInitiative();
  const updateInitiative = useUpdateInitiative();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', description: '' },
  });

  useEffect(() => {
    if (initiative) {
      form.reset({
        name: initiative.name,
        description: initiative.description || '',
      });
    }
  }, [initiative, form]);

  const onSubmit = async (data: CategoryFormValues) => {
    try {
      const payload = {
        name: data.name,
        description: data.description || null,
        parent_id: null, // Main categories have no parent
        status: 'active',
        category: null,
        logo_url: null,
        overview: null,
      } as any;

      if (isEditing) {
        await updateInitiative.mutateAsync({ id, ...payload });
        toast({ title: 'Category updated successfully' });
      } else {
        await createInitiative.mutateAsync(payload);
        toast({ title: 'Category created successfully' });
      }
      navigate('/admin/initiatives');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: `Failed to ${isEditing ? 'update' : 'create'} category`,
        description: 'Please try again.',
      });
    }
  };

  if (isEditing && isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/initiatives">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditing ? 'Edit Main Category' : 'Create Main Category'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing
              ? 'Update this top-level category'
              : 'Top-level category that groups related sub-initiatives (e.g., KYC, Voice Bots)'}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FolderOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Category Details</CardTitle>
              <CardDescription>
                This becomes a top-level item on the portal (e.g., clicking "KYC" will show CKYC, VKYC etc.)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., KYC, Voice Bots, Credit Bureau" {...field} />
                    </FormControl>
                    <FormDescription>
                      Keep it short and descriptive — this is what users click first on the portal.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description of what this category covers..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional — helps users understand the scope of this category.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={createInitiative.isPending || updateInitiative.isPending}
                >
                  {(createInitiative.isPending || updateInitiative.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isEditing ? 'Update Category' : 'Create Category'}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link to="/admin/initiatives">Cancel</Link>
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CategoryForm;
