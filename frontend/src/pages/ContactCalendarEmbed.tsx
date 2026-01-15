import { CalendarEmbedView } from "@/components/embed/CalendarEmbedView";

export default function ContactCalendarEmbed() {
  return (
    <CalendarEmbedView
      itemsPerPage={3}
      layout="stack"
      noEventsLabel="Er staan op dit moment geen activiteiten gepland."
    />
  );
}
