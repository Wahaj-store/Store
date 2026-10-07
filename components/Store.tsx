import StoreSectionRenderer from "./store/StoreSectionRenderer";

export default function Store({ data }: { data: any }) {
  const now = Date.now();

  const sections = (Array.isArray(data?.sections) ? data.sections : [])
    .filter(
      (section: any) =>
        section.visible !== false &&
        section.isVisible !== false &&
        (!section.startsAt || new Date(section.startsAt).getTime() <= now) &&
        (!section.endsAt || new Date(section.endsAt).getTime() >= now),
    )
    .sort(
      (a: any, b: any) =>
        Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0),
    );

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
