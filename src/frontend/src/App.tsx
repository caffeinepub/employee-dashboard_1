import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Dashboard } from "./components/Dashboard";
import { useActor } from "./hooks/useActor";
import { useInitialize } from "./hooks/useQueries";

export default function App() {
  const { actor, isFetching } = useActor();
  const initialize = useInitialize();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (actor && !isFetching && !initialized && !initialize.isPending) {
      initialize.mutate(undefined, {
        onSuccess: () => setInitialized(true),
        onError: () => setInitialized(true),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actor, isFetching, initialized, initialize.isPending, initialize.mutate]);

  if (isFetching || (!initialized && initialize.isPending)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-primary/20 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-primary animate-spin" />
            </div>
            <div className="absolute inset-0 rounded-full border border-primary/30 animate-ping" />
          </div>
          <p className="text-muted-foreground font-body text-sm tracking-widest uppercase">
            Loading workspace
          </p>
        </div>
      </div>
    );
  }

  return <Dashboard />;
}
