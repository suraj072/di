import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export const useSyncInitiativePartnerProducts = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      initiativePartnerId,
      productIds,
    }: {
      initiativePartnerId: string;
      productIds: string[];
    }) => api.post('/api/initiative-partner-products/sync', { initiativePartnerId, productIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['initiatives'] });
      qc.invalidateQueries({ queryKey: ['initiative-partners'] });
      qc.invalidateQueries({ queryKey: ['initiative'] });
      qc.invalidateQueries({ queryKey: ['initiative-partner'] });
    },
  });
};
