import { OrderDetailClient } from './order-detail-client';

export default async function OrderDetailPage(props: PageProps<'/orders/[id]'>) {
  const { id } = await props.params;
  return <OrderDetailClient id={id} />;
}
