import { InfoPage, InfoSection } from '@/components/layout/info-page';

export const metadata = { title: 'FAQ | Shopwave' };

const FAQS = [
  {
    q: 'How do I track my order?',
    a: 'Go to Your Orders and select the order you want to track. You\'ll see live status updates and, once shipped, a courier tracking link.',
  },
  {
    q: 'Can I change my delivery address after placing an order?',
    a: 'You can update the address as long as the order hasn\'t shipped yet, from Your Orders → Order Details → Change Address. Once shipped, the address is locked for that delivery.',
  },
  {
    q: 'What is Shopwave Assured?',
    a: 'Products with the Assured badge are quality-checked and dispatched from our own fulfilment centres, so they typically arrive faster and come with an easier return process.',
  },
  {
    q: 'How do I apply a coupon code?',
    a: 'Add items to your cart, and enter the coupon code in the "Apply Coupon" field at checkout. Eligible discounts are applied instantly before payment.',
  },
  {
    q: 'Is Cash on Delivery available everywhere?',
    a: 'COD is available on most pincodes for orders under $5,000, and is shown as an option at checkout only where serviceable.',
  },
  {
    q: 'How do I become a seller on Shopwave?',
    a: 'Visit our seller sign-up page, share your GSTIN and bank details, list your first product, and you can start selling within 24–48 hours of verification.',
  },
  {
    q: 'I received a damaged or wrong item — what now?',
    a: 'Request a return from Your Orders within 48 hours of delivery and select "Damaged" or "Wrong item" as the reason. We\'ll arrange a free pickup and prioritise your refund or replacement.',
  },
  {
    q: 'How do I delete my Shopwave account?',
    a: 'Go to Account Settings → Privacy → Delete Account, or write to support@shopwave.example. Note that this permanently removes your order history and saved addresses.',
  },
];

export default function FaqPage() {
  return (
    <InfoPage title="Frequently Asked Questions" subtitle="Quick answers to the most common questions">
      {FAQS.map((item) => (
        <InfoSection key={item.q} heading={item.q}>
          <p>{item.a}</p>
        </InfoSection>
      ))}
    </InfoPage>
  );
}
