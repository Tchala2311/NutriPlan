import type { Metadata } from "next";

export const metadata: Metadata = { title: "Recipes — NutriPlan" };

export default function RecipesPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-bark-300">Recipes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Discover recipes tailored to your nutrition goals.
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-parchment-300 bg-parchment-50 p-10 text-center">
        <BookIcon className="mx-auto h-10 w-10 text-parchment-300 mb-3" />
        <p className="font-display text-lg font-semibold text-bark-200">Coming soon</p>
        <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">
          Personalised recipe suggestions with full macro breakdowns.
        </p>
      </div>
    </div>
  );
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}
