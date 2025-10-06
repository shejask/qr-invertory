import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <main className="p-8 bg-white rounded shadow max-w-xl w-full">
        <h1 className="text-2xl font-semibold mb-4">QR Inventory Tester</h1>
        <p className="mb-4">Use the links below to add products and simulate scanning.</p>
        <div className="flex gap-3">
          <Link className="px-4 py-2 bg-blue-600 text-white rounded" href="/add-product">Add Product</Link>
          <Link className="px-4 py-2 bg-green-600 text-white rounded" href="/scan">Scan (manual)</Link>
          <Link className="px-4 py-2 bg-green-600 text-white rounded" href="/camera">Scan (camera)</Link>

        </div>
      </main>
    </div>
  );
}
