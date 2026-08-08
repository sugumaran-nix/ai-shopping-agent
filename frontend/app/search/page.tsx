import { Suspense } from "react";
import SearchPageContent from "./SearchPageContent";

export const dynamic = "force-dynamic";

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
