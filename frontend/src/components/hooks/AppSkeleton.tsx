const Bar = ({ className = "" }: { className?: string }) => (
  <div className={`bg-gray-200 rounded-md ${className}`} />
);

export const AppSkeleton = () => (
  <div className="min-h-screen bg-white animate-pulse" aria-busy="true" aria-label="Loading">
    {/* SIDEBAR */}
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-gray-200 p-4 hidden md:block">
      <Bar className="h-6 w-36 mb-8" />
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 h-11 px-3">
            <Bar className="h-5 w-5 rounded" />
            <Bar className="h-4 flex-1" />
          </div>
        ))}
      </div>
    </aside>

    <div className="md:ml-64">
      {/* TOPBAR */}
      <header className="h-16 px-6 flex items-center justify-between border-b border-gray-100">
        <Bar className="h-4 w-64" />
        <div className="flex items-center gap-4">
          <Bar className="h-6 w-6 rounded-full" />
          <Bar className="h-9 w-9 rounded-full" />
          <div className="hidden sm:block space-y-1.5">
            <Bar className="h-3 w-24" />
            <Bar className="h-2.5 w-14" />
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <main className="p-6 lg:p-10">
        <Bar className="h-8 w-64 mb-3" />
        <Bar className="h-4 w-96 max-w-full mb-10" />

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-[2rem] border border-gray-100 p-7 shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-3">
                  <Bar className="h-5 w-32" />
                  <Bar className="h-5 w-20 rounded-full" />
                </div>
                <Bar className="h-24 w-24 rounded-full" />
              </div>
              <Bar className="h-2 w-full rounded-full mb-8" />
              <div className="grid grid-cols-2 gap-3">
                {[...Array(4)].map((_, j) => (
                  <Bar key={j} className="h-14 rounded-2xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  </div>
);