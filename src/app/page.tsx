import Link from "next/link";
import { db } from "@/db";
import { siteServices, siteGalleryItems } from "@/db/schema";
import { eq, asc, desc, and } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Phone, MapPin, Mail, Wrench, ArrowRight } from "lucide-react";
import { getLogoUrl } from "@/lib/logo";
import { getSiteMediaUrl } from "@/lib/site-media";

export default async function PublicHomePage() {
  const [business, siteSettings, services, galleryItems] = await Promise.all([
    db.query.businessSettings.findFirst(),
    db.query.siteSettings.findFirst(),
    db
      .select()
      .from(siteServices)
      .where(eq(siteServices.active, 1))
      .orderBy(asc(siteServices.displayOrder), asc(siteServices.id)),
    db
      .select()
      .from(siteGalleryItems)
      .where(and(eq(siteGalleryItems.active, 1)))
      .orderBy(desc(siteGalleryItems.createdAt))
      .limit(12),
  ]);

  const businessName = business?.businessName ?? "MobileFix Portal";
  const logoUrl = getLogoUrl(business?.logoPath);
  const heroMediaUrl = getSiteMediaUrl(siteSettings?.heroMediaPath);
  const heroHeadline = siteSettings?.heroHeadline ?? "Expert Mobile Repairs You Can Trust";
  const heroSubheading =
    siteSettings?.heroSubheading ??
    "Fast, affordable, and reliable repairs for all major phone brands.";
  const ctaText = siteSettings?.heroCtaText || (business?.phone ? "Call Us Now" : "Get In Touch");
  const ctaLink = siteSettings?.heroCtaLink || (business?.phone ? `tel:${business.phone}` : "#contact");

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={businessName} className="h-9 w-9 rounded-lg object-contain" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Wrench className="h-4 w-4" />
              </div>
            )}
            <span className="font-semibold">{businessName}</span>
          </div>
          {business?.phone && (
            <Button asChild size="sm" variant="outline">
              <a href={`tel:${business.phone}`}>
                <Phone className="h-4 w-4" /> {business.phone}
              </a>
            </Button>
          )}
        </div>
      </header>

      <section className="relative flex min-h-[70vh] items-center overflow-hidden bg-slate-900">
        {heroMediaUrl &&
          (siteSettings?.heroMediaType === "video" ? (
            <video
              src={heroMediaUrl}
              className="absolute inset-0 h-full w-full object-cover opacity-60"
              autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroMediaUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-60"
            />
          ))}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-900/40" />
        <div className="relative mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {heroHeadline}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-200">{heroSubheading}</p>
          <div className="mt-8">
            <Button asChild size="lg">
              <a href={ctaLink}>
                {ctaText} <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {services.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            Our Services
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-muted-foreground">
            Whatever the problem, we&apos;ve got the fix.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => {
              const imageUrl = getSiteMediaUrl(service.imagePath);
              return (
                <div
                  key={service.id}
                  className="overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex aspect-video items-center justify-center overflow-hidden bg-muted/40">
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageUrl}
                        alt={service.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Wrench className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold">{service.title}</h3>
                    {service.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{service.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {galleryItems.length > 0 && (
        <section className="bg-muted/30 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
              Our Work
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-muted-foreground">
              A look at repairs we&apos;ve completed for happy customers.
            </p>
            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {galleryItems.map((item) => {
                const mediaUrl = getSiteMediaUrl(item.mediaPath);
                return (
                  <div
                    key={item.id}
                    className="group relative aspect-square overflow-hidden rounded-lg border bg-muted/40"
                  >
                    {item.mediaType === "video" ? (
                      <video
                        src={mediaUrl ?? undefined}
                        className="h-full w-full object-cover"
                        muted
                        loop
                        autoPlay
                        playsInline
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={mediaUrl ?? undefined}
                        alt={item.caption ?? ""}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    )}
                    {item.caption && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                        <p className="truncate text-xs text-white">{item.caption}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <footer id="contact" className="mt-auto border-t bg-background">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col items-center gap-3 text-center sm:items-start sm:text-left">
            <div className="flex items-center gap-2">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={businessName} className="h-8 w-8 rounded-lg object-contain" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Wrench className="h-4 w-4" />
                </div>
              )}
              <span className="font-semibold">{businessName}</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground sm:justify-start">
              {business?.phone && (
                <a href={`tel:${business.phone}`} className="flex items-center gap-1.5 hover:text-foreground">
                  <Phone className="h-3.5 w-3.5" /> {business.phone}
                </a>
              )}
              {business?.email && (
                <a href={`mailto:${business.email}`} className="flex items-center gap-1.5 hover:text-foreground">
                  <Mail className="h-3.5 w-3.5" /> {business.email}
                </a>
              )}
              {business?.address && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> {business.address}
                </span>
              )}
            </div>
          </div>
          <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t pt-6 text-xs text-muted-foreground sm:flex-row">
            <span>
              © {new Date().getFullYear()} {businessName}. All rights reserved.
            </span>
            <Link href="/login" className="hover:text-foreground">
              Staff Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
