import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { siteServices, siteGalleryItems } from "@/db/schema";
import { asc, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HeroSettingsForm } from "@/components/site/hero-settings-form";
import { SiteServicesManager } from "@/components/site/site-services-manager";
import { SiteGalleryManager } from "@/components/site/site-gallery-manager";

export default async function SiteManagementPage() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    redirect("/dashboard");
  }

  const [settings, services, galleryItems] = await Promise.all([
    db.query.siteSettings.findFirst(),
    db.select().from(siteServices).orderBy(asc(siteServices.displayOrder), asc(siteServices.id)),
    db.select().from(siteGalleryItems).orderBy(desc(siteGalleryItems.createdAt)),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Site Management</h1>
        <p className="text-sm text-muted-foreground">
          Manage the content shown on your public website
        </p>
      </div>

      <Tabs defaultValue="hero">
        <TabsList>
          <TabsTrigger value="hero">Hero Banner</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="gallery">Gallery</TabsTrigger>
        </TabsList>
        <TabsContent value="hero">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hero Banner</CardTitle>
              <CardDescription>
                The large banner at the top of your public site
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HeroSettingsForm settings={settings} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="services">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Services Grid</CardTitle>
              <CardDescription>
                The repair services shown as cards on your public site
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SiteServicesManager services={services} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="gallery">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Work Gallery</CardTitle>
              <CardDescription>
                Photos and videos of completed repairs, shown in a grid on your public site
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SiteGalleryManager items={galleryItems} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
