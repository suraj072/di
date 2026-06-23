import { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { usePartner, useCreatePartner, useUpdatePartner } from '@/hooks/usePartners';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const partnerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  partner_type: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  logo_url: z.string().url().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']),
  contact_name: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  support_email: z.string().email().optional().or(z.literal('')),
  support_phone: z.string().optional(),
  support_hours: z.string().optional(),
});

type PartnerFormValues = z.infer<typeof partnerSchema>;

const PartnerForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEditing = !!id;

  const { data: partner, isLoading: isLoadingPartner } = usePartner(id!);
  const createPartner = useCreatePartner();
  const updatePartner = useUpdatePartner();

  const form = useForm<PartnerFormValues>({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      name: '',
      partner_type: '',
      website: '',
      logo_url: '',
      status: 'active',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      support_email: '',
      support_phone: '',
      support_hours: '',
    },
  });

  useEffect(() => {
    if (partner) {
      form.reset({
        name: partner.name,
        partner_type: partner.partner_type || '',
        website: partner.website || '',
        logo_url: partner.logo_url || '',
        status: partner.status as 'active' | 'inactive',
        contact_name: partner.contact_name || '',
        contact_email: partner.contact_email || '',
        contact_phone: partner.contact_phone || '',
        support_email: partner.support_email || '',
        support_phone: partner.support_phone || '',
        support_hours: partner.support_hours || '',
      });
    }
  }, [partner, form]);

  const onSubmit = async (data: PartnerFormValues) => {
    try {
      const payload = {
        name: data.name,
        partner_type: data.partner_type || null,
        website: data.website || null,
        logo_url: data.logo_url || null,
        status: data.status,
        contact_name: data.contact_name || null,
        contact_email: data.contact_email || null,
        contact_phone: data.contact_phone || null,
        support_email: data.support_email || null,
        support_phone: data.support_phone || null,
        support_hours: data.support_hours || null,
      };
      
      if (isEditing) {
        await updatePartner.mutateAsync({ id, ...payload });
        toast({ title: 'Partner updated successfully' });
      } else {
        await createPartner.mutateAsync(payload);
        toast({ title: 'Partner created successfully' });
      }
      navigate('/admin/partners');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: `Failed to ${isEditing ? 'update' : 'create'} partner`,
        description: 'Please try again.',
      });
    }
  };

  if (isEditing && isLoadingPartner) {
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
          <Link to="/admin/partners">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditing ? 'Edit Partner' : 'Add Partner'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Update partner details' : 'Add a new partner organization'}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Hyperverge" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="partner_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Partner Type</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Technology Provider" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="logo_url"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Logo URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/logo.png" {...field} />
                      </FormControl>
                      <FormDescription>URL to the partner's logo</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Primary Contact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="contact_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contact_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="contact@partner.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contact_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+91 98765 43210" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Support Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="support_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Support Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="support@partner.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="support_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Support Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+91 98765 43210" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="support_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Support Hours</FormLabel>
                      <FormControl>
                        <Input placeholder="24/7 or 9 AM - 6 PM IST" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={createPartner.isPending || updatePartner.isPending}
            >
              {(createPartner.isPending || updatePartner.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEditing ? 'Update Partner' : 'Add Partner'}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link to="/admin/partners">Cancel</Link>
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default PartnerForm;
