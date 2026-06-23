import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}
export type ProductInsert = Omit<Product, 'id' | 'created_at' | 'updated_at'>;
export type ProductUpdate = Partial<ProductInsert>;

export const useProducts = (showInactive = false) =>
  useQuery({
    queryKey: ['products', showInactive],
    queryFn:  () => api.get(`/api/products${showInactive ? '?showInactive=true' : ''}`),
  });

export const useProduct = (id: string) =>
  useQuery({
    queryKey: ['product', id],
    queryFn:  () => api.get(`/api/products/${id}`),
    enabled:  !!id,
  });

export const useCreateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (product: ProductInsert) => api.post('/api/products', product),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
};

export const useUpdateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...product }: ProductUpdate & { id: string }) => api.patch(`/api/products/${id}`, product),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['product', variables.id] });
    },
  });
};

export const useDeleteProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
};
