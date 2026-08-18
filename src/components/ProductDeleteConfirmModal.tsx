"use client";

interface ProductDeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  isDeleting?: boolean;
  isLoading?: boolean;
  selectedCount?: number;
  productNames?: string[];
  products?: { id: string; name: string }[];
}

export default function ProductDeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  isLoading,
  selectedCount,
  productNames,
  products,
}: ProductDeleteConfirmModalProps) {
  if (!isOpen) return null;

  const count = selectedCount ?? products?.length ?? 0;
  const names = productNames ?? products?.map((p) => p.name) ?? [];
  const deleting = Boolean(isDeleting || isLoading);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <svg viewBox="0 0 20 20" fill="none" className="h-6 w-6">
              <path d="M7 3.5h6m-9 3h12m-1.5 0v10a1.5 1.5 0 01-1.5 1.5h-7a1.5 1.5 0 01-1.5-1.5v-10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8.5 9.5v5M11.5 9.5v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {count === 1 ? "Delete Product" : `Delete ${count} Products`}
            </h3>
            <p className="text-xs text-slate-500">This action cannot be undone.</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-rose-50/60 p-3.5 border border-rose-100">
          <p className="text-xs font-semibold text-rose-900">
            Are you sure you want to permanently remove {count === 1 ? "this product" : `these ${count} products`} from the database?
          </p>
          {names.length > 0 && (
            <div className="mt-2 max-h-32 overflow-y-auto rounded-lg bg-white p-2 border border-rose-200 text-xs text-slate-700">
              <ul className="space-y-1 divide-y divide-slate-100">
                {names.slice(0, 10).map((name, i) => (
                  <li key={i} className="pt-1 first:pt-0 font-medium truncate">
                    • {name}
                  </li>
                ))}
                {names.length > 10 && (
                  <li className="pt-1 text-slate-500 font-semibold italic">
                    ...and {names.length - 10} more items
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2.5">
          <button
            type="button"
            disabled={deleting}
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={onConfirm}
            className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-500 disabled:opacity-50"
          >
            {deleting ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Deleting...
              </>
            ) : (
              `Delete ${count === 1 ? "Product" : `(${count}) Products`}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
