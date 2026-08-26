import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { EmptyState, SkeletonTable } from "./ui";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  align?: "right";
}

export function DataTable<T>({ rows, columns, rowKey, pageSize = 10, empty, loading }: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  pageSize?: number;
  empty?: { title: string; text: string };
  loading?: boolean;
}) {
  const [sort, setSort] = useState<{ key: string; direction: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [rows.length, sort]);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((item) => item.key === sort.key);
    if (!column?.sortValue) return rows;
    return [...rows].sort((a, b) => {
      const left = column.sortValue!(a);
      const right = column.sortValue!(b);
      if (left === right) return 0;
      return (left > right ? 1 : -1) * sort.direction;
    });
  }, [rows, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const visible = sorted.slice(current * pageSize, current * pageSize + pageSize);

  if (loading) return <SkeletonTable columns={columns.length} />;
  if (!sorted.length) return <EmptyState title={empty?.title ?? "Nothing here yet"} text={empty?.text ?? "No records match the current filters."} />;

  const toggle = (key: string) => {
    setSort((previous) => (previous?.key === key ? { key, direction: previous.direction === 1 ? -1 : 1 } : { key, direction: 1 }));
  };

  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={column.align === "right" ? "right" : ""}>
                  {column.sortValue ? (
                    <button className="sort" onClick={() => toggle(column.key)} aria-label={"Sort by " + column.header}>
                      {column.header}
                      {sort?.key === column.key ? (sort.direction === 1 ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((column) => (
                  <td key={column.key} className={column.align === "right" ? "right" : ""}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <div className="pagination">
          <span>
            {current * pageSize + 1}–{Math.min(sorted.length, (current + 1) * pageSize)} of {sorted.length}
          </span>
          <button className="icon-btn" disabled={current === 0} onClick={() => setPage(current - 1)} aria-label="Previous page">
            <ChevronLeft size={15} />
          </button>
          <button className="icon-btn" disabled={current >= pageCount - 1} onClick={() => setPage(current + 1)} aria-label="Next page">
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </>
  );
}
