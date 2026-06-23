import { useParams, Link } from 'react-router-dom';
import { useInitiative } from '@/hooks/useInitiatives';
import { useApiDocuments, getSignedApiDocUrl } from '@/hooks/useApiDocuments';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, Building2, FileCode, FileText, Loader2, Copy, Check,
  Film, Music, CheckCircle2, XCircle, DollarSign, BarChart3, ExternalLink,
  Users, TrendingUp,
} from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

// ─── Helpers ────────────────────────────────────────────────────────────────

const isStoragePath = (url: string) =>
  (url.startsWith('videos/') || url.startsWith('audios/') || url.startsWith('documents/')) && !url.startsWith('http');

const formatCurrency = (value: any, currency?: string) => {
  if (!value) return '—';
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹';
  return `${symbol}${Number(value).toLocaleString()}`;
};

// ─── Secure Media Player ─────────────────────────────────────────────────────

const SecureMediaPlayer = ({ mediaUrl, mediaTitle, mediaType }: { mediaUrl: string; mediaTitle?: string; mediaType?: string }) => {
  const [signedUrl] = useState<string | null>(mediaUrl);

  if (!signedUrl) return <div className="aspect-video rounded-lg bg-muted flex items-center justify-center"><p className="text-muted-foreground">Media unavailable</p></div>;

  if (signedUrl.includes('youtube.com') || signedUrl.includes('youtu.be') || signedUrl.includes('vimeo.com')) {
    return <iframe src={signedUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" title={mediaTitle || 'Partner video'} />;
  }

  const type = mediaType || 'video';
  if (type === 'video') return <video src={signedUrl} className="w-full h-full" controls controlsList="nodownload" preload="metadata">Your browser does not support video.</video>;
  if (type === 'audio') return <div className="flex flex-col items-center justify-center p-8 bg-muted rounded-lg"><Music className="h-16 w-16 text-primary mb-4" /><audio src={signedUrl} controls controlsList="nodownload" className="w-full max-w-md" /></div>;
  if (type === 'document') return <div className="flex flex-col items-center justify-center p-8 bg-muted rounded-lg"><FileText className="h-16 w-16 text-primary mb-4" /><a href={signedUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"><FileText className="h-4 w-4" />View Document</a></div>;
  return null;
};

// ─── API Documents list ───────────────────────────────────────────────────────

const ApiDocsList = ({ initiativePartnerId }: { initiativePartnerId: string }) => {
  const { data: docs, isLoading } = useApiDocuments(initiativePartnerId);
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);
  const { toast } = useToast();

  const openDoc = async (doc: { id: string; file_path: string; title: string }) => {
    setLoadingDocId(doc.id);
    const url = await getSignedApiDocUrl(doc.file_path);
    setLoadingDocId(null);
    if (url) { window.open(url, '_blank'); }
    else { toast({ variant: 'destructive', title: 'Could not open document' }); }
  };

  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
  if (!docs || docs.length === 0) return null;

  return (
    <div className="space-y-2 mt-4">
      <h5 className="text-sm font-semibold">API Documentation Files</h5>
      <div className="grid gap-2">
        {docs.map((doc) => (
          <button
            key={doc.id}
            onClick={() => openDoc(doc)}
            disabled={loadingDocId === doc.id}
            className="flex items-center gap-3 p-3 border border-border/60 rounded-lg hover:bg-muted/50 transition-colors text-left group"
          >
            <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
              {loadingDocId === doc.id ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <FileText className="h-4 w-4 text-primary" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{doc.title}</p>
              <p className="text-xs text-muted-foreground truncate">{doc.file_name}</p>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── API Tab Content (checks both text docs and uploaded files) ──────────────

const ApiTabContent = ({ ip, copiedId, onCopy }: { ip: any; copiedId: string | null; onCopy: (text: string, id: string) => void }) => {
  const { data: docs } = useApiDocuments(ip.id);
  const hasUploadedDocs = docs && docs.length > 0;
  const hasApiUrl = !!ip.api_documentation;
  const hasApiNotes = !!(ip as any).api_notes;
  const hasApiSpecs = !!(ip.api_specifications && ip.api_specifications.length > 0);
  const hasContent = hasApiUrl || hasApiNotes || hasApiSpecs || hasUploadedDocs;

  return (
    <div className="space-y-4">
      {hasApiUrl && (
        <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
          <FileCode className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Documentation URL</p>
            <a href={ip.api_documentation} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate block">{ip.api_documentation}</a>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => onCopy(ip.api_documentation, `doc-${ip.id}`)}>
            {copiedId === `doc-${ip.id}` ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
      )}

      {hasApiNotes && (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">API Notes</p>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 rounded-lg p-3">{(ip as any).api_notes}</p>
        </div>
      )}

      <ApiDocsList initiativePartnerId={ip.id} />

      {hasApiSpecs && (
        <div className="space-y-3">
          {ip.api_specifications.map((spec: any) => (
            <div key={spec.id} className="space-y-3">
              <p className="text-sm font-semibold">API Specification v{spec.version}</p>
              {spec.input_parameters && Array.isArray(spec.input_parameters) && (spec.input_parameters as any[]).length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Input Parameters</p>
                  <div className="overflow-x-auto rounded-lg border border-border/50">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="text-xs">Name</TableHead>
                          <TableHead className="text-xs">Type</TableHead>
                          <TableHead className="text-xs">Required</TableHead>
                          <TableHead className="text-xs">Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(spec.input_parameters as Array<{ name: string; type: string; required: boolean; description: string }>).map((param, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono text-xs">{param.name}</TableCell>
                            <TableCell className="text-xs">{param.type}</TableCell>
                            <TableCell><Badge variant={param.required ? 'default' : 'secondary'} className="text-xs">{param.required ? 'Yes' : 'No'}</Badge></TableCell>
                            <TableCell className="text-xs text-muted-foreground">{param.description}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!hasContent && (
        <p className="text-sm text-muted-foreground">No API documentation available.</p>
      )}
    </div>
  );
};

// ─── Feature Comparison Table ─────────────────────────────────────────────────

const FeatureComparisonTable = ({ initiativePartners }: { initiativePartners: any[] }) => {
  const allFeatures = Array.from(
    new Set(
      initiativePartners.flatMap((ip) =>
        (ip.partner_features || []).map((f: any) => f.feature_name)
      )
    )
  ).sort();

  if (allFeatures.length === 0) return (
    <div className="text-center py-8 text-muted-foreground">
      <CheckCircle2 className="mx-auto h-8 w-8 mb-2 opacity-40" />
      <p className="text-sm">No features configured for comparison yet.</p>
    </div>
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-border/60 shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-48 font-semibold">Feature</TableHead>
            {initiativePartners.map((ip) => (
              <TableHead key={ip.id} className="text-center font-semibold min-w-[120px]">
                <div className="flex flex-col items-center gap-1">
                  {ip.partner?.logo_url ? (
                    <img src={ip.partner.logo_url} alt={ip.partner.name} className="h-6 w-auto object-contain" />
                  ) : null}
                  <span className="text-xs">{ip.partner?.name}</span>
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {allFeatures.map((featureName, idx) => (
            <TableRow key={featureName} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
              <TableCell className="font-medium text-sm">{featureName}</TableCell>
              {initiativePartners.map((ip) => {
                const feat = (ip.partner_features || []).find((f: any) => f.feature_name === featureName);
                return (
                  <TableCell key={ip.id} className="text-center">
                    {!feat ? (
                      <span className="text-muted-foreground text-xs">—</span>
                    ) : feat.is_available ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <CheckCircle2 className="h-5 w-5 text-primary mx-auto" />
                        {feat.notes && <span className="text-xs text-muted-foreground">{feat.notes}</span>}
                      </div>
                    ) : (
                      <XCircle className="h-5 w-5 text-muted-foreground/50 mx-auto" />
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

// ─── Commercial Comparison Table ──────────────────────────────────────────────

const CommercialComparisonTable = ({ initiativePartners }: { initiativePartners: any[] }) => {
  const rows = [
    { label: 'Integration Cost', key: 'integration_cost', format: (v: any, ip: any) => v ? formatCurrency(v, ip.currency) : '—' },
    { label: 'Annual Cost', key: 'annual_cost', format: (v: any, ip: any) => v ? formatCurrency(v, ip.currency) : '—' },
    { label: 'Price', key: 'pricing_per_call', format: (v: any, ip: any) => v ? `${formatCurrency(v, ip.currency)} / ${ip.pricing_unit || 'call'}` : '—' },
    { label: 'Billing Contact', key: 'billing_contact', format: (v: any) => v || '—' },
  ];

  // Collect all unique custom commercial field labels across partners
  const customLabels: string[] = [];
  initiativePartners.forEach((ip) => {
    const fields = Array.isArray(ip.custom_commercial_fields) ? ip.custom_commercial_fields : [];
    fields.forEach((f: any) => {
      if (f.label && !customLabels.includes(f.label)) customLabels.push(f.label);
    });
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-border/60 shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-48 font-semibold">Detail</TableHead>
            {initiativePartners.map((ip) => (
              <TableHead key={ip.id} className="text-center font-semibold min-w-[140px]">
                <div className="flex flex-col items-center gap-1">
                  {ip.partner?.logo_url ? (
                    <img src={ip.partner.logo_url} alt={ip.partner.name} className="h-6 w-auto object-contain" />
                  ) : null}
                  <span className="text-xs">{ip.partner?.name}</span>
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, idx) => (
            <TableRow key={row.key} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
              <TableCell className="font-medium text-sm">{row.label}</TableCell>
              {initiativePartners.map((ip) => (
                <TableCell key={ip.id} className="text-center text-sm">
                  {row.format((ip as any)[row.key], ip)}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {customLabels.map((label, idx) => (
            <TableRow key={`custom-${label}`} className={(rows.length + idx) % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
              <TableCell className="font-medium text-sm">{label}</TableCell>
              {initiativePartners.map((ip) => {
                const fields = Array.isArray(ip.custom_commercial_fields) ? ip.custom_commercial_fields : [];
                const field = fields.find((f: any) => f.label === label);
                return (
                  <TableCell key={ip.id} className="text-center text-sm">
                    {field ? `${field.value}${field.unit ? ` (${field.unit})` : ''}` : '—'}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

// ─── Partner Comparison Section ───────────────────────────────────────────────

const PartnerComparison = ({ initiativePartners }: { initiativePartners: any[] }) => {
  if (initiativePartners.length < 2) return null;

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 bg-muted/30 border-b border-border/50">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Partner Comparison</h2>
        <Badge variant="secondary" className="ml-auto">{initiativePartners.length} partners</Badge>
      </div>
      <div className="p-6">
        <Tabs defaultValue="features" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="features" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Features
            </TabsTrigger>
            <TabsTrigger value="commercials" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Commercials
            </TabsTrigger>
          </TabsList>
          <TabsContent value="features" className="mt-0">
            <FeatureComparisonTable initiativePartners={initiativePartners} />
          </TabsContent>
          <TabsContent value="commercials" className="mt-0">
            <CommercialComparisonTable initiativePartners={initiativePartners} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// ─── Partner Card ─────────────────────────────────────────────────────────────

const rankLabel = (rank: number | null | undefined): string | null => {
  if (!rank) return null;
  if (rank === 1) return 'Primary';
  if (rank === 2) return 'Secondary';
  if (rank === 3) return 'Tertiary';
  if (rank === 4) return 'Quaternary';
  return `#${rank}`;
};

const PartnerCard = ({ ip, copiedId, onCopy }: { ip: any; copiedId: string | null; onCopy: (text: string, id: string) => void }) => {
  const priority = rankLabel(ip.partner_rank);
  const hasApiKeys = !!(ip.uat_api_key || ip.production_api_key);
  const hasReqRes = !!(ip.api_request_sample || ip.api_response_sample);
  return (
    <Card className="border border-border/60 shadow-sm overflow-hidden">
      {/* Partner header */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-border/50 bg-muted/20">
        {ip.partner?.logo_url ? (
          <img src={ip.partner.logo_url} alt={ip.partner.name} className="h-10 w-auto max-w-[80px] object-contain" />
        ) : (
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-base">{ip.partner?.name}</h3>
            {priority && (
              <Badge className={ip.partner_rank === 1 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}>
                {priority}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {ip.pricing_per_call ? `${ip.currency === 'USD' ? '$' : ip.currency === 'EUR' ? '€' : '₹'}${ip.pricing_per_call} / ${ip.pricing_unit || 'call'}` : 'Pricing on request'}
          </p>
        </div>
        <Badge variant="outline" className="text-xs">v{ip.api_version || '1.0'}</Badge>
      </div>

      {/* Tabs */}
      <CardContent className="p-0">
        <Tabs defaultValue="commercial" className="w-full">
          <TabsList className="w-full rounded-none border-b border-border/50 bg-muted/10 h-auto flex-wrap justify-start px-4 gap-1 py-1">
            <TabsTrigger value="commercial" className="text-xs h-8 data-[state=active]:bg-background">Commercial</TabsTrigger>
            <TabsTrigger value="api" className="text-xs h-8 data-[state=active]:bg-background">API Docs</TabsTrigger>
            {hasApiKeys && <TabsTrigger value="api-keys" className="text-xs h-8 data-[state=active]:bg-background">API Keys</TabsTrigger>}
            {hasReqRes && <TabsTrigger value="req-res" className="text-xs h-8 data-[state=active]:bg-background">Request / Response</TabsTrigger>}
            <TabsTrigger value="media" className="text-xs h-8 data-[state=active]:bg-background">Media</TabsTrigger>
            <TabsTrigger value="products" className="text-xs h-8 data-[state=active]:bg-background">Products</TabsTrigger>
            <TabsTrigger value="support" className="text-xs h-8 data-[state=active]:bg-background">Support</TabsTrigger>
          </TabsList>

          <div className="p-5">
            <TabsContent value="commercial" className="mt-0 space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Price', value: ip.pricing_per_call ? formatCurrency(ip.pricing_per_call, ip.currency) : 'N/A', sub: ip.pricing_unit },
                  { label: 'Integration Cost', value: ip.integration_cost ? formatCurrency(ip.integration_cost, ip.currency) : 'N/A' },
                  { label: 'Annual Cost', value: ip.annual_cost ? formatCurrency(ip.annual_cost, ip.currency) : 'N/A' },
                ].map((item) => (
                  <div key={item.label} className="bg-muted/30 rounded-lg px-3 py-2.5">
                    <p className="text-xs text-muted-foreground mb-0.5">{item.label}</p>
                    <p className="font-bold text-sm">{item.value}
                      {item.sub && <span className="text-xs font-normal text-muted-foreground ml-1">/ {item.sub}</span>}
                    </p>
                  </div>
                ))}
              </div>
              {ip.billing_contact && <p className="text-sm"><span className="text-muted-foreground">Billing: </span>{ip.billing_contact}</p>}
              {/* Custom commercial fields */}
              {Array.isArray(ip.custom_commercial_fields) && ip.custom_commercial_fields.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-3">
                  {(ip.custom_commercial_fields as any[]).map((cf: any, idx: number) => (
                    <div key={idx} className="bg-muted/30 rounded-lg px-3 py-2.5">
                      <p className="text-xs text-muted-foreground mb-0.5">{cf.label}</p>
                      <p className="font-bold text-sm">{cf.value}
                        {cf.unit && <span className="text-xs font-normal text-muted-foreground ml-1">({cf.unit})</span>}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {ip.terms_and_conditions && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Terms & Conditions</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ip.terms_and_conditions}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="api" className="mt-0">
              <ApiTabContent ip={ip} copiedId={copiedId} onCopy={onCopy} />
            </TabsContent>

            {hasApiKeys && (
              <TabsContent value="api-keys" className="mt-0 space-y-3">
                {ip.uat_api_key && (
                  <div className="p-3 bg-muted/30 rounded-lg space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">UAT API Key</p>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onCopy(ip.uat_api_key, `uat-${ip.id}`)}>
                        {copiedId === `uat-${ip.id}` ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                    <p className="text-sm font-mono break-all">{ip.uat_api_key}</p>
                  </div>
                )}
                {ip.production_api_key && (
                  <div className="p-3 bg-muted/30 rounded-lg space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Production API Key</p>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onCopy(ip.production_api_key, `prod-${ip.id}`)}>
                        {copiedId === `prod-${ip.id}` ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                    <p className="text-sm font-mono break-all">{ip.production_api_key}</p>
                  </div>
                )}
              </TabsContent>
            )}

            {hasReqRes && (
              <TabsContent value="req-res" className="mt-0 space-y-4">
                {ip.api_request_sample && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sample Request</p>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onCopy(ip.api_request_sample, `req-${ip.id}`)}>
                        {copiedId === `req-${ip.id}` ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                    <pre className="text-xs font-mono bg-muted/40 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words">{ip.api_request_sample}</pre>
                  </div>
                )}
                {ip.api_response_sample && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sample Response</p>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onCopy(ip.api_response_sample, `res-${ip.id}`)}>
                        {copiedId === `res-${ip.id}` ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                    <pre className="text-xs font-mono bg-muted/40 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words">{ip.api_response_sample}</pre>
                  </div>
                )}
              </TabsContent>
            )}


            <TabsContent value="media" className="mt-0">
              {ip.media_url ? (
                <div className="space-y-3">
                  {ip.media_title && <p className="text-sm font-semibold">{ip.media_title}</p>}
                  {ip.media_description && <p className="text-sm text-muted-foreground">{ip.media_description}</p>}
                  {isStoragePath(ip.media_url) ? (
                    // Uploaded file — show the media player
                    <div className={ip.media_type === 'video' || !ip.media_type ? 'aspect-video rounded-lg overflow-hidden bg-muted' : ''}>
                      <SecureMediaPlayer mediaUrl={ip.media_url} mediaTitle={ip.media_title || 'Media'} mediaType={ip.media_type || 'video'} />
                    </div>
                  ) : (
                    // External link — show as a clickable link only
                    <a
                      href={ip.media_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors text-sm font-medium text-primary group"
                    >
                      <Film className="h-4 w-4 shrink-0" />
                      <span className="truncate max-w-xs">{ip.media_url}</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No media available.</p>
              )}
            </TabsContent>

            <TabsContent value="products" className="mt-0">
              {ip.initiative_partner_products && ip.initiative_partner_products.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {ip.initiative_partner_products.map((ipp: any) => (
                    <div key={ipp.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <span className="text-sm font-medium">{ipp.product?.name || 'Unknown'}</span>
                      <Badge variant={ipp.usage_status === 'in_use' ? 'default' : 'secondary'} className="text-xs">
                        {ipp.usage_status === 'in_use' ? 'Live' : ipp.usage_status || 'Planned'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No products mapped yet.</p>
              )}
            </TabsContent>

            <TabsContent value="support" className="mt-0">
              <div className="space-y-4">
                {(ip.partner?.contact_name || ip.partner?.contact_email || ip.partner?.contact_phone) && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Primary Contact</p>
                    <div className="text-sm space-y-0.5">
                      {ip.partner?.contact_name && <p className="font-medium">{ip.partner.contact_name}</p>}
                      {ip.partner?.contact_email && <p className="text-muted-foreground">{ip.partner.contact_email}</p>}
                      {ip.partner?.contact_phone && <p className="text-muted-foreground">{ip.partner.contact_phone}</p>}
                    </div>
                  </div>
                )}
                {ip.support_details ? (
                  <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Production Contact</p>
                      <div className="text-sm space-y-0.5">
                        <p className="font-medium">{ip.support_details.production_contact_name || '—'}</p>
                        <p className="text-muted-foreground">{ip.support_details.production_contact_email}</p>
                        <p className="text-muted-foreground">{ip.support_details.production_contact_phone}</p>
                      </div>
                    </div>
                    {ip.support_details.sandbox_contact && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Sandbox Contact</p>
                        <p className="text-sm text-muted-foreground">{ip.support_details.sandbox_contact}</p>
                      </div>
                    )}
                  </div>
                  {ip.support_details.known_issues && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Known Issues</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ip.support_details.known_issues}</p>
                    </div>
                  )}
                  </>
                ) : null}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const InitiativeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: initiative, isLoading, error } = useInitiative(id!);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: 'Copied to clipboard' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (error || !initiative) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <p className="text-destructive">Failed to load initiative details.</p>
      <Button asChild><Link to="/">Go Back</Link></Button>
    </div>
  );

  const partners = [...(initiative.initiative_partners || [])].sort((a: any, b: any) => {
    const ra = a.partner_rank ?? Number.POSITIVE_INFINITY;
    const rb = b.partner_rank ?? Number.POSITIVE_INFINITY;
    return ra - rb;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{initiative.name}</h1>
            <Badge variant={initiative.status === 'active' ? 'default' : 'secondary'} className={initiative.status === 'active' ? 'bg-primary' : ''}>
              {initiative.status}
            </Badge>
            {initiative.category && <span className="text-sm text-muted-foreground">{initiative.category}</span>}
          </div>
          {initiative.overview && (
            <p className="text-muted-foreground mt-2 max-w-2xl">{initiative.overview}</p>
          )}
        </div>
      </div>

      {/* Partner Details — shown first */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Partner Details</h2>
          <Badge variant="secondary" className="ml-1">{partners.length}</Badge>
        </div>

        {partners.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-1 xl:grid-cols-2">
            {partners.map((ip) => (
              <PartnerCard key={ip.id} ip={ip} copiedId={copiedId} onCopy={copyToClipboard} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No partner details configured yet.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Partner Comparison — shown below partner details, only when 2+ partners */}
      {partners.length >= 2 && (
        <PartnerComparison initiativePartners={partners} />
      )}
    </div>
  );
};

export default InitiativeDetail;
