import { WhatsappTemplateRow } from "@/components/settings/whatsapp-template-row";
import { notificationEvents, notificationEventMeta } from "@/lib/whatsapp/events";
import type { WhatsappTemplate } from "@/db/types";

export function WhatsappTemplatesList({ templates }: { templates: WhatsappTemplate[] }) {
  const templateByEvent = new Map(templates.map((t) => [t.event, t]));

  return (
    <div className="space-y-3">
      {notificationEvents.map((event) => {
        const meta = notificationEventMeta[event];
        return (
          <WhatsappTemplateRow
            key={event}
            event={event}
            label={meta.label}
            description={meta.description}
            params={meta.params}
            template={templateByEvent.get(event)}
          />
        );
      })}
    </div>
  );
}
