import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { notificationEventMeta, type NotificationEvent } from "@/lib/whatsapp/events";
import type { WhatsappMessage } from "@/db/types";

const statusStyles: Record<WhatsappMessage["status"], string> = {
  sent: "bg-emerald-100 text-emerald-700 border-emerald-200",
  failed: "bg-red-100 text-red-700 border-red-200",
  not_configured: "bg-slate-100 text-slate-600 border-slate-200",
};

const statusLabels: Record<WhatsappMessage["status"], string> = {
  sent: "Sent",
  failed: "Failed",
  not_configured: "Not Configured",
};

export function WhatsappMessageLog({
  messages,
}: {
  messages: (WhatsappMessage & { customerName: string | null })[];
}) {
  if (messages.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No WhatsApp messages have been triggered yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Event</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Detail</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {messages.map((m) => (
            <TableRow key={m.id}>
              <TableCell className="text-muted-foreground">{formatDateTime(m.sentAt)}</TableCell>
              <TableCell>{m.customerName ?? "—"}</TableCell>
              <TableCell>{notificationEventMeta[m.event as NotificationEvent]?.label ?? m.event}</TableCell>
              <TableCell>
                <Badge variant="outline" className={statusStyles[m.status]}>
                  {statusLabels[m.status]}
                </Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell max-w-64 truncate text-muted-foreground">
                {m.errorMessage || m.providerMessageId || "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
