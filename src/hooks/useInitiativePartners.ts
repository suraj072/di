import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface InitiativePartner {
  id: string;
  initiative_id: string;
  partner_id: string;
  integration_cost: string | null;
  annual_cost: string | null;
  pricing_per_call: string | null;
  pricing_unit: string | null;
  currency: string | null;
  billing_contact: string | null;
  sla_percentage: string | null;
  terms_and_conditions: string | null;
  api_version: string | null;
  api_documentation: string | null;
  api_notes: string | null;
  uat_api_key: string | null;
  production_api_key: string | null;
  api_request_sample: string | null;
  api_response_sample: string | null;
  media_type: string | null;
  media_title: string | null;
  media_url: string | null;
  media_description: string | null;
  custom_commercial_fields: any[];
  partner_rank: number | null;
  created_at: string;
  updated_at: string;
  partner?: Record<string, any>;
  initiative_partner_products?: Array<{ id: string; product?: Record<string, any>; usage_status?: string | null }>;
  partner_features?: Array<{ id: string; feature_name: string; is_available: boolean; notes?: string | null }>;
  api_documents?: any[];
  api_specifications?: any[];
  support_details?: Record<string, any> | null;
}

export type InitiativePartnerInsert = Pick<InitiativePartner, 'initiative_id' | 'partner_id'> & Partial<InitiativePartner>;
export type InitiativePartnerUpdate = Partial<InitiativePartner>;

export const useInitiativePartners = (initiativeId: string) =>
  useQuery({
    queryKey: ['initiative-partners', initiativeId],
    queryFn:  () => api.get(`/api/initiative-partners?initiativeId=${initiativeId}`),
    enabled:  !!initiativeId,
  });

export const useInitiativePartner = (id: string) =>
  useQuery({
    queryKey: ['initiative-partner', id],
    queryFn:  () => api.get(`/api/initiative-partners/${id}`),
    enabled:  !!id,
  });

export const useCreateInitiativePartner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InitiativePartnerInsert) => api.post('/api/initiative-partners', data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['initiative-partners', variables.initiative_id] });
      qc.invalidateQueries({ queryKey: ['initiatives'] });
    },
  });
};

export const useUpdateInitiativePartner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: InitiativePartnerUpdate & { id: string }) =>
      api.patch(`/api/initiative-partners/${id}`, data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['initiative-partners', data.initiative_id] });
      qc.invalidateQueries({ queryKey: ['initiative-partner', data.id] });
      qc.invalidateQueries({ queryKey: ['initiatives'] });
    },
  });
};

export const useDeleteInitiativePartner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, initiativeId }: { id: string; initiativeId: string }) =>
      api.delete(`/api/initiative-partners/${id}`).then(() => ({ initiativeId })),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['initiative-partners', data.initiativeId] });
      qc.invalidateQueries({ queryKey: ['initiatives'] });
    },
  });
};
