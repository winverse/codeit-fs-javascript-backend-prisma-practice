CREATE TABLE "Customers" (
  "id" SERIAL PRIMARY KEY,
  "email" VARCHAR(255) UNIQUE NOT NULL,
  "name" VARCHAR(255) NOT NULL
);

CREATE TABLE "Products" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "price" INTEGER NOT NULL CHECK ("price" >= 0)
);

CREATE TABLE "Purchases" (
  "id" SERIAL PRIMARY KEY,
  "customerId" INTEGER NOT NULL REFERENCES "Customers" ("id"),
  "productId" INTEGER NOT NULL REFERENCES "Products" ("id"),
  "quantity" INTEGER NOT NULL DEFAULT 1 CHECK ("quantity" > 0)
);

INSERT INTO "Customers" ("email", "name")
VALUES
  ('customer1@test.com', '이일번'),
  ('customer2@test.com', '박이번');

INSERT INTO "Products" ("name", "price")
VALUES
  ('노트북', 1500000),
  ('키보드', 120000);

INSERT INTO "Purchases" ("customerId", "productId", "quantity")
VALUES
  (1, 1, 1),
  (1, 2, 2),
  (2, 2, 1);

SELECT * FROM "Products";

SELECT * FROM "Products" WHERE "price" >= 1000000;

SELECT * FROM "Purchases" WHERE "customerId" = 1;
