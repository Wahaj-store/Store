import StoreSectionRenderer from "./store/StoreSectionRenderer";

export default function Store({ data }: { data: any }) {
  const now = Date.now();
  const sections = (Array.isArray(data?.sections) ? data.sections : [])
    .filter(
      (x: any) =>
        x.visible !== false &&
        x.isVisible !== false &&
        (!x.startsAt || new Date(x.startsAt).getTime() <= now) &&
        (!x.endsAt || new Date(x.endsAt).getTime() >= now),
    )
    .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const categories = Array.isArray(data?.categories) ? data.categories : [];
  const offers = Array.isArray(data?.offers) ? data.offers : [];

  return (
    <StoreSectionRenderer
      data={data}
      sections={sections}
      categories={categories}
      offers={offers}
      settings={data?.settings || {}}
    />
  );
}
