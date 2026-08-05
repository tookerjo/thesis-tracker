import { Skeleton } from "./skeleton";

export function TableSkeleton({
  columns,
  rows = 6,
}: {
  columns: { label: string; cellWidthClassName: string }[];
  rows?: number;
}) {
  return (
    <table className="w-full text-left">
      <thead>
        <tr className="border-b border-neutral-200 text-sm text-neutral-500">
          {columns.map((column) => (
            <th key={column.label} className="py-2 pr-4 font-medium">
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <tr key={rowIndex} className="border-b border-neutral-100">
            {columns.map((column) => (
              <td key={column.label} className="py-2 pr-4">
                <Skeleton className={`h-4 ${column.cellWidthClassName}`} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
