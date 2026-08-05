import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export type Crumb = [name: string, path: string];

interface PageBreadcrumbsProps {
  /** Drobečky bez domovskej stránky — tá sa pridáva automaticky (rovnako ako v JSON-LD). */
  items: Crumb[];
  className?: string;
}

/**
 * Viditeľná drobečková navigácia. Musí presne zodpovedať `BreadcrumbList`
 * JSON-LD na tej istej stránke (rovnaké poradie, názvy aj cesty) — Google
 * vyžaduje, aby structured data zodpovedali viditeľnému obsahu.
 */
const PageBreadcrumbs = ({ items, className = "" }: PageBreadcrumbsProps) => {
  const crumbs: Crumb[] = [["Domov", "/"], ...items];

  return (
    <nav aria-label="Drobečková navigácia" data-breadcrumbs className={`mb-6 ${className}`}>
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {crumbs.map(([name, path], i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li key={path} className="flex items-center gap-1 min-w-0">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" />}
              {isLast ? (
                <span
                  data-breadcrumb-item
                  data-breadcrumb-path={path}
                  aria-current="page"
                  className="truncate max-w-[16rem] font-medium text-foreground"
                >
                  {name}
                </span>
              ) : (
                <Link
                  to={path}
                  data-breadcrumb-item
                  data-breadcrumb-path={path}
                  className="truncate max-w-[16rem] hover:text-foreground transition-colors"
                >
                  {name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default PageBreadcrumbs;
