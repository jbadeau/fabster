import { Search } from 'lucide-react';

export function SearchPage() {
  return (
    <div className="flex flex-1 items-center justify-center py-12">
      <div className="text-center text-muted-foreground">
        <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
        <h2 className="text-lg font-semibold text-foreground">Search</h2>
        <p className="mt-1 text-sm">Coming soon</p>
      </div>
    </div>
  );
}
