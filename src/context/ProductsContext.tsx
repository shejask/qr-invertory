"use client";

import React, { createContext, useContext, useState } from "react";
// Firebase imports (client-side safe)
import { initializeApp, getApps } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";
import { useEffect } from "react";

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

  // Initialize Firebase app (guard to avoid re-init during HMR)
  const firebaseConfig = {
    apiKey: "AIzaSyCTVGO3AeRbO8f4an_WmFysC6TcWs5EvBo",
    authDomain: "community-care-connect.firebaseapp.com",
    databaseURL: "https://community-care-connect-default-rtdb.firebaseio.com",
    projectId: "community-care-connect",
    storageBucket: "community-care-connect.appspot.com",
    messagingSenderId: "106041086091",
    appId: "1:106041086091:web:ad93f0326174ae7bff448e"
  };

  if (typeof window !== "undefined") {
    if (!getApps().length) {
      try {
        initializeApp(firebaseConfig);
      } catch (e) {
        // ignore init errors during hot reload
        // console.warn("Firebase init error", e);
      }
    }
  }

  // Subscribe to products in Firebase Realtime Database and keep local state in sync
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const db = getDatabase();
      const productsRef = ref(db, "products");
      const unsubscribe = onValue(productsRef, (snapshot) => {
        const val = snapshot.val();
        if (!val) {
          // If DB is empty, keep local state as-is
          return;
        }
        // val is an object keyed by id
        const items: Product[] = Object.keys(val).map((k) => {
          const v = val[k];
          return {
            id: v.id ?? k,
            name: v.name,
            quantity: typeof v.quantity === "number" ? v.quantity : Number(v.quantity) || 0,
            qrDataUrl: v.qrDataUrl,
          } as Product;
        });
        // Optionally sort by id/newness — keep DB order for now
        setProducts(items.reverse());
      });

      return () => {
        // onValue returns an unsubscribe function
        try {
          unsubscribe();
        } catch (e) {
          // ignore
        }
      };
    } catch (err) {
      console.error("Firebase onValue subscribe error:", err);
    }
  }, []);

  const addProduct = async (name: string, quantity: number) => {
    const id = `PROD-${Date.now()}`;
    const data = `${id}|${name}`;
    // Dynamically import `qrcode` to avoid bundling server-only code into a Next.js client component.
    // `qrcode` performs better when loaded only when needed and avoids SSR/client build issues.
    const QRCode = (await import("qrcode")).default as typeof import("qrcode");
    const qrDataUrl = await QRCode.toDataURL(data);
    const product: Product = { id, name, quantity, qrDataUrl };
    setProducts((p) => [product, ...p]);

    // Save to Firebase Realtime Database (client-side)
    try {
      if (typeof window !== "undefined") {
        const db = getDatabase();
        await set(ref(db, `products/${id}`), product);
      }
    } catch (err) {
      console.error("Failed to save product to Firebase:", err);
    }

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
