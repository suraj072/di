import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
  website: string | null;
  partner_type: string | null;
  status: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  support_email: string | null;
  support_phone: string | null;
  support_hours: string | null;
  created_at: string;
  updated_at: string;
}
export type PartnerInsert = Omit<Partner, 'id' | 'created_at' | 'updated_at'>;
export type PartnerUpdate = Partial<PartnerInsert>;

export const usePartners = (filters?: { status?: string; search?: string }) =>
  useQuery({
    queryKey: ['partners', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.search) params.set('search', filters.search);
      return api.get(`/api/partners?${params}`);
    },
  });

export const usePartner = (id: string) =>
  useQuery({
    queryKey: ['partner', id],
    queryFn:  () => api.get(`/api/partners/${id}`),
    enabled:  !!id,
  });

export const useCreatePartner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (partner: PartnerInsert) => api.post('/api/partners', partner),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['partners'] }),
  });
};

export const useUpdatePartner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...partner }: PartnerUpdate & { id: string }) => api.patch(`/api/partners/${id}`, partner),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['partners'] });
      qc.invalidateQueries({ queryKey: ['partner', variables.id] });
    },
  });
};

export const useDeletePartner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/partners/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['partners'] }),
  });
};
