import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface PartnerFeature {
  id: string;
  initiative_partner_id: string;
  feature_name: string;
  is_available: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const usePartnerFeatures = (initiativePartnerId?: string) =>
  useQuery({
    queryKey: ['partner_features', initiativePartnerId],
    queryFn:  () => api.get(`/api/partner-features?initiativePartnerId=${initiativePartnerId}`),
    enabled:  !!initiativePartnerId,
  });

export const useUpsertPartnerFeatures = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      initiativePartnerId,
      features,
    }: {
      initiativePartnerId: string;
      features: { feature_name: string; is_available: boolean; notes?: string }[];
    }) => api.post('/api/partner-features/upsert', { initiativePartnerId, features }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['partner_features', variables.initiativePartnerId] });
    },
  });
};
