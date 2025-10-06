"use client";

import { useProducts } from "../context/ProductsContext";

export default function ProductList() {
  const { products } = useProducts();

  if (products.length === 0) return <div className="text-sm text-muted">No products yet.</div>;

  return (
    <div className="grid gap-4">
      {products.map((p) => (
        <div key={p.id} className="border rounded p-3 flex gap-4 items-center">
          <div className="w-20 h-20 bg-white/5 flex items-center justify-center">
            {p.qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.qrDataUrl} alt={`QR ${p.id}`} width={80} height={80} />
            ) : (
              <div className="text-xs">No QR</div>
            )}
          </div>
          <div className="flex-1">
            <div className="font-medium">{p.name}</div>
            <div className="text-xs text-gray-500">ID: {p.id}</div>
          </div>
          <div
            className={`font-mono px-3 py-1 rounded ${
              p.quantity <= 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
            }`}
          >
            {p.quantity <= 0 ? "OUT OF STOCK" : `Qty: ${p.quantity}`}
          </div>
        </div>
      ))}
    </div>
  );
}
