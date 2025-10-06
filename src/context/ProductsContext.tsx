"use client";

import React, { createContext, useContext, useState } from "react";

export type Product = {
  id: string;
  name: string;
  quantity: number;
  qrDataUrl?: string;
};

type ProductsContextType = {
  products: Product[];
  addProduct: (name: string, quantity: number) => Promise<Product>;
  scanProduct: (id: string) => { success: boolean; message?: string; product?: Product };
};

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

export const useProducts = () => {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error("useProducts must be used within ProductsProvider");
  return ctx;
};

export const ProductsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);

  const addProduct = async (name: string, quantity: number) => {
    const id = `PROD-${Date.now()}`;
    const data = `${id}|${name}`;
    // Dynamically import `qrcode` to avoid bundling server-only code into a Next.js client component.
    // `qrcode` performs better when loaded only when needed and avoids SSR/client build issues.
    const QRCode = (await import("qrcode")).default as typeof import("qrcode");
    const qrDataUrl = await QRCode.toDataURL(data);
    const product: Product = { id, name, quantity, qrDataUrl };
    setProducts((p) => [product, ...p]);
    return product;
  };

  const scanProduct = (id: string) => {
    const idx = products.findIndex((p) => p.id === id);
    if (idx === -1) return { success: false, message: "Product not found" };
    const product = products[idx];
    if (product.quantity <= 0) return { success: false, message: "OUT OF STOCK", product };
    const updated: Product = { ...product, quantity: product.quantity - 1 };
    const newProducts = [...products];
    newProducts[idx] = updated;
    setProducts(newProducts);
    return { success: true, product: updated };
  };

  return (
    <ProductsContext.Provider value={{ products, addProduct, scanProduct }}>
      {children}
    </ProductsContext.Provider>
  );
};

export default ProductsContext;
