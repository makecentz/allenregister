import { SiteFrame } from "@/components/site-frame";
import { formatPrice, getPublishedCatalogItems } from "@/lib/catalog";
import { CartAddButton } from "@/components/cart";

export const instant = false;

const products = [
  { kind: "Supplies", name: "Reclaimed Clay", price: "$20.00", color: "clay" },
  { kind: "Supplies", name: "Porcelain 213", price: "$35.00", color: "violet" },
  { kind: "Merchandise", name: "Allens Lane Crewneck", price: "$42.00", color: "green" },
  { kind: "Merchandise", name: "We Belong Tote", price: "$18.00", color: "red" },
] as const;

export default async function ShopPage() {
  const publishedProducts = await getPublishedCatalogItems("product");
  const items = publishedProducts.length ? publishedProducts.map((product, index) => ({ id: product.id, kind: product.audience ?? "Shop", name: product.title, price: formatPrice(product.price_cents), priceCents: product.price_cents, color: ["clay", "violet", "green", "red"][index % 4] })) : products.map((product) => ({ ...product, id: null, priceCents: 0 }));
  return <SiteFrame><main className="catalog-page"><section className="catalog-intro"><p className="eyebrow">Allens Lane shop</p><h1>Bring the studio home.</h1><p>Pick up ceramics supplies and wear your support for community arts.</p></section><section className="catalog-tools"><button className="filter-pill">All products</button><button className="filter-pill">Supplies</button><button className="filter-pill">Merchandise</button></section><section className="product-grid">{items.map((product) => <article className="product-card" key={product.name}><div className={`product-image ${product.color}`} aria-hidden="true"><span>{product.kind}</span></div><p className="eyebrow">{product.kind}</p><h2>{product.name}</h2><div><strong>{product.price}</strong><CartAddButton item={product.id ? { id: product.id, title: product.name, itemType: "product", priceCents: product.priceCents } : null} /></div></article>)}</section></main></SiteFrame>;
}
