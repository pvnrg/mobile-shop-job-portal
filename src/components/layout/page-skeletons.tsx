import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Shown by the route-level loading.tsx files while a screen's server data
// loads, so navigation responds instantly instead of looking frozen.

function PageHeaderSkeleton({ withButton = true }: { withButton?: boolean }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      {withButton && <Skeleton className="h-9 w-full sm:w-32" />}
    </div>
  );
}

export function ListPageSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <PageHeaderSkeleton />
      <Card>
        <CardContent className="space-y-4">
          <Skeleton className="h-9 w-full" />
          <div className="space-y-3">
            {Array.from({ length: rows }, (_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-5 w-28 shrink-0" />
                <Skeleton className="h-5 flex-1" />
                <Skeleton className="hidden h-5 w-24 sm:block" />
                <Skeleton className="h-5 w-20 shrink-0" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <PageHeaderSkeleton />
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Card key={i}>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      {Array.from({ length: 2 }, (_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }, (_, j) => (
              <Skeleton key={j} className="h-5 w-full" />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function FormPageSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6" aria-busy="true" aria-label="Loading">
      <PageHeaderSkeleton withButton={false} />
      <Card>
        <CardContent className="space-y-5">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
          <Skeleton className="h-9 w-32" />
        </CardContent>
      </Card>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <PageHeaderSkeleton />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 5 }, (_, i) => (
          <Card key={i}>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
