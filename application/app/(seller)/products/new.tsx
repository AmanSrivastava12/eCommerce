import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sellerProductsApi } from '../../../lib/api-client/resources';
import { errorMessage } from '../../../lib/api-client/client';
import { EMPTY_PRODUCT_FORM, ProductForm, formValuesToPayload, type ProductFormValues } from '../../../components/product-form';
import { toast } from '../../../components/feedback';

export default function NewProductScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (v: ProductFormValues) =>
      sellerProductsApi.create(formValuesToPayload(v)),
    onSuccess: () => {
      toast.success('Product created');
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      router.back();
    },
    onError: (e) => toast.error(errorMessage(e, 'Could not create product')),
  });

  return (
    <ProductForm
      mode="create"
      initialValues={EMPTY_PRODUCT_FORM}
      submitLabel="Create product"
      submitting={create.isPending}
      onSubmit={(v) => create.mutate(v)}
    />
  );
}
