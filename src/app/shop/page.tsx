import Link from "next/link";
import { SiteFrame } from "@/components/site-frame";
import { formatPrice, getPublishedCatalogItems } from "@/lib/catalog";
import { CartAddButton } from "@/components/cart";

export const instant = false;

const colors = ["clay", "violet", "green", "red"];

export default async function ShopPage() {
  const products = await getPublishedCatalogItems("product");
  return (
    <SiteFrame>
      <main className="catalog-page">
        <section className="catalog-intro">
          <p className="eyebrow">Allens Lane shop</p>
          <h1>Bring the studio home.</h1>
          <p>
            Art supplies and Allens Lane merchandise, managed in one place with
            the rest of your art-center account.
          </p>
        </section>
        <section className="catalog-tools" aria-label="Shop categories">
          <span className="filter-pill active">All products</span>
          <span className="filter-pill">Supplies</span>
          <span className="filter-pill">Merchandise</span>
          <Link className="filter-pill" href="/gift-certificates">
            Gift certificates
          </Link>
        </section>
        {products.length ? (
          <section className="product-grid">
            {products.map((product, index) => {
              const soldOut = product.inventory_quantity === 0;
              return (
                <article className="product-card" key={product.id}>
                  <Link
                    href={`/shop/${product.slug}`}
                    className={`product-image ${colors[index % colors.length]}`}
                    style={
                      product.image_path
                        ? { backgroundImage: `url("${product.image_path}")` }
                        : undefined
                    }
                  >
                    <span>{product.audience ?? "Shop"}</span>
                  </Link>
                  <p className="eyebrow">{product.audience ?? "Shop"}</p>
                  <h2>
                    <Link href={`/shop/${product.slug}`}>{product.title}</Link>
                  </h2>
                  {product.short_description ? (
                    <p className="product-summary">
                      {product.short_description}
                    </p>
                  ) : null}
                  <div>
                    <strong>{formatPrice(product.price_cents)}</strong>
                    <CartAddButton
                      item={
                        soldOut
                          ? null
                          : {
                              id: product.id,
                              title: product.title,
                              itemType: "product",
                              priceCents: product.price_cents,
                            }
                      }
                      unavailableLabel="Sold out"
                    />
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="shop-empty">
            <p className="eyebrow">Allens Lane shop</p>
            <h2>No products are currently listed.</h2>
            <p>
              Gift certificates are available now. Contact Allens Lane Art Center
              for current shop inventory.
            </p>
            <Link className="button button-primary" href="/gift-certificates">
              Shop gift certificates
            </Link>
          </section>
        )}
      </main>
    </SiteFrame>
  );
}
