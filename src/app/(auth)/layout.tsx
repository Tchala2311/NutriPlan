export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-100 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand mark */}
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold text-bark-300">NutriPlan</h1>
          <p className="mt-1 text-sm text-bark-200">Personalised nutrition, powered by AI</p>
        </div>

        <div className="bg-parchment-100 rounded-2xl shadow-sm border border-parchment-200 p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
