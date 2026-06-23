import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import { useInitiative, useCreateInitiative, useUpdateInitiative, useParentInitiatives } from '@/hooks/useInitiatives';
import { useInitiativePartners, useCreateInitiativePartner, useUpdateInitiativePartner, useDeleteInitiativePartner } from '@/hooks/useInitiativePartners';
import { useSyncInitiativePartnerProducts } from '@/hooks/useInitiativePartnerProducts';
import { usePartners, useUpdatePartner } from '@/hooks/usePartners';
import { useProducts } from '@/hooks/useProducts';
import { useUpsertPartnerFeatures } from '@/hooks/usePartnerFeatures';
import { useUploadApiDocument, useApiDocuments, useDeleteApiDocument } from '@/hooks/useApiDocuments';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ArrowLeft, Loader2, Plus, Trash2, Building2, DollarSign, FileCode, FileText, Package, Image, Link2, Upload, Music, Film, CheckSquare, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';

const initiativeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  overview: z.string().optional(),
  status: z.string().default('active'),
  parent_id: z.string().optional(), // Optional — initiatives can exist without a main category
});

type InitiativeFormValues = z.infer<typeof initiativeSchema>;

const partnerDetailsSchema = z.object({
  partner_id: z.string().min(1, 'Partner is required'),
  partner_logo_url: z.string().optional(),
  product_ids: z.array(z.string()).optional(),
  integration_cost: z.string().optional(),
  annual_cost: z.string().optional(),
  pricing_per_call: z.string().optional(),
  pricing_unit: z.string().optional(),
  pricing_unit_custom: z.string().optional(),
  currency: z.string().optional(),
  billing_contact: z.string().optional(),
  terms_and_conditions: z.string().optional(),
  api_version: z.string().optional(),
  api_documentation: z.string().optional(),
  api_notes: z.string().optional(),
  uat_api_key: z.string().optional(),
  production_api_key: z.string().optional(),
  api_request_sample: z.string().optional(),
  api_response_sample: z.string().optional(),
  partner_rank: z.string().optional(),
  media_source_type: z.enum(['link', 'upload']).optional(),
  media_type: z.enum(['video', 'audio', 'document']).optional(),
  media_title: z.string().optional(),
  media_url: z.string().optional(),
  media_description: z.string().optional(),
});

type PartnerFormValues = z.infer<typeof partnerDetailsSchema>;

interface FeatureRow {
  feature_name: string;
  is_available: boolean;
  notes: string;
}

interface CustomCommercialField {
  label: string;
  value: string;
  unit: string;
}

interface PdfUpload {
  title: string;
  file: File;
}

const InitiativeForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEditing = !!id;

  const [showAddPartner, setShowAddPartner] = useState(false);
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [mediaSourceType, setMediaSourceType] = useState<'link' | 'upload'>('link');
  const [mediaType, setMediaType] = useState<'video' | 'audio' | 'document'>('video');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Features state
  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const [newFeatureName, setNewFeatureName] = useState('');

  // Custom commercial fields state
  const [customCommercialFields, setCustomCommercialFields] = useState<CustomCommercialField[]>([]);
  const [newCommercialLabel, setNewCommercialLabel] = useState('');
  const [newCommercialValue, setNewCommercialValue] = useState('');
  const [newCommercialUnit, setNewCommercialUnit] = useState('');

  // PDF state
  const [pdfUploads, setPdfUploads] = useState<PdfUpload[]>([]);
  const [newPdfTitle, setNewPdfTitle] = useState('');
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const { data: initiative, isLoading: isLoadingInitiative } = useInitiative(id!);
  const { data: initiativePartners, isLoading: isLoadingPartners } = useInitiativePartners(id!);
  const { data: partners } = usePartners();
  const { data: parentInitiatives } = useParentInitiatives();
  const updatePartner = useUpdatePartner();
  const { data: products } = useProducts();
  const upsertFeatures = useUpsertPartnerFeatures();
  const uploadApiDocument = useUploadApiDocument();
  const deleteApiDocument = useDeleteApiDocument();

  const createInitiative = useCreateInitiative();
  const updateInitiative = useUpdateInitiative();
  const createInitiativePartner = useCreateInitiativePartner();
  const updateInitiativePartner = useUpdateInitiativePartner();
  const deleteInitiativePartner = useDeleteInitiativePartner();
  const syncProducts = useSyncInitiativePartnerProducts();

  const form = useForm<InitiativeFormValues>({
    resolver: zodResolver(initiativeSchema),
    defaultValues: { name: '', description: '', overview: '', status: 'active', parent_id: '' },
  });

  const partnerForm = useForm<PartnerFormValues>({
    resolver: zodResolver(partnerDetailsSchema),
    defaultValues: {
      partner_id: '',
      partner_logo_url: '',
      product_ids: [],
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
      uat_api_key: '',
      production_api_key: '',
      api_request_sample: '',
      api_response_sample: '',
      partner_rank: '',
      media_source_type: 'link',
      media_type: 'video',
      media_title: '',
      media_url: '',
      media_description: '',
    },
  });

  useEffect(() => {
    if (initiative) {
      form.reset({
        name: initiative.name,
        description: initiative.description || '',
        overview: initiative.overview || '',
        status: initiative.status || 'active',
        parent_id: initiative.parent_id || '',
      });
    }
  }, [initiative, form]);

  const onSubmit = async (data: InitiativeFormValues) => {
    try {
      const payload = {
        name: data.name,
        description: data.description || null,
        overview: data.overview || null,
        status: data.status || 'active',
        category: null,
        logo_url: null,
        parent_id: (data.parent_id && data.parent_id !== '__none__') ? data.parent_id : null,
      } as any;

      if (isEditing) {
        await updateInitiative.mutateAsync({ id, ...payload });
        toast({ title: 'Initiative updated successfully' });
        navigate('/admin/initiatives');
      } else {
        const result = await createInitiative.mutateAsync(payload);
        toast({ title: 'Initiative created successfully' });
        navigate(`/admin/initiatives/${result.id}`);
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      toast({
        variant: 'destructive',
        title: `Failed to ${isEditing ? 'update' : 'create'} initiative`,
        description: error?.message || 'Please try again.',
      });
    }
  };

  const resetPartnerForm = () => {
    partnerForm.reset({
      partner_id: '',
      partner_logo_url: '',
      product_ids: [],
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
      uat_api_key: '',
      production_api_key: '',
      api_request_sample: '',
      api_response_sample: '',
      partner_rank: '',
      media_source_type: 'link',
      media_type: 'video',
      media_title: '',
      media_url: '',
      media_description: '',
    });
    setSelectedProducts([]);
    setMediaSourceType('link');
    setMediaType('video');
    setMediaFile(null);
    setFeatures([]);
    setCustomCommercialFields([]);
    setPdfUploads([]);
    setNewFeatureName('');
    setNewPdfTitle('');
    setNewCommercialLabel('');
    setNewCommercialValue('');
    setNewCommercialUnit('');
  };

  const openAddPartner = () => {
    resetPartnerForm();
    setEditingPartnerId(null);
    setShowAddPartner(true);
  };

  const openEditPartner = (initiativePartner: any) => {
    const isUploadedFile = initiativePartner.media_url &&
      (initiativePartner.media_url.startsWith('videos/') ||
        initiativePartner.media_url.startsWith('audios/') ||
        initiativePartner.media_url.startsWith('documents/'));
    const sourceType = isUploadedFile ? 'upload' : 'link';
    partnerForm.reset({
      partner_id: initiativePartner.partner_id,
      partner_logo_url: initiativePartner.partner?.logo_url || '',
      product_ids: initiativePartner.initiative_partner_products?.map((p: any) => p.product_id) || [],
      integration_cost: initiativePartner.integration_cost?.toString() || '',
      annual_cost: initiativePartner.annual_cost?.toString() || '',
      pricing_per_call: initiativePartner.pricing_per_call?.toString() || '',
      pricing_unit: initiativePartner.pricing_unit || 'Per Call',
      currency: initiativePartner.currency || 'INR',
      billing_contact: initiativePartner.billing_contact || '',
      terms_and_conditions: initiativePartner.terms_and_conditions || '',
      api_version: initiativePartner.api_version || '1.0',
      api_documentation: initiativePartner.api_documentation || '',
      api_notes: (initiativePartner as any).api_notes || '',
      uat_api_key: (initiativePartner as any).uat_api_key || '',
      production_api_key: (initiativePartner as any).production_api_key || '',
      api_request_sample: (initiativePartner as any).api_request_sample || '',
      api_response_sample: (initiativePartner as any).api_response_sample || '',
      partner_rank: (initiativePartner as any).partner_rank ? String((initiativePartner as any).partner_rank) : '',
      media_source_type: sourceType,
      media_type: initiativePartner.media_type || 'video',
      media_title: initiativePartner.media_title || '',
      media_url: initiativePartner.media_url || '',
      media_description: initiativePartner.media_description || '',
    });
    setSelectedProducts(initiativePartner.initiative_partner_products?.map((p: any) => p.product_id) || []);
    setMediaSourceType(sourceType);
    setMediaType(initiativePartner.media_type || 'video');
    // Load existing features
    const existingFeatures: FeatureRow[] = (initiativePartner.partner_features || []).map((f: any) => ({
      feature_name: f.feature_name,
      is_available: f.is_available,
      notes: f.notes || '',
    }));
    setFeatures(existingFeatures);
    // Load existing custom commercial fields
    const existingCustomFields: CustomCommercialField[] = Array.isArray(initiativePartner.custom_commercial_fields)
      ? (initiativePartner.custom_commercial_fields as any[]).map((f: any) => ({
          label: f.label || '',
          value: f.value || '',
          unit: f.unit || '',
        }))
      : [];
    setCustomCommercialFields(existingCustomFields);
    setPdfUploads([]);
    setEditingPartnerId(initiativePartner.id);
    setShowAddPartner(true);
  };

  const validateMediaFile = (file: File, type: 'video' | 'audio' | 'document'): { valid: boolean; error?: string } => {
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) return { valid: false, error: 'File too large. Maximum size is 100MB.' };
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (type === 'video') {
      if (!['mp4', 'webm', 'mov'].includes(ext || '')) return { valid: false, error: 'Allowed: mp4, webm, mov' };
    } else if (type === 'audio') {
      if (!['mp3', 'wav', 'ogg', 'm4a'].includes(ext || '')) return { valid: false, error: 'Allowed: mp3, wav, ogg, m4a' };
    } else if (type === 'document') {
      if (!['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext || '')) return { valid: false, error: 'Allowed: pdf, doc, docx, ppt, pptx' };
    }
    return { valid: true };
  };

  const getAcceptedFileTypes = (type: 'video' | 'audio' | 'document'): string => {
    switch (type) {
      case 'video': return 'video/mp4,video/webm,video/quicktime';
      case 'audio': return 'audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/x-m4a';
      case 'document': return 'application/pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx';
    }
  };

  const getFileTypeDescription = (type: 'video' | 'audio' | 'document'): string => {
    switch (type) {
      case 'video': return 'Supports MP4, WebM, MOV (max 100MB)';
      case 'audio': return 'Supports MP3, WAV, OGG, M4A (max 100MB)';
      case 'document': return 'Supports PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX (max 100MB)';
    }
  };

  const sanitizeExtension = (filename: string, type: 'video' | 'audio' | 'document'): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const allowedExts: Record<string, string[]> = {
      video: ['mp4', 'webm', 'mov'],
      audio: ['mp3', 'wav', 'ogg', 'm4a'],
      document: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'],
    };
    return allowedExts[type].includes(ext || '') ? ext! : allowedExts[type][0];
  };

  const addFeature = () => {
    const name = newFeatureName.trim();
    if (!name) return;
    if (features.some(f => f.feature_name.toLowerCase() === name.toLowerCase())) {
      toast({ variant: 'destructive', title: 'Feature already exists' });
      return;
    }
    setFeatures(prev => [...prev, { feature_name: name, is_available: true, notes: '' }]);
    setNewFeatureName('');
  };

  const removeFeature = (index: number) => {
    setFeatures(prev => prev.filter((_, i) => i !== index));
  };

  const addPdfToQueue = (file: File) => {
    const title = newPdfTitle.trim() || file.name.replace(/\.pdf$/i, '');
    setPdfUploads(prev => [...prev, { title, file }]);
    setNewPdfTitle('');
    if (pdfInputRef.current) pdfInputRef.current.value = '';
  };

  const onPartnerSubmit = async (data: PartnerFormValues) => {
    if (!id) return;

    try {
      if (data.partner_logo_url && data.partner_id) {
        await updatePartner.mutateAsync({ id: data.partner_id, logo_url: data.partner_logo_url });
      }

      let mediaUrl = data.media_url || null;
      if (mediaSourceType === 'upload' && mediaFile) {
        const validation = validateMediaFile(mediaFile, mediaType);
        if (!validation.valid) {
          toast({ variant: 'destructive', title: 'Invalid media file', description: validation.error });
          return;
        }
        setIsUploadingMedia(true);
        try {
          const form = new FormData();
          form.append('file', mediaFile);
          form.append('mediaType', mediaType);
          const result = await api.upload('/api/media/upload', form);
          mediaUrl = result.url;
        } finally {
          setIsUploadingMedia(false);
        }
      }

      const payload = {
        initiative_id: id,
        partner_id: data.partner_id,
        integration_cost: data.integration_cost ? parseFloat(data.integration_cost) : null,
        annual_cost: data.annual_cost ? parseFloat(data.annual_cost) : null,
        pricing_per_call: data.pricing_per_call ? parseFloat(data.pricing_per_call) : null,
        pricing_unit: data.pricing_unit === 'Custom'
          ? (data.pricing_unit_custom?.trim() || 'Custom')
          : (data.pricing_unit || null),
        currency: data.currency || null,
        billing_contact: data.billing_contact || null,
        terms_and_conditions: data.terms_and_conditions || null,
        api_version: data.api_version || null,
        api_documentation: data.api_documentation || null,
        api_notes: data.api_notes || null,
        uat_api_key: data.uat_api_key?.trim() || null,
        production_api_key: data.production_api_key?.trim() || null,
        api_request_sample: data.api_request_sample?.trim() || null,
        api_response_sample: data.api_response_sample?.trim() || null,
        partner_rank: data.partner_rank ? parseInt(data.partner_rank, 10) : null,
        media_type: mediaType,
        media_title: data.media_title || null,
        media_url: mediaUrl,
        media_description: data.media_description || null,
        custom_commercial_fields: customCommercialFields.length > 0 ? customCommercialFields : [],
      } as any;

      let initiativePartnerId = editingPartnerId;

      if (editingPartnerId) {
        await updateInitiativePartner.mutateAsync({ id: editingPartnerId, ...payload });
      } else {
        const result = await createInitiativePartner.mutateAsync(payload);
        initiativePartnerId = result.id;
      }

      if (initiativePartnerId) {
        // Sync products
        if (selectedProducts.length >= 0) {
          await syncProducts.mutateAsync({ initiativePartnerId, productIds: selectedProducts });
        }

        // Sync features
        await upsertFeatures.mutateAsync({ initiativePartnerId, features });

        // Upload PDFs
        for (const pdf of pdfUploads) {
          await uploadApiDocument.mutateAsync({
            initiative_partner_id: initiativePartnerId,
            title: pdf.title,
            file: pdf.file,
          });
        }
      }

      toast({ title: editingPartnerId ? 'Partner updated successfully' : 'Partner added successfully' });
      setShowAddPartner(false);
      resetPartnerForm();
      setMediaFile(null);
    } catch (error) {
      console.error('Partner submit error:', error);
      toast({
        variant: 'destructive',
        title: `Failed to ${editingPartnerId ? 'update' : 'add'} partner`,
        description: 'Please try again.',
      });
    }
  };

  const handleDeletePartner = async (initiativePartnerId: string) => {
    if (!id) return;
    try {
      await deleteInitiativePartner.mutateAsync({ id: initiativePartnerId, initiativeId: id });
      toast({ title: 'Partner removed successfully' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Failed to remove partner', description: 'Please try again.' });
    }
  };

  if (isEditing && isLoadingInitiative) {
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
          <Link to="/admin/initiatives"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditing ? 'Edit Initiative' : 'Create Initiative'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing
              ? 'Update initiative details and manage partner integrations'
              : 'Add an initiative (optionally under a main category)'}
          </p>
        </div>
      </div>

      {/* Initiative Basic Details */}
      <Card>
        <CardHeader>
          <CardTitle>Initiative Details</CardTitle>
          <CardDescription>
            Configure the initiative's name, description, overview and category assignment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., VKYC, Lead Gen Voice Bot" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parent_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Main Category <span className="text-muted-foreground font-normal">(Optional)</span></FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(val === '__none__' ? '' : val)}
                      value={field.value || '__none__'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="No main category (standalone initiative)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">— No category (standalone) —</SelectItem>
                        {parentInitiatives
                          ?.filter(p => p.id !== id)
                          .map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Optionally group this under a main category (e.g., VKYC → KYC). Standalone initiatives appear directly on the portal home page.
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
                    <FormLabel>Short Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Brief description shown on listing cards..." className="min-h-[80px]" {...field} />
                    </FormControl>
                    <FormDescription>Shown on cards in the portal listing view.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="overview"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Overview / Detailed Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Full overview shown on the initiative detail page..." className="min-h-[120px]" {...field} />
                    </FormControl>
                    <FormDescription>Shown at the top of the initiative detail page for stakeholders.</FormDescription>
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
                    <Select onValueChange={field.onChange} value={field.value || 'active'}>
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

              <div className="flex gap-4">
                <Button type="submit" disabled={createInitiative.isPending || updateInitiative.isPending}>
                  {(createInitiative.isPending || updateInitiative.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isEditing ? 'Update Initiative' : 'Create Initiative'}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link to="/admin/initiatives">Cancel</Link>
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Partners Section - Only show when editing */}
      {isEditing && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Partner Details
              </CardTitle>
              <CardDescription>Manage partners and their integration details</CardDescription>
            </div>
            <Dialog open={showAddPartner} onOpenChange={setShowAddPartner}>
              <DialogTrigger asChild>
                <Button onClick={openAddPartner} className="bg-primary hover:bg-primary/90">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Partner
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingPartnerId ? 'Edit Partner Details' : 'Add Partner'}</DialogTitle>
                  <DialogDescription>Configure commercial, technical, features, and media</DialogDescription>
                </DialogHeader>

                <Form {...partnerForm}>
                  <form onSubmit={partnerForm.handleSubmit(onPartnerSubmit)} className="space-y-6">
                    {/* Partner Selection */}
                    <FormField
                      control={partnerForm.control}
                      name="partner_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Partner *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={!!editingPartnerId}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose a partner" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {partners?.map((partner) => (
                                <SelectItem key={partner.id} value={partner.id}>{partner.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Partner Rank / Priority */}
                    <FormField
                      control={partnerForm.control}
                      name="partner_rank"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Partner Priority <span className="text-muted-foreground font-normal">(Optional)</span></FormLabel>
                          <Select
                            onValueChange={(val) => field.onChange(val === '__none__' ? '' : val)}
                            value={field.value || '__none__'}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="No priority set" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="__none__">— Not set —</SelectItem>
                              <SelectItem value="1">Primary (1)</SelectItem>
                              <SelectItem value="2">Secondary (2)</SelectItem>
                              <SelectItem value="3">Tertiary (3)</SelectItem>
                              <SelectItem value="4">Quaternary (4)</SelectItem>
                              <SelectItem value="5">5</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>Determines the display order on the user-facing page (Primary first).</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Partner Logo URL */}
                    <FormField
                      control={partnerForm.control}
                      name="partner_logo_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Image className="h-4 w-4" />
                            Partner Logo URL
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="https://example.com/partner-logo.png" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Products */}
                    <div className="space-y-2">
                      <FormLabel className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Products
                      </FormLabel>
                      <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-muted/30">
                        {products?.map((product) => (
                          <Badge
                            key={product.id}
                            variant={selectedProducts.includes(product.id) ? 'default' : 'outline'}
                            className="cursor-pointer hover:bg-primary/80"
                            onClick={() => {
                              setSelectedProducts(prev =>
                                prev.includes(product.id) ? prev.filter(p => p !== product.id) : [...prev, product.id]
                              );
                            }}
                          >
                            {product.name}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Commercial Details */}
                    <div className="space-y-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Commercial Details
                      </h4>
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField control={partnerForm.control} name="integration_cost" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Integration Cost (₹)</FormLabel>
                            <FormControl><Input type="number" placeholder="e.g., 50000" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={partnerForm.control} name="annual_cost" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Annual Cost (₹)</FormLabel>
                            <FormControl><Input type="number" placeholder="e.g., 100000" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={partnerForm.control} name="pricing_per_call" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price (₹)</FormLabel>
                            <FormControl><Input type="number" step="0.01" placeholder="e.g., 2.50" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <div className="space-y-2">
                          <FormField control={partnerForm.control} name="pricing_unit" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Pricing Unit</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="Per Call">Per Call</SelectItem>
                                  <SelectItem value="Per API Call">Per API Call</SelectItem>
                                  <SelectItem value="Per Transaction">Per Transaction</SelectItem>
                                  <SelectItem value="Per Month">Per Month</SelectItem>
                                  <SelectItem value="Per User">Per User</SelectItem>
                                  <SelectItem value="Per Verification">Per Verification</SelectItem>
                                  <SelectItem value="Per Document">Per Document</SelectItem>
                                  <SelectItem value="Custom">Custom</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />
                          {partnerForm.watch('pricing_unit') === 'Custom' && (
                            <FormField control={partnerForm.control} name="pricing_unit_custom" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">Custom Pricing Label <span className="font-normal">(Optional)</span></FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., Per KYC Journey, Per Scan…" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          )}
                        </div>
                        <FormField control={partnerForm.control} name="currency" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Currency</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="INR">INR (₹)</SelectItem>
                                <SelectItem value="USD">USD ($)</SelectItem>
                                <SelectItem value="EUR">EUR (€)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={partnerForm.control} name="billing_contact" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Billing Contact</FormLabel>
                            <FormControl><Input placeholder="billing@partner.com" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <FormField control={partnerForm.control} name="terms_and_conditions" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Terms & Conditions</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Enter terms and conditions..." className="min-h-[80px]" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      {/* Custom Commercial Fields */}
                      <div className="space-y-3 pt-2">
                        <FormLabel className="text-sm font-medium">Additional Commercial Details</FormLabel>
                        <p className="text-xs text-muted-foreground">Add any extra commercial fields (e.g., Setup Fee, Support Cost, etc.)</p>
                        {customCommercialFields.length > 0 && (
                          <div className="space-y-2">
                            {customCommercialFields.map((cf, i) => (
                              <div key={i} className="flex items-center gap-2 p-2 bg-muted/40 rounded-lg text-sm">
                                <span className="font-medium min-w-[100px]">{cf.label}</span>
                                <span className="text-muted-foreground">:</span>
                                <span>{cf.value}</span>
                                {cf.unit && <span className="text-muted-foreground text-xs">({cf.unit})</span>}
                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 ml-auto text-destructive" onClick={() => setCustomCommercialFields(prev => prev.filter((_, ii) => ii !== i))}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Input placeholder="Label (e.g., Setup Fee)" value={newCommercialLabel} onChange={(e) => setNewCommercialLabel(e.target.value)} className="flex-1" />
                          <Input placeholder="Value (e.g., 25000)" value={newCommercialValue} onChange={(e) => setNewCommercialValue(e.target.value)} className="w-32" />
                          <Input placeholder="Unit (optional)" value={newCommercialUnit} onChange={(e) => setNewCommercialUnit(e.target.value)} className="w-28" />
                          <Button type="button" variant="outline" onClick={() => {
                            if (!newCommercialLabel.trim() || !newCommercialValue.trim()) return;
                            setCustomCommercialFields(prev => [...prev, { label: newCommercialLabel.trim(), value: newCommercialValue.trim(), unit: newCommercialUnit.trim() }]);
                            setNewCommercialLabel(''); setNewCommercialValue(''); setNewCommercialUnit('');
                          }}>
                            <Plus className="h-4 w-4 mr-1" />Add
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Features */}
                    <div className="space-y-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <CheckSquare className="h-4 w-4" />
                        Partner Features
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Add features offered by this partner (e.g., Reverse Geocoding, PAN OCR, Face Match)
                      </p>
                      {features.length > 0 && (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {features.map((f, i) => (
                            <div key={i} className="flex items-center gap-3 p-2 bg-muted/40 rounded-lg">
                              <Switch
                                checked={f.is_available}
                                onCheckedChange={(val) => {
                                  setFeatures(prev => prev.map((ff, ii) => ii === i ? { ...ff, is_available: val } : ff));
                                }}
                              />
                              <span className={`flex-1 text-sm font-medium ${!f.is_available ? 'line-through text-muted-foreground' : ''}`}>
                                {f.feature_name}
                              </span>
                              <Input
                                placeholder="Notes (optional)"
                                value={f.notes}
                                onChange={(e) => setFeatures(prev => prev.map((ff, ii) => ii === i ? { ...ff, notes: e.target.value } : ff))}
                                className="h-8 text-xs w-40"
                              />
                              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeFeature(i)}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Feature name (e.g., PAN OCR)"
                          value={newFeatureName}
                          onChange={(e) => setNewFeatureName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); } }}
                          className="flex-1"
                        />
                        <Button type="button" variant="outline" onClick={addFeature}>
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    {/* Technical Details */}
                    <div className="space-y-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <FileCode className="h-4 w-4" />
                        Technical / API Details
                      </h4>
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField control={partnerForm.control} name="api_version" render={({ field }) => (
                          <FormItem>
                            <FormLabel>API Version</FormLabel>
                            <FormControl><Input placeholder="e.g., 2.1" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={partnerForm.control} name="api_documentation" render={({ field }) => (
                          <FormItem>
                            <FormLabel>API Documentation URL</FormLabel>
                            <FormControl><Input placeholder="https://docs.partner.com/api" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      {/* API Notes */}
                      <FormField control={partnerForm.control} name="api_notes" render={({ field }) => (
                        <FormItem>
                          <FormLabel>API Notes / Additional Details</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Any additional API details, notes, authentication steps, environment configs, sandbox credentials, etc."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      {/* PDF Uploads */}
                      <div className="space-y-3">
                        <FormLabel className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          API Documentation PDFs
                        </FormLabel>
                        <p className="text-xs text-muted-foreground">Upload one or more PDF files (API guides, Postman collections, integration docs)</p>

                        {/* Existing PDFs shown after edit open */}
                        {editingPartnerId && <ExistingApiDocs partnerId={editingPartnerId} />}

                        {/* New PDFs queued */}
                        {pdfUploads.length > 0 && (
                          <div className="space-y-1">
                            {pdfUploads.map((p, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm bg-muted/40 rounded px-3 py-1.5">
                                <FileText className="h-3.5 w-3.5 text-primary" />
                                <span className="flex-1 font-medium">{p.title}</span>
                                <span className="text-muted-foreground text-xs">{p.file.name}</span>
                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setPdfUploads(prev => prev.filter((_, ii) => ii !== i))}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Input
                            placeholder="Document title (optional)"
                            value={newPdfTitle}
                            onChange={(e) => setNewPdfTitle(e.target.value)}
                            className="flex-1"
                          />
                          <input
                            type="file"
                            ref={pdfInputRef}
                            accept="application/pdf,.doc,.docx"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) addPdfToQueue(file);
                            }}
                          />
                          <Button type="button" variant="outline" onClick={() => pdfInputRef.current?.click()}>
                            <Upload className="h-4 w-4 mr-1" />
                            Choose File
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* API Keys (Optional) */}
                    <div className="space-y-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <FileCode className="h-4 w-4" />
                        API Keys <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        These keys will only be displayed on the user-facing page if filled in.
                      </p>
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField control={partnerForm.control} name="uat_api_key" render={({ field }) => (
                          <FormItem>
                            <FormLabel>UAT API Key</FormLabel>
                            <FormControl><Input placeholder="UAT / Sandbox key" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={partnerForm.control} name="production_api_key" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Production API Key</FormLabel>
                            <FormControl><Input placeholder="Production key" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    </div>

                    <Separator />

                    {/* API Request / Response Samples (Optional) */}
                    <div className="space-y-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <FileCode className="h-4 w-4" />
                        API Request & Response <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Paste sample API request and response payloads. Shown on the user page only if filled in.
                      </p>
                      <FormField control={partnerForm.control} name="api_request_sample" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sample Request</FormLabel>
                          <FormControl>
                            <Textarea placeholder='e.g., {"name":"John","pan":"ABCDE1234F"}' className="min-h-[120px] font-mono text-xs" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={partnerForm.control} name="api_response_sample" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sample Response</FormLabel>
                          <FormControl>
                            <Textarea placeholder='e.g., {"status":"success","data":{...}}' className="min-h-[120px] font-mono text-xs" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <Separator />

                    {/* Media Section */}
                    <div className="space-y-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Media
                      </h4>
                      <div className="space-y-2">
                        <FormLabel>Media Type</FormLabel>
                        <RadioGroup
                          value={mediaType}
                          onValueChange={(value: 'video' | 'audio' | 'document') => { setMediaType(value); setMediaFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="video" id="media-video" />
                            <label htmlFor="media-video" className="flex items-center gap-1 cursor-pointer text-sm"><Film className="h-4 w-4" />Video</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="audio" id="media-audio" />
                            <label htmlFor="media-audio" className="flex items-center gap-1 cursor-pointer text-sm"><Music className="h-4 w-4" />Audio</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="document" id="media-document" />
                            <label htmlFor="media-document" className="flex items-center gap-1 cursor-pointer text-sm"><FileText className="h-4 w-4" />Document</label>
                          </div>
                        </RadioGroup>
                      </div>
                      <div className="space-y-2">
                        <FormLabel>Media Source</FormLabel>
                        <RadioGroup
                          value={mediaSourceType}
                          onValueChange={(value: 'link' | 'upload') => setMediaSourceType(value)}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="link" id="media-link" />
                            <label htmlFor="media-link" className="flex items-center gap-1 cursor-pointer text-sm"><Link2 className="h-4 w-4" />External Link</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="upload" id="media-upload" />
                            <label htmlFor="media-upload" className="flex items-center gap-1 cursor-pointer text-sm"><Upload className="h-4 w-4" />Upload File</label>
                          </div>
                        </RadioGroup>
                      </div>

                      <FormField control={partnerForm.control} name="media_title" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Media Title</FormLabel>
                          <FormControl><Input placeholder="e.g., Integration Guide" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      {mediaSourceType === 'link' ? (
                        <FormField control={partnerForm.control} name="media_url" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Media URL</FormLabel>
                            <FormControl>
                              <Input placeholder={mediaType === 'video' ? 'https://youtube.com/watch?v=...' : 'https://...'} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      ) : (
                        <div className="space-y-3">
                          <input type="file" ref={fileInputRef} accept={getAcceptedFileTypes(mediaType)} className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) setMediaFile(file); }} />
                          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                            {mediaFile ? (
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-primary">{mediaFile.name}</p>
                                <p className="text-xs text-muted-foreground">{(mediaFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                              </div>
                            ) : (
                              <>
                                <p className="text-sm text-muted-foreground mb-2">Click to browse your {mediaType} file</p>
                                <Button type="button" variant="outline" size="sm">Choose File</Button>
                              </>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">{getFileTypeDescription(mediaType)}</p>
                          </div>
                          {mediaFile && (
                            <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => { setMediaFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>Remove file</Button>
                          )}
                        </div>
                      )}

                      <FormField control={partnerForm.control} name="media_description" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Media Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Brief description of the media..." className="min-h-[80px]" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setShowAddPartner(false)}>Cancel</Button>
                      <Button type="submit" disabled={createInitiativePartner.isPending || updateInitiativePartner.isPending || isUploadingMedia}>
                        {(createInitiativePartner.isPending || updateInitiativePartner.isPending || isUploadingMedia) && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {isUploadingMedia ? 'Uploading...' : editingPartnerId ? 'Update Partner' : 'Add Partner'}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {isLoadingPartners ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : initiativePartners && initiativePartners.length > 0 ? (
              <Accordion type="single" collapsible className="w-full">
                {initiativePartners.map((ip: any) => (
                  <AccordionItem key={ip.id} value={ip.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 w-full pr-4">
                        {ip.partner?.logo_url ? (
                          <img src={ip.partner.logo_url} alt={ip.partner.name} className="h-9 w-9 rounded-lg object-contain border border-border" />
                        ) : (
                          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <div className="text-left">
                          <p className="font-semibold">{ip.partner?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {ip.integration_cost ? `Integration: ₹${ip.integration_cost.toLocaleString()}` : ''}
                            {ip.integration_cost && ip.annual_cost ? ' • ' : ''}
                            {ip.annual_cost ? `Annual: ₹${ip.annual_cost.toLocaleString()}` : ''}
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-2 pl-2">
                        <div className="grid gap-4 md:grid-cols-3 text-sm">
                          <div><p className="text-muted-foreground">Price</p><p className="font-medium">{ip.pricing_per_call ? `₹${ip.pricing_per_call}` : '-'}</p></div>
                          <div><p className="text-muted-foreground">API Version</p><p className="font-medium">{ip.api_version || '-'}</p></div>
                          <div><p className="text-muted-foreground">Billing Contact</p><p className="font-medium">{ip.billing_contact || '-'}</p></div>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button size="sm" variant="outline" onClick={() => openEditPartner(ip)}>Edit Details</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeletePartner(ip.id)} disabled={deleteInitiativePartner.isPending}>
                            {deleteInitiativePartner.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No partners added yet</p>
                <p className="text-sm">Click "Add Partner" to configure partner integrations</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Helper component to show existing API docs for a partner
const ExistingApiDocs = ({ partnerId }: { partnerId: string }) => {
  const { data: docs } = useApiDocuments(partnerId);
  const deleteDoc = useDeleteApiDocument();
  const { toast } = useToast();

  if (!docs || docs.length === 0) return null;

  return (
    <div className="space-y-1 mb-2">
      <p className="text-xs text-muted-foreground font-medium">Existing documents:</p>
      {docs.map((doc) => (
        <div key={doc.id} className="flex items-center gap-2 text-sm bg-muted/40 rounded px-3 py-1.5">
          <FileText className="h-3.5 w-3.5 text-primary" />
          <span className="flex-1 font-medium">{doc.title}</span>
          <span className="text-muted-foreground text-xs">{doc.file_name}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive"
            onClick={async () => {
              try {
                await deleteDoc.mutateAsync({ id: doc.id, initiativePartnerId: doc.initiative_partner_id });
                toast({ title: 'Document deleted' });
              } catch {
                toast({ variant: 'destructive', title: 'Failed to delete document' });
              }
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
};

export default InitiativeForm;
