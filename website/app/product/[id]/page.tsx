import { ProductDetailClient } from './product-detail-client';

export default async function ProductDetailPage(props: PageProps<'/product/[id]'>) {
  const { id } = await props.params;
  return <ProductDetailClient id={id} />;
}
