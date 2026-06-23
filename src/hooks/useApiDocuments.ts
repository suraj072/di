import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { getToken } from '@/lib/api';

export interface ApiDocument {
  id: string;
  initiative_partner_id: string;
  title: string;
  file_path: string;
  file_name: string;
  created_at: string;
  updated_at: string;
}

export const useApiDocuments = (initiativePartnerId?: string) =>
  useQuery({
    queryKey: ['api_documents', initiativePartnerId],
    queryFn:  () => api.get(`/api/api-documents?initiativePartnerId=${initiativePartnerId}`),
    enabled:  !!initiativePartnerId,
  });

export const useUploadApiDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      initiative_partner_id,
      title,
      file,
    }: {
      initiative_partner_id: string;
      title: string;
      file: File;
    }) => {
      const form = new FormData();
      form.append('initiative_partner_id', initiative_partner_id);
      form.append('title', title);
      form.append('file', file);
      return api.upload('/api/api-documents', form);
    },
    onSuccess: (data: ApiDocument) => {
      qc.invalidateQueries({ queryKey: ['api_documents', data.initiative_partner_id] });
    },
  });
};

export const useDeleteApiDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, initiativePartnerId }: { id: string; filePath?: string; initiativePartnerId: string }) => {
      await api.delete(`/api/api-documents/${id}`);
      return initiativePartnerId;
    },
    onSuccess: (initiativePartnerId) => {
      qc.invalidateQueries({ queryKey: ['api_documents', initiativePartnerId] });
    },
  });
};

// Fetches the document as a blob and returns an object URL (auth-safe download)
export const getSignedApiDocUrl = async (docId: string): Promise<string | null> => {
  try {
    const token = getToken();
    const res = await fetch(`/api/api-documents/${docId}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
};
