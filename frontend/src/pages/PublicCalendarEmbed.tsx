import { CalendarEmbedView } from "@/components/embed/CalendarEmbedView";

export default function PublicCalendarEmbed() {
  return (
    <CalendarEmbedView
      itemsPerPage={6}
      showPager
      layout="grid"
      noEventsLabel="Er zijn op dit moment geen agenda-items."
    />
  );
}
