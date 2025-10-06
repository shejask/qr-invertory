"use client";

import { useState } from "react";
import ProductList from "../../components/ProductList";
import { useProducts } from "../../context/ProductsContext";

export default function AddProductPage() {
  const { addProduct } = useProducts();
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [lastQr, setLastQr] = useState<string | undefined>(undefined);

  const onGenerate = async () => {
    if (!name) return;
    const prod = await addProduct(name, quantity);
    setLastQr(prod.qrDataUrl);
    setName("");
    setQuantity(1);
  };

  return (
    <main className="p-6">
      <h1 className="text-2xl mb-4">Add Product</h1>
      <div className="flex gap-3 mb-4">
        <input className="border px-2 py-1" placeholder="Product name" value={name} onChange={(e)=>setName(e.target.value)} />
        <input className="border px-2 py-1 w-24" type="number" min={0} value={quantity} onChange={(e)=>setQuantity(Number(e.target.value))} />
        <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={onGenerate}>Generate QR Code</button>
      </div>

      {lastQr && (
        <div className="mb-4">
          <div className="mb-2">Last generated QR (you can save/print):</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lastQr} alt="last-qr" width={160} height={160} />
        </div>
      )}

      <h2 className="text-xl mb-2">Inventory</h2>
      <ProductList />
    </main>
  );
}
