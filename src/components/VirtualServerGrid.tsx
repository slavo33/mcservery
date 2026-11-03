import { useEffect, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import ServerCard from "@/components/ServerCard";
import type { MinecraftServer } from "@/lib/mockData";
import type { ServerStatus } from "@/lib/serverStatusStore";

type GridServer = MinecraftServer & {
  dbId?: string;
  is_warez?: boolean;
  has_whitelist?: boolean;
  votes?: number;
  vip_expires_at?: string | null;
  vote_cooldown_hours?: number;
  slug?: string;
};

type DataAttributes = { [key: `data-${string}`]: string | number | undefined };

interface VirtualServerGridProps {
  servers: GridServer[];
  statuses: Record<string, ServerStatus>;
  /** Odhadovaná výška riadku (karta + medzera) pre plynulý scroll pred zmeraním */
  estimateRowHeight?: number;
  className?: string;
  gridProps?: React.HTMLAttributes<HTMLDivElement> & DataAttributes;
}

/** Počet stĺpcov podľa breakpointu (zhoduje sa s grid sm:2 / lg:3) */
const useColumnCount = () => {
  const [cols, setCols] = useState(() => {
    if (typeof window === "undefined") return 3;
    if (window.innerWidth >= 1024) return 3;
    if (window.innerWidth >= 640) return 2;
    return 1;
  });

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setCols(w >= 1024 ? 3 : w >= 640 ? 2 : 1);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return cols;
};

/**
 * Virtualizovaná mriežka serverov — renderuje iba viditeľné riadky (+ overscan),
 * takže scroll ostáva plynulý aj pri stovkách položiek.
 */
const VirtualServerGrid = ({
  servers,
  statuses,
  estimateRowHeight = 420,
  className = "",
  gridProps,
}: VirtualServerGridProps) => {
  const cols = useColumnCount();
  const parentRef = useRef<HTMLDivElement | null>(null);
  const [offset, setOffset] = useState(0);

  const rowCount = Math.ceil(servers.length / cols);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const measure = () => setOffset(el.getBoundingClientRect().top + window.scrollY);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [cols, servers.length]);

  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => estimateRowHeight,
    overscan: 2,
    scrollMargin: offset,
  });

  const rows = virtualizer.getVirtualItems();

  return (
    <div ref={parentRef} className={className} {...gridProps}>
      <div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
        {rows.map((row) => {
          const start = row.index * cols;
          const items = servers.slice(start, start + cols);
          return (
            <div
              key={row.key}
              ref={virtualizer.measureElement}
              data-index={row.index}
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 pb-6"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${row.start - virtualizer.options.scrollMargin}px)`,
              }}
            >
              {items.map((server) => (
                <ServerCard
                  key={server.id}
                  server={server}
                  dbMode={!!server.dbId}
                  dbId={server.dbId}
                  liveStatus={statuses[server.ip] ?? null}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VirtualServerGrid;
