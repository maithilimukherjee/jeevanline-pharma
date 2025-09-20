import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center max-w-md">
        <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent mb-3">404</h1>
        <p className="text-muted-foreground mb-6">The page you’re looking for doesn’t exist.</p>
        <a href="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90">
          Back to dashboard
        </a>
      </div>
    </div>
  );
};

export default NotFound;
