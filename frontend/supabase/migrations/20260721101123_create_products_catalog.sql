/*
# Create products table for AI Shopping Agent

## Purpose
Stores a catalog of products across four Indian e-commerce sites
(Amazon, Flipkart, Meesho, Myntra) so the AI Shopping Agent can search,
filter, sort, and analyze them.

## New Tables
- `products`
  - `id` uuid primary key
  - `title` text — product name
  - `price` numeric — current selling price (INR)
  - `original_price` numeric nullable — MRP before discount
  - `discount` integer nullable — discount percentage
  - `rating` numeric(2,1) nullable — star rating 0-5
  - `reviews` integer nullable — number of reviews
  - `image_url` text nullable — product image URL
  - `product_url` text — link to product on the source site
  - `site` text — source site: amazon | flipkart | meesho | myntra
  - `category` text — product category for filtering
  - `available` boolean default true
  - `created_at` timestamptz default now()

## Indexes
- `products_site_idx` on `site`
- `products_category_idx` on `category`
- `products_price_idx` on `price`
- `products_rating_idx` on `rating`

## Security
Single-tenant app (no sign-in). RLS enabled with anon+authenticated CRUD
because the catalog is intentionally public/shared browsing data.
*/

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  price numeric NOT NULL,
  original_price numeric,
  discount integer,
  rating numeric(2,1),
  reviews integer,
  image_url text,
  product_url text NOT NULL,
  site text NOT NULL CHECK (site IN ('amazon', 'flipkart', 'meesho', 'myntra')),
  category text NOT NULL,
  available boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_site_idx ON products(site);
CREATE INDEX IF NOT EXISTS products_category_idx ON products(category);
CREATE INDEX IF NOT EXISTS products_price_idx ON products(price);
CREATE INDEX IF NOT EXISTS products_rating_idx ON products(rating);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_products" ON products;
CREATE POLICY "anon_select_products" ON products FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_products" ON products;
CREATE POLICY "anon_insert_products" ON products FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_products" ON products;
CREATE POLICY "anon_update_products" ON products FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_products" ON products;
CREATE POLICY "anon_delete_products" ON products FOR DELETE
  TO anon, authenticated USING (true);
