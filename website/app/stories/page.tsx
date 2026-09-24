import { InfoPage, InfoSection } from '@/components/layout/info-page';

export const metadata = { title: 'Shopwave Stories' };

const STORIES = [
  {
    title: 'From a garage to 50,000 orders a month',
    excerpt:
      'How a Jaipur-based handicrafts seller used Shopwave Ads and same-day dispatch to turn a family workshop into one of our top-rated home decor stores.',
  },
  {
    title: 'Delivering to India\'s remotest pin codes',
    excerpt:
      'A look inside our last-mile network in the Northeast, where our delivery partners cross rivers and hills to get orders to customers on time.',
  },
  {
    title: 'The making of Big Shopping Days',
    excerpt:
      'Behind the scenes with the engineering team that scales our checkout to handle ten times the normal traffic during our biggest sale of the year.',
  },
  {
    title: 'Women entrepreneurs on Shopwave',
    excerpt:
      'Meet three women-led businesses — from a Coimbatore textile brand to a Lucknow skincare label — that grew online through our seller programs.',
  },
];

export default function StoriesPage() {
  return (
    <InfoPage title="Shopwave Stories" subtitle="Real stories from our sellers, delivery partners, and customers">
      {STORIES.map((story) => (
        <InfoSection key={story.title} heading={story.title}>
          <p>{story.excerpt}</p>
        </InfoSection>
      ))}
    </InfoPage>
  );
}
