import Link from "next/link";
import { notFound } from "next/navigation";
import { CartAddButton } from "@/components/cart";
import { SiteFrame } from "@/components/site-frame";
import { formatPrice, getPublishedProductBySlug } from "@/lib/catalog";

export const instant = false;

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getPublishedProductBySlug(slug);
  if (!product) notFound();
  const metadata = product.metadata as { sku?: string | null; material?: string | null; fulfillment?: string | null };
  const soldOut = product.inventory_quantity === 0;
  return <SiteFrame><main className="product-detail"><Link className="browse-link" href="/shop">← All shop items</Link><div className="product-detail-layout"><div className="product-detail-art" style={product.image_path ? { backgroundImage: `url("${product.image_path}")` } : undefined}><span>{product.audience ?? "Allens Lane shop"}</span></div><section><p className="eyebrow">{product.audience ?? "Shop"}</p><h1>{product.title}</h1>{product.description || product.short_description ? <p className="product-detail-description">{product.description ?? product.short_description}</p> : null}<dl>{metadata.material ? <><dt>Material</dt><dd>{metadata.material}</dd></> : null}{metadata.fulfillment ? <><dt>Fulfillment</dt><dd>{metadata.fulfillment === "shipping" ? "Shipping available" : "Pickup at Allens Lane Art Center"}</dd></> : null}{metadata.sku ? <><dt>SKU</dt><dd>{metadata.sku}</dd></> : null}</dl><div className="product-purchase"><strong>{formatPrice(product.price_cents)}</strong>{soldOut ? <CartAddButton item={null} unavailableLabel="Sold out" /> : <CartAddButton item={{ id: product.id, title: product.title, itemType: "product", priceCents: product.price_cents }} />}</div></section></div></main></SiteFrame>;
}
