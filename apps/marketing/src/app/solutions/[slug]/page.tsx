import { PageHero } from '@/components/PageHero';

export function generateStaticParams() {
  return [
    { slug: 'banking' },
    { slug: 'nbfc' },
    { slug: 'retail' },
    { slug: 'manufacturing' },
    { slug: 'healthcare' },
    { slug: 'education' },
    { slug: 'logistics' },
    { slug: 'government' },
  ];
}

export default function Page({ params }: { params: { slug: string } }) {
  return (
    <PageHero eyebrow="Industries" title={`Industry: ${params.slug}`}>
      Full industry storytelling lands in a follow-on marketing PR on the commercial-launch-prep track.
    </PageHero>
  );
}
