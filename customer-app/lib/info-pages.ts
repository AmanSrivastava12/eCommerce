import type { IconName } from '../components/ui';

// Content of the website's static footer pages (website/app/{about-us,faq,…}/page.tsx),
// as data so one screen (app/info/[slug].tsx) can render all of them.

export type InfoBlock =
  | { type: 'p'; text: string }
  | { type: 'ul' | 'ol'; items: string[] }
  | { type: 'jobs'; items: { title: string; team: string; location: string }[] };

export interface InfoPage {
  title: string;
  subtitle?: string;
  sections: { heading: string; blocks: InfoBlock[] }[];
}

const p = (text: string): InfoBlock => ({ type: 'p', text });
const ul = (...items: string[]): InfoBlock => ({ type: 'ul', items });
const ol = (...items: string[]): InfoBlock => ({ type: 'ol', items });

export const INFO_PAGES: Record<string, InfoPage> = {
  'contact-us': {
    title: 'Contact Us',
    subtitle: "We're here to help, seven days a week",
    sections: [
      {
        heading: 'Customer support',
        blocks: [
          p('For order issues, returns, refunds, or account questions, our support team typically responds within 24 hours.'),
          ul(
            'Email: support@shopwave.example',
            'Phone: 1800-123-4567 (toll-free, 8 AM – 11 PM, all days)',
            "Live chat: available from the Help icon once you're signed in",
          ),
        ],
      },
      {
        heading: 'Seller support',
        blocks: [
          p('Already selling on Shopwave, or want to start? Reach our seller success team.'),
          ul('Email: sellers@shopwave.example', 'Phone: 1800-987-6543 (10 AM – 7 PM, Mon–Sat)'),
        ],
      },
      {
        heading: 'Corporate office',
        blocks: [
          p('Shopwave Technologies Pvt. Ltd.\n4th Floor, Prestige Tech Park, Outer Ring Road,\nBengaluru, Karnataka 560103, India'),
        ],
      },
      { heading: 'Press & media', blocks: [p('For media inquiries and press kits, write to press@shopwave.example.')] },
    ],
  },
  'about-us': {
    title: 'About Shopwave',
    subtitle: "India's growing destination for online shopping",
    sections: [
      {
        heading: 'Who we are',
        blocks: [
          p(
            'Shopwave started in 2019 with a simple idea: buying things online should feel as easy as walking into your favourite neighbourhood store, but with far more choice. What began as a small electronics marketplace has grown into a full-fledged shopping destination spanning electronics, fashion, home & kitchen, books, and everyday essentials.',
          ),
          p('Today, Shopwave connects thousands of sellers with customers across the country, moving millions of packages a year through our own fulfilment network.'),
        ],
      },
      {
        heading: 'Our mission',
        blocks: [
          p(
            'We exist to make commerce easier for everyone — buyers looking for the best possible selection and price, and sellers looking for a reliable platform to grow their business. Every feature we build, from one-click checkout to next-day delivery, is in service of that mission.',
          ),
        ],
      },
      {
        heading: 'By the numbers',
        blocks: [
          ul(
            '10,000+ sellers onboarded across 28 states',
            '2 million+ products listed across 20+ categories',
            'Same-day and next-day delivery available in 500+ cities',
            '24x7 customer support in English and Hindi',
          ),
        ],
      },
      {
        heading: 'Our values',
        blocks: [
          p("Customer first — every decision starts with what's best for the person placing the order."),
          p('Seller success — we grow only when the businesses on our platform grow with us.'),
          p('Trust by default — genuine products, transparent pricing, and honest reviews, always.'),
        ],
      },
    ],
  },
  careers: {
    title: 'Careers at Shopwave',
    subtitle: 'Help us build the future of shopping in India',
    sections: [
      {
        heading: 'Why Shopwave',
        blocks: [
          p(
            "We're a small team solving big logistics, technology, and trust problems at scale. You'll ship things that millions of people use, work with people who care deeply about the details, and have real ownership over what you build.",
          ),
        ],
      },
      {
        heading: 'What we offer',
        blocks: [
          ul(
            'Competitive salary with performance-linked ESOPs',
            'Comprehensive health insurance for you and your family',
            'Flexible work-from-home policy and unlimited paid leave',
            'Annual learning stipend for courses, books, and conferences',
          ),
        ],
      },
      {
        heading: 'Open positions',
        blocks: [
          {
            type: 'jobs',
            items: [
              { title: 'Senior Backend Engineer (Node.js)', location: 'Bengaluru', team: 'Platform Engineering' },
              { title: 'React Native Developer', location: 'Bengaluru / Remote', team: 'Seller Experience' },
              { title: 'Product Manager, Checkout', location: 'Bengaluru', team: 'Growth' },
              { title: 'Warehouse Operations Lead', location: 'Pune', team: 'Supply Chain' },
              { title: 'Customer Support Associate', location: 'Hyderabad', team: 'Customer Experience' },
              { title: 'Data Analyst, Pricing', location: 'Remote', team: 'Analytics' },
            ],
          },
          p("Don't see a role that fits? Send your resume to careers@shopwave.example — we're always looking for great people."),
        ],
      },
    ],
  },
  stories: {
    title: 'Shopwave Stories',
    subtitle: 'Real stories from our sellers, delivery partners, and customers',
    sections: [
      {
        heading: 'From a garage to 50,000 orders a month',
        blocks: [
          p('How a Jaipur-based handicrafts seller used Shopwave Ads and same-day dispatch to turn a family workshop into one of our top-rated home decor stores.'),
        ],
      },
      {
        heading: "Delivering to India's remotest pin codes",
        blocks: [
          p('A look inside our last-mile network in the Northeast, where our delivery partners cross rivers and hills to get orders to customers on time.'),
        ],
      },
      {
        heading: 'The making of Big Shopping Days',
        blocks: [
          p('Behind the scenes with the engineering team that scales our checkout to handle ten times the normal traffic during our biggest sale of the year.'),
        ],
      },
      {
        heading: 'Women entrepreneurs on Shopwave',
        blocks: [
          p('Meet three women-led businesses — from a Coimbatore textile brand to a Lucknow skincare label — that grew online through our seller programs.'),
        ],
      },
    ],
  },
  payments: {
    title: 'Payment Options',
    subtitle: 'Safe, secure, and flexible ways to pay',
    sections: [
      {
        heading: 'Accepted payment methods',
        blocks: [
          ul(
            'Credit & debit cards (Visa, Mastercard, American Express, Discover)',
            'Shopwave Wallet — instant refunds credited here can be reused on any order',
            'Cash on Delivery (available on eligible orders under $5,000)',
            'EMI — No-cost EMI available on select cards for orders above $300',
          ),
        ],
      },
      {
        heading: 'Is it safe to save my card?',
        blocks: [
          p(
            'Yes. Shopwave never stores your full card number on our servers. Card details are tokenised and processed through PCI-DSS compliant payment partners, so your data stays encrypted at every step of the transaction.',
          ),
        ],
      },
      {
        heading: 'Payment failed but amount deducted?',
        blocks: [
          p(
            "If an amount is debited from your account but the order doesn't show as confirmed, don't worry — failed transactions are automatically reversed to your original payment method within 5–7 business days. You can track this from Orders → Payment Status.",
          ),
        ],
      },
      {
        heading: 'Gift cards & Shopwave Wallet',
        blocks: [
          p(
            'Gift cards can be redeemed at checkout and combined with one other payment method. Wallet balance from refunds or cashback is applied automatically before any other payment method is charged.',
          ),
        ],
      },
    ],
  },
  shipping: {
    title: 'Shipping Information',
    subtitle: 'How we get your order to your door',
    sections: [
      {
        heading: 'Delivery timelines',
        blocks: [
          p(
            'Delivery estimates are shown on every product page and again at checkout, based on your pincode and the seller\'s dispatch location. Most orders arrive within 2–7 business days; items marked "Assured" on eligible pincodes can arrive as fast as next-day.',
          ),
        ],
      },
      {
        heading: 'Shipping charges',
        blocks: [
          ul(
            'Free delivery on orders above $50',
            'A flat $4.99 delivery fee applies to orders below $50',
            'Shopwave Plus members get free delivery on every order, with no minimum',
          ),
        ],
      },
      {
        heading: 'Order tracking',
        blocks: [
          p(
            "Once your order is shipped, you'll receive a tracking link by email and SMS. You can also track any order in real time from Your Orders → Track Package, which shows live status updates from dispatch to out-for-delivery.",
          ),
        ],
      },
      {
        heading: 'Serviceable areas',
        blocks: [
          p(
            'We currently deliver to over 19,000 pincodes across India. Some large or fragile items (furniture, large appliances) may have a smaller serviceable area — this is always shown on the product page before you order.',
          ),
        ],
      },
      {
        heading: 'Delayed or missing packages',
        blocks: [
          p(
            "If your package hasn't arrived by the estimated date, please wait 48 hours past the estimate (couriers occasionally run late) before reaching out to support — after that we'll investigate immediately and either expedite delivery or issue a full refund.",
          ),
        ],
      },
    ],
  },
  'cancellation-returns': {
    title: 'Cancellation & Returns',
    subtitle: 'Change of mind? We make it easy',
    sections: [
      {
        heading: 'Cancelling an order',
        blocks: [
          p(
            "You can cancel any order for free as long as it hasn't been shipped yet — just go to Your Orders and select Cancel Order. Once an item ships, cancellation is no longer possible, but you can still request a return after it's delivered.",
          ),
        ],
      },
      {
        heading: 'Return window',
        blocks: [
          p(
            'Most items can be returned within 7–15 days of delivery, depending on the category (shown on the product page under "Returns"). Perishables, innerwear, and made-to-order products are generally not eligible for return unless damaged or defective on arrival.',
          ),
        ],
      },
      {
        heading: 'How returns work',
        blocks: [
          ol(
            'Go to Your Orders and select "Request return" on the item.',
            "Tell us the reason — wrong item, damaged, doesn't fit, or changed your mind.",
            'A pickup is scheduled at your address within 2–4 days, or a self-ship label is issued.',
            'Once the item passes a quality check, your refund is initiated.',
          ),
        ],
      },
      {
        heading: 'Refund timelines',
        blocks: [
          ul(
            'Shopwave Wallet: instant, as soon as the return is approved',
            'Credit / debit card: 5–7 business days',
            'Cash on Delivery orders: refunded to your bank account after verification',
          ),
        ],
      },
      {
        heading: 'Exchanges',
        blocks: [
          p(
            'For sizing or colour issues on fashion items, an exchange is often faster than a return — select "Exchange" instead of "Return" where available, and we\'ll ship the replacement as soon as the original is picked up.',
          ),
        ],
      },
    ],
  },
  faq: {
    title: 'Frequently Asked Questions',
    subtitle: 'Quick answers to the most common questions',
    sections: [
      {
        heading: 'How do I track my order?',
        blocks: [p("Go to Your Orders and select the order you want to track. You'll see live status updates and, once shipped, a courier tracking link.")],
      },
      {
        heading: 'Can I change my delivery address after placing an order?',
        blocks: [
          p(
            "You can update the address as long as the order hasn't shipped yet, from Your Orders → Order Details → Change Address. Once shipped, the address is locked for that delivery.",
          ),
        ],
      },
      {
        heading: 'What is Shopwave Assured?',
        blocks: [
          p(
            'Products with the Assured badge are quality-checked and dispatched from our own fulfilment centres, so they typically arrive faster and come with an easier return process.',
          ),
        ],
      },
      {
        heading: 'How do I apply a coupon code?',
        blocks: [p('Add items to your cart, and enter the coupon code in the "Apply Coupon" field at checkout. Eligible discounts are applied instantly before payment.')],
      },
      {
        heading: 'Is Cash on Delivery available everywhere?',
        blocks: [p('COD is available on most pincodes for orders under $5,000, and is shown as an option at checkout only where serviceable.')],
      },
      {
        heading: 'How do I become a seller on Shopwave?',
        blocks: [
          p('Visit our seller sign-up page, share your GSTIN and bank details, list your first product, and you can start selling within 24–48 hours of verification.'),
        ],
      },
      {
        heading: 'I received a damaged or wrong item — what now?',
        blocks: [
          p(
            'Request a return from Your Orders within 48 hours of delivery and select "Damaged" or "Wrong item" as the reason. We\'ll arrange a free pickup and prioritise your refund or replacement.',
          ),
        ],
      },
      {
        heading: 'How do I delete my Shopwave account?',
        blocks: [
          p(
            'Go to Account Settings → Privacy → Delete Account, or write to support@shopwave.example. Note that this permanently removes your order history and saved addresses.',
          ),
        ],
      },
    ],
  },
  'return-policy': {
    title: 'Return Policy',
    subtitle: 'Effective from 1 January 2026',
    sections: [
      {
        heading: 'Overview',
        blocks: [
          p(
            'Shopwave wants you to be completely satisfied with your purchase. This policy explains when and how you can return an item, and it applies in addition to any category-specific return window shown on a product page.',
          ),
        ],
      },
      {
        heading: 'Eligibility',
        blocks: [
          ul(
            'Item must be unused, unwashed, and in its original packaging with tags intact',
            'All original accessories, freebies, and invoices must be included',
            'Return must be initiated within the window shown on the product page (typically 7–15 days)',
          ),
        ],
      },
      {
        heading: 'Non-returnable categories',
        blocks: [
          p(
            'For hygiene and safety reasons, the following are not eligible for return unless received damaged or defective: innerwear and lingerie, personal care and cosmetics, perishable goods, made-to-order or personalised items, and digital gift cards.',
          ),
        ],
      },
      {
        heading: 'Quality check',
        blocks: [
          p(
            'Returned items go through a quality check at our fulfilment centre before a refund is released. If an item fails this check (e.g. signs of use, missing parts), it will be shipped back to you and the return will not be processed.',
          ),
        ],
      },
      {
        heading: 'Seller-fulfilled items',
        blocks: [
          p(
            "For items sold and shipped directly by a third-party seller, return eligibility and pickup arrangements are coordinated between you and the seller, with Shopwave stepping in to mediate if a resolution isn't reached within 5 business days.",
          ),
        ],
      },
    ],
  },
  terms: {
    title: 'Terms of Use',
    subtitle: 'Last updated 1 January 2026',
    sections: [
      {
        heading: 'Acceptance of terms',
        blocks: [
          p(
            'By creating an account or placing an order on Shopwave, you agree to these Terms of Use, our Privacy Policy, and our Return Policy. If you do not agree, please do not use the platform.',
          ),
        ],
      },
      {
        heading: 'Account responsibilities',
        blocks: [
          p(
            'You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. Notify us immediately at support@shopwave.example if you suspect unauthorised access.',
          ),
        ],
      },
      {
        heading: 'Orders and pricing',
        blocks: [
          p(
            'All prices are listed in US Dollars (USD) and are inclusive of applicable taxes unless stated otherwise. We reserve the right to cancel any order in cases of pricing errors, suspected fraud, or unavailability of stock, in which case a full refund will be issued.',
          ),
        ],
      },
      {
        heading: 'Marketplace model',
        blocks: [
          p(
            'Shopwave operates as a marketplace connecting buyers with independent sellers. Product listings, descriptions, and fulfilment for seller-listed items are the responsibility of the respective seller; Shopwave facilitates the transaction and provides buyer protection as described in our Return Policy.',
          ),
        ],
      },
      {
        heading: 'Prohibited use',
        blocks: [
          p(
            'You agree not to misuse the platform — including submitting false reviews, attempting to circumvent security measures, reselling purchased goods in violation of seller terms, or using automated tools to scrape or place bulk orders without authorisation.',
          ),
        ],
      },
      {
        heading: 'Limitation of liability',
        blocks: [
          p(
            'Shopwave is not liable for indirect or consequential damages arising from use of the platform, to the maximum extent permitted by applicable law. Nothing in these terms limits liability that cannot be excluded under Indian consumer protection law.',
          ),
        ],
      },
      {
        heading: 'Changes to these terms',
        blocks: [
          p('We may update these Terms of Use from time to time. Continued use of Shopwave after changes are posted constitutes acceptance of the revised terms.'),
        ],
      },
    ],
  },
  security: {
    title: 'Security at Shopwave',
    subtitle: 'How we keep your account and payments safe',
    sections: [
      {
        heading: 'Data encryption',
        blocks: [
          p(
            'All traffic to and from Shopwave is encrypted in transit using TLS 1.2+. Sensitive data, including payment tokens, is encrypted at rest using industry-standard AES-256 encryption.',
          ),
        ],
      },
      {
        heading: 'Payment security',
        blocks: [
          p(
            'We never store your full card number or CVV on our servers. All card transactions are processed through PCI-DSS Level 1 certified payment partners, and every card payment is protected by bank-level OTP verification.',
          ),
        ],
      },
      {
        heading: 'Account protection',
        blocks: [
          ul(
            'Two-factor authentication available via SMS or authenticator app',
            'Login alerts sent by email for sign-ins from a new device',
            'Automatic session expiry after periods of inactivity',
            'One-tap option to log out of all devices from Account Settings',
          ),
        ],
      },
      {
        heading: 'Spotting fraud',
        blocks: [
          p(
            'Shopwave will never call or message you asking for your OTP, password, or full card number. If you receive such a request claiming to be from Shopwave, please do not share any details and report it to security@shopwave.example immediately.',
          ),
        ],
      },
      {
        heading: 'Responsible disclosure',
        blocks: [
          p(
            'Found a security vulnerability? We welcome reports from independent researchers. Please email details to security@shopwave.example — we investigate every report and acknowledge valid findings within 5 business days.',
          ),
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    subtitle: 'Last updated 1 January 2026',
    sections: [
      {
        heading: 'What we collect',
        blocks: [
          ul(
            'Account details you provide — name, email, phone number, delivery addresses',
            'Order and browsing history, to personalise recommendations',
            'Payment metadata (never full card numbers), via our payment partners',
            'Device and usage data such as IP address and app version, for security and analytics',
          ),
        ],
      },
      {
        heading: 'How we use your data',
        blocks: [
          p(
            "We use your data to process orders, provide customer support, personalise your shopping experience, prevent fraud, and — where you've opted in — send you offers and updates. We do not sell your personal data to third parties.",
          ),
        ],
      },
      {
        heading: 'Sharing with sellers and partners',
        blocks: [
          p(
            'When you place an order, we share the minimum information needed to fulfil it — your name, delivery address, and phone number — with the relevant seller and logistics partner. Sellers are contractually required to use this data solely for order fulfilment.',
          ),
        ],
      },
      {
        heading: 'Cookies',
        blocks: [
          p(
            'We use cookies and similar technologies to keep you signed in, remember your cart, and understand how the site is used so we can improve it. You can control cookie preferences through your browser settings.',
          ),
        ],
      },
      {
        heading: 'Your rights',
        blocks: [
          p(
            'You can access, correct, or delete your personal data at any time from Account Settings, or by writing to privacy@shopwave.example. You may also opt out of marketing communications from the Notifications tab in your account.',
          ),
        ],
      },
      {
        heading: 'Data retention',
        blocks: [
          p(
            'We retain order and transaction records for as long as required by applicable tax and consumer protection law, and delete account data within 90 days of a verified deletion request, except where retention is legally required.',
          ),
        ],
      },
    ],
  },
};

/** Grouped the same way as the website footer's columns. */
export const INFO_GROUPS: { title: string; links: { slug: string; icon: IconName; label: string }[] }[] = [
  {
    title: 'About',
    links: [
      { slug: 'contact-us', icon: 'call-outline', label: 'Contact Us' },
      { slug: 'about-us', icon: 'information-circle-outline', label: 'About Us' },
      { slug: 'careers', icon: 'briefcase-outline', label: 'Careers' },
      { slug: 'stories', icon: 'book-outline', label: 'Shopwave Stories' },
    ],
  },
  {
    title: 'Help',
    links: [
      { slug: 'payments', icon: 'card-outline', label: 'Payments' },
      { slug: 'shipping', icon: 'car-outline', label: 'Shipping' },
      { slug: 'cancellation-returns', icon: 'return-down-back-outline', label: 'Cancellation & Returns' },
      { slug: 'faq', icon: 'help-circle-outline', label: 'FAQ' },
    ],
  },
  {
    title: 'Policy',
    links: [
      { slug: 'return-policy', icon: 'refresh-outline', label: 'Return Policy' },
      { slug: 'terms', icon: 'reader-outline', label: 'Terms Of Use' },
      { slug: 'security', icon: 'shield-checkmark-outline', label: 'Security' },
      { slug: 'privacy', icon: 'lock-closed-outline', label: 'Privacy' },
    ],
  },
];
