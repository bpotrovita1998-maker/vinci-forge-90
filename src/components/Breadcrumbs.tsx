import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

// Route to label mapping
const routeLabels: Record<string, string> = {
  "": "Home",
  "create": "Create",
  "gallery": "Gallery",
  "tutorials": "Tutorials",
  "blog": "Blog",
  "faq": "FAQ",
  "pricing": "Pricing",
  "about": "About Us",
  "contact": "Contact",
  "settings": "Settings",
  "privacy": "Privacy Policy",
  "terms": "Terms of Service",
  "auth": "Sign In",
  "scenes": "Scenes",
  "memory": "Memory",
};

export function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  const location = useLocation();
  
  // Auto-generate breadcrumbs from current path if not provided
  const breadcrumbItems: BreadcrumbItem[] = items || (() => {
    const pathSegments = location.pathname.split("/").filter(Boolean);
    const crumbs: BreadcrumbItem[] = [{ label: "Home", href: "/" }];
    
    let currentPath = "";
    for (const segment of pathSegments) {
      currentPath += `/${segment}`;
      const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
      crumbs.push({ label, href: currentPath });
    }
    
    return crumbs;
  })();

  // Generate JSON-LD structured data
  useEffect(() => {
    if (breadcrumbItems.length <= 1) return;

    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": breadcrumbItems.map((item, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": item.label,
        "item": `https://vinciai.lovable.app${item.href}`
      }))
    };

    let script = document.querySelector('script[data-schema="breadcrumb"]') as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-schema', 'breadcrumb');
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(breadcrumbSchema);

    return () => {
      const existingScript = document.querySelector('script[data-schema="breadcrumb"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [breadcrumbItems]);

  // Don't render if only home
  if (breadcrumbItems.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className={`flex items-center text-sm ${className}`}>
      <ol className="flex items-center gap-1 flex-wrap">
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          const isFirst = index === 0;
          
          return (
            <li key={item.href} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="w-4 h-4 text-muted-foreground/50 mx-1" />
              )}
              {isLast ? (
                <span className="text-foreground font-medium" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.href}
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                >
                  {isFirst && <Home className="w-3.5 h-3.5" />}
                  {!isFirst && item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
