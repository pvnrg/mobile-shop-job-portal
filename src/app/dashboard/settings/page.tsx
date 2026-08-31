import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { users, whatsappMessages, customers } from "@/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BusinessSettingsForm } from "@/components/settings/business-settings-form";
import { StaffManager } from "@/components/settings/staff-manager";
import { LogoUploadForm } from "@/components/settings/logo-upload-form";
import { ThemeSettingsForm } from "@/components/settings/theme-settings-form";
import { WhatsappConnectionForm } from "@/components/settings/whatsapp-connection-form";
import { WhatsappTemplatesList } from "@/components/settings/whatsapp-templates-list";
import { WhatsappTestMessage } from "@/components/settings/whatsapp-test-message";
import { WhatsappMessageLog } from "@/components/settings/whatsapp-message-log";
import { WhatsappTokenStatus } from "@/components/settings/whatsapp-token-status";
import { ensureWhatsappTemplateRows } from "@/lib/whatsapp/notify";
import { ensureWhatsappTokenChecked } from "@/lib/whatsapp/token-status";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const session = await auth();
  if (session?.user?.role !== "admin") {
    redirect("/dashboard");
  }

  await ensureWhatsappTemplateRows();
  await ensureWhatsappTokenChecked();

  const [settings, staff, whatsappSettings, whatsappTemplates, recentMessages] =
    await Promise.all([
      db.query.businessSettings.findFirst(),
      db.select().from(users).orderBy(asc(users.name)),
      db.query.whatsappSettings.findFirst(),
      db.query.whatsappTemplates.findMany(),
      db
        .select({ message: whatsappMessages, customerName: customers.name })
        .from(whatsappMessages)
        .leftJoin(customers, eq(whatsappMessages.customerId, customers.id))
        .orderBy(desc(whatsappMessages.sentAt))
        .limit(30),
    ]);

  const messageRows = recentMessages.map((r) => ({ ...r.message, customerName: r.customerName }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage business/GST details, staff accounts, and WhatsApp notifications
        </p>
      </div>

      <Tabs defaultValue={tab === "whatsapp" ? "whatsapp" : "application"}>
        <TabsList>
          <TabsTrigger value="application">Application</TabsTrigger>
          <TabsTrigger value="business">Business & GST</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
        </TabsList>
        <TabsContent value="application" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Logo</CardTitle>
              <CardDescription>
                Shown in the sidebar, login page, and on generated invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LogoUploadForm logoPath={settings?.logoPath} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Theme</CardTitle>
              <CardDescription>Choose how the portal looks on this device</CardDescription>
            </CardHeader>
            <CardContent>
              <ThemeSettingsForm />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Business & GST Details</CardTitle>
              <CardDescription>
                Used on generated GST invoices and for job/invoice numbering
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BusinessSettingsForm settings={settings} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="staff">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Staff Accounts</CardTitle>
              <CardDescription>Control who can access the portal</CardDescription>
            </CardHeader>
            <CardContent>
              <StaffManager staff={staff} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="whatsapp" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">WhatsApp Connection</CardTitle>
              <CardDescription>
                Connect your Meta WhatsApp Business Cloud API account. Requires an approved
                WhatsApp Business account, an access token, and a phone number ID from{" "}
                <span className="font-medium">developers.facebook.com</span>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <WhatsappTokenStatus settings={whatsappSettings} />
              <WhatsappConnectionForm
                key={whatsappSettings?.updatedAt?.toISOString() ?? "new"}
                settings={whatsappSettings}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Message Templates</CardTitle>
              <CardDescription>
                WhatsApp only allows business-initiated messages using pre-approved templates.
                Create matching templates in Meta Business Manager, then enter their exact name
                here for each event. Each template must accept the parameters listed below, in
                order.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WhatsappTemplatesList templates={whatsappTemplates} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Send Test Message</CardTitle>
              <CardDescription>
                Sends a sample &quot;Job Received&quot; notification to verify your setup.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WhatsappTestMessage />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Notifications</CardTitle>
              <CardDescription>Last 30 WhatsApp notifications triggered by the portal</CardDescription>
            </CardHeader>
            <CardContent>
              <WhatsappMessageLog messages={messageRows} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
