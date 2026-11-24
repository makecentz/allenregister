import Link from "next/link";
import { AdminProductForm } from "@/components/admin-product-form";
import { createProduct } from "@/app/admin/actions";
export const instant = false;
export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) { const { error } = await searchParams; return <main className="admin-page"><header className="admin-header"><div><p className="eyebrow">Allens Lane staff portal</p><h1>Add product</h1></div><Link className="admin-home" href="/admin/products">← Shop inventory</Link></header>{error ? <p className="form-error">{error}</p> : null}<AdminProductForm action={createProduct} /></main>; }
