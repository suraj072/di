import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useInitiativePartner, useUpdateInitiativePartner } from '@/hooks/useInitiativePartners';
import { useInitiative } from '@/hooks/useInitiatives';
import { useApiDocuments, useUploadApiDocument, useDeleteApiDocument } from '@/hooks/useApiDocuments';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Loader2, DollarSign, FileCode, FileText, Upload, Trash2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

const PRICING_UNITS = [
  'Per Call',
  'Per API Call',
  'Per Transaction',
  'Per Month',
  'Per User',
  'Per Verification',
  'Per Document',
  'Custom',
];

const partnerDetailsSchema = z.object({
  // Commercial Details
  integration_cost: z.string().optional(),
  annual_cost: z.string().optional(),
  pricing_per_call: z.string().optional(),
  pricing_unit: z.string().optional(),
  pricing_unit_custom: z.string().optional(),
  currency: z.string().optional(),
  billing_contact: z.string().optional(),
  terms_and_conditions: z.string().optional(),
  // Technical Details
  api_version: z.string().optional(),
  api_documentation: z.string().url().optional().or(z.literal('')),
  api_notes: z.string().optional(),
  // Media
  media_type: z.string().optional(),
  media_title: z.string().optional(),
  media_url: z.string().url().optional().or(z.literal('')),
  media_description: z.string().optional(),
});

type PartnerDetailsFormValues = z.infer<typeof partnerDetailsSchema>;

// ─── PDF Upload Section ────────────────────────────────────────────────────────

