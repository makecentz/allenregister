import Link from "next/link";
import { SiteFrame } from "@/components/site-frame";

const products = [
  { kind: "Supplies", name: "Reclaimed Clay", price: "$20.00", color: "clay" },
  { kind: "Supplies", name: "Porcelain 213", price: "$35.00", color: "violet" },
  { kind: "Merchandise", name: "Allens Lane Crewneck", price: "$42.00", color: "green" },
  { kind: "Merchandise", name: "We Belong Tote", price: "$18.00", color: "red" },
] as const;

export default function ShopPage() {
  return <SiteFrame><main className="catalog-page"><section className="catalog-intro"><p className="eyebrow">Allens Lane shop</p><h1>Bring the studio home.</h1><p>Pick up ceramics supplies and wear your support for community arts.</p></section><section className="catalog-tools"><button className="filter-pill">All products</button><button className="filter-pill">Supplies</button><button className="filter-pill">Merchandise</button></section><section className="product-grid">{products.map((product) => <article className="product-card" key={product.name}><div className={`product-image ${product.color}`} aria-hidden="true"><span>{product.kind}</span></div><p className="eyebrow">{product.kind}</p><h2>{product.name}</h2><div><strong>{product.price}</strong><Link className="button button-primary" href="/signup?next=/shop">Add to cart</Link></div></article>)}</section></main></SiteFrame>;
}
