import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Initiative {
  id: string;
  name: string;
  description: string | null;
  overview: string | null;
  category: string | null;
  status: string | null;
  logo_url: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  initiative_partners?: Array<{ id: string; partner?: { id: string; name: string; logo_url: string | null } }>;
}
export type InitiativeInsert = Omit<Initiative, 'id' | 'created_at' | 'updated_at' | 'initiative_partners'>;
export type InitiativeUpdate = Partial<InitiativeInsert>;

export const useInitiatives = (filters?: { status?: string; search?: string; parentId?: string | null }) => {
  return useQuery({
    queryKey: ['initiatives', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status)                  params.set('status',   filters.status);
      if (filters?.search)                  params.set('search',   filters.search);
      if (filters?.parentId !== undefined)  params.set('parentId', filters.parentId === null ? 'null' : filters.parentId);
      return api.get(`/api/initiatives?${params}`);
    },
  });
};

export const useParentInitiatives = () =>
  useQuery({
    queryKey: ['initiatives', 'parents'],
    queryFn: () => api.get('/api/initiatives/parents'),
  });

export const useInitiative = (id: string) =>
  useQuery({
    queryKey: ['initiative', id],
    queryFn:  () => api.get(`/api/initiatives/${id}`),
    enabled:  !!id,
  });

export const useSubInitiatives = (parentId: string) =>
  useQuery({
    queryKey: ['initiatives', 'sub', parentId],
    queryFn:  () => {
      const params = new URLSearchParams({ parentId });
      return api.get(`/api/initiatives?${params}`);
    },
    enabled: !!parentId,
  });

export const useCreateInitiative = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (initiative: InitiativeInsert) => api.post('/api/initiatives', initiative),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['initiatives'] }),
  });
};

export const useUpdateInitiative = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: InitiativeUpdate & { id: string }) => api.patch(`/api/initiatives/${id}`, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['initiatives'] });
      qc.invalidateQueries({ queryKey: ['initiative', variables.id] });
    },
  });
};

export const useDeleteInitiative = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/initiatives/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['initiatives'] }),
  });
};