const ApiDocumentsSection = ({ initiativePartnerId }: { initiativePartnerId: string }) => {
  const { data: docs, isLoading } = useApiDocuments(initiativePartnerId);
  const uploadDoc = useUploadApiDocument();
  const deleteDoc = useDeleteApiDocument();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [docTitle, setDocTitle] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!docTitle.trim()) {
      toast({ variant: 'destructive', title: 'Please enter a title for the document' });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'File too large', description: 'Maximum file size is 20MB' });
      return;
    }

    setUploading(true);
    try {
      await uploadDoc.mutateAsync({
        initiative_partner_id: initiativePartnerId,
        title: docTitle.trim(),
        file,
      });

      setDocTitle('');
      e.target.value = '';
      toast({ title: 'Document uploaded successfully' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Upload failed', description: 'Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: { id: string; file_path: string }) => {
    try {
      await deleteDoc.mutateAsync({ id: doc.id, initiativePartnerId });
      toast({ title: 'Document deleted' });
    } catch {
      toast({ variant: 'destructive', title: 'Failed to delete document' });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold mb-3">Upload API Documentation (PDF)</p>
        <div className="space-y-3">
          <Input
            placeholder="Document title (e.g. API Reference v2.1)"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
          />
          <label className="flex items-center gap-3 p-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (
              <Upload className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="text-sm text-muted-foreground">
              {uploading ? 'Uploading…' : 'Click to upload PDF (max 20MB)'}
            </span>
            <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFileUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      {docs && docs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Uploaded Documents</p>
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 p-3 border border-border/60 rounded-lg bg-muted/20">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.title}</p>
                <p className="text-xs text-muted-foreground truncate">{doc.file_name}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                onClick={() => handleDelete(doc)}
                disabled={deleteDoc.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main Form ─────────────────────────────────────────────────────────────────

const InitiativePartnerForm = () => {
  const { id: initiativeId, partnerId } = useParams<{ id: string; partnerId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: initiative } = useInitiative(initiativeId!);
  const { data: initiativePartner, isLoading } = useInitiativePartner(partnerId!);
  const updateInitiativePartner = useUpdateInitiativePartner();

  const form = useForm<PartnerDetailsFormValues>({
    resolver: zodResolver(partnerDetailsSchema),
    defaultValues: {
      integration_cost: '',
      annual_cost: '',
      pricing_per_call: '',
      pricing_unit: 'Per Call',
      pricing_unit_custom: '',
      currency: 'INR',
      billing_contact: '',
      terms_and_conditions: '',
      api_version: '1.0',
      api_documentation: '',
      api_notes: '',
      media_type: 'video',
      media_title: '',
      media_url: '',
      media_description: '',
    },
  });

  const pricingUnit = form.watch('pricing_unit');

  useEffect(() => {
    if (initiativePartner) {
      const storedUnit = initiativePartner.pricing_unit || 'Per Call';
      const isCustomUnit = !PRICING_UNITS.includes(storedUnit);

      form.reset({
        integration_cost: initiativePartner.integration_cost?.toString() || '',
        annual_cost: initiativePartner.annual_cost?.toString() || '',
        pricing_per_call: initiativePartner.pricing_per_call?.toString() || '',
        pricing_unit: isCustomUnit ? 'Custom' : storedUnit,
        pricing_unit_custom: isCustomUnit ? storedUnit : '',
        currency: initiativePartner.currency || 'INR',
        billing_contact: initiativePartner.billing_contact || '',
        terms_and_conditions: initiativePartner.terms_and_conditions || '',
        api_version: initiativePartner.api_version || '1.0',
        api_documentation: initiativePartner.api_documentation || '',
        api_notes: (initiativePartner as any).api_notes || '',
        media_type: initiativePartner.media_type || 'video',
        media_title: initiativePartner.media_title || '',
        media_url: initiativePartner.media_url || '',
        media_description: initiativePartner.media_description || '',
      });
    }
  }, [initiativePartner, form]);

  const onSubmit = async (data: PartnerDetailsFormValues) => {
    if (!partnerId) return;

    const resolvedPricingUnit = data.pricing_unit === 'Custom'
      ? (data.pricing_unit_custom || 'Custom')
      : (data.pricing_unit || null);

    try {
      await updateInitiativePartner.mutateAsync({
        id: partnerId,
        integration_cost: data.integration_cost ? parseFloat(data.integration_cost) : null,
        annual_cost: data.annual_cost ? parseFloat(data.annual_cost) : null,
        pricing_per_call: data.pricing_per_call ? parseFloat(data.pricing_per_call) : null,
        pricing_unit: resolvedPricingUnit,
        currency: data.currency || null,
        billing_contact: data.billing_contact || null,
        terms_and_conditions: data.terms_and_conditions || null,
        api_version: data.api_version || null,
        api_documentation: data.api_documentation || null,
        api_notes: data.api_notes || null,
        media_type: data.media_type || 'video',
        media_title: data.media_title || null,
        media_url: data.media_url || null,
        media_description: data.media_description || null,
      } as any);
      toast({ title: 'Partner details updated successfully' });
      navigate(`/admin/initiatives/${initiativeId}/partners`);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to update partner details',
        description: 'Please try again.',
      });
    }
  };

  if (isLoading) {
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
          <Link to={`/admin/initiatives/${initiativeId}/partners`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {initiativePartner?.partner?.name}
          </h1>
          <p className="text-muted-foreground">
            Configure partner details for {initiative?.name}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="commercial" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="commercial" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Commercial
              </TabsTrigger>
              <TabsTrigger value="technical" className="flex items-center gap-2">
                <FileCode className="h-4 w-4" />
                Technical
              </TabsTrigger>
              <TabsTrigger value="media" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Media
              </TabsTrigger>
            </TabsList>

            {/* ── Commercial Tab ── */}
            <TabsContent value="commercial" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Commercial Details
                  </CardTitle>
                  <CardDescription>
                    Pricing and billing information for this partner integration
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="integration_cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Integration Cost</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="e.g., 50000" {...field} />
                          </FormControl>
                          <FormDescription>One-time setup/integration cost</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="annual_cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Annual Cost</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="e.g., 100000" {...field} />
                          </FormControl>
                          <FormDescription>Recurring annual license/maintenance cost</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pricing_per_call"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price Per Unit</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.0001" placeholder="e.g., 2.50" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="pricing_unit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pricing Unit</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select unit" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {PRICING_UNITS.map((u) => (
                                  <SelectItem key={u} value={u}>{u}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {pricingUnit === 'Custom' && (
                        <FormField
                          control={form.control}
                          name="pricing_unit_custom"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Custom Pricing Category <Badge variant="secondary" className="text-xs ml-1">Optional</Badge></FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Per Kyc Journey, Per Scan…" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select currency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="INR">INR (₹)</SelectItem>
                              <SelectItem value="USD">USD ($)</SelectItem>
                              <SelectItem value="EUR">EUR (€)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="billing_contact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Billing Contact</FormLabel>
                          <FormControl>
                            <Input placeholder="billing@partner.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="terms_and_conditions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Terms & Conditions</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter terms and conditions or contractual notes..."
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Technical Tab ── */}
            <TabsContent value="technical" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCode className="h-5 w-5" />
                    Technical Details
                  </CardTitle>
                  <CardDescription>
                    API documentation and technical notes for this integration
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="api_version"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API Version</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 2.1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="api_documentation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API Documentation URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://docs.partner.com/api" {...field} />
                          </FormControl>
                          <FormDescription>External link to API documentation</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="api_notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Any additional notes about the API, quirks, auth methods, rate limits..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* PDF Upload */}
                  {partnerId && (
                    <div className="border-t border-border/50 pt-6">
                      <ApiDocumentsSection initiativePartnerId={partnerId} />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Media Tab ── */}
            <TabsContent value="media" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Media
                  </CardTitle>
                  <CardDescription>
                    Media content for this integration (video, audio, or document)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="media_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Media Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || 'video'}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="video">Video</SelectItem>
                            <SelectItem value="audio">Audio</SelectItem>
                            <SelectItem value="document">Document</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="media_title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Media Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Integration Guide" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="media_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Media URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormDescription>Link to video, audio, or document</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="media_description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Media Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Brief description of what the media covers..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={updateInitiativePartner.isPending}
            >
              {updateInitiativePartner.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Details
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link to={`/admin/initiatives/${initiativeId}/partners`}>Cancel</Link>
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default InitiativePartnerForm;
