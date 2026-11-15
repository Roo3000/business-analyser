# Business Analyser

Sales & e-commerce revenue analyser with cost/profit insights, multi-currency support, charts, date filters, and trend-based projections.

Upload a CSV or Excel file and get an instant dashboard: revenue, costs, margins, growth, top products/customers, and forward-looking projections.

## Features

- **Upload** — CSV or Excel (flexible column name detection)
- **Core metrics** — Total revenue, orders, AOV, cost, profit, margin, growth rate, average daily revenue
- **Date range filter** — Analyse any period + quick presets (7 days, 30 days, this month, last month, all time)
- **Period comparison** — Automatic vs previous period of the same length
- **Auto insights** — Highlights concentration risk, negative-margin products, growth, and more
- **Charts**
  - Revenue over time + projected future revenue (area chart)
  - Monthly revenue (bar chart)
  - Profit by product (horizontal bar)
  - Top products by revenue
- **Projection methods**
  - **Seasonal** — Trend + day-of-week seasonality
  - **Trend** — Linear regression on daily revenue
  - **Average** — Flat average daily revenue
- **Multi-currency** — USD, EUR, GBP, CAD, XOF with live rates (static fallback)
- **i18n** — English & Français
- **Dark mode** — Full light/dark theme
- **Top customers** — When a Customer column is present (click for order detail)
- **Product filter** — Drill into a single product
- **Export** — Full analysis to CSV

## Expected columns (flexible names)

| Field      | Accepted headers                                      |
|------------|-------------------------------------------------------|
| Date       | Date, Order Date, order_date, OrderDate               |
| Order ID   | Order ID, OrderID, order_id, orderId                  |
| Product    | Product, product, Item, item                          |
| Quantity   | Quantity, quantity, Qty, qty                          |
| Unit Price | Unit Price, unit_price, Price, price, UnitPrice       |
| Revenue    | Revenue, revenue, Total, total, Amount                |
| Cost       | Cost, cost, Unit Cost, COGS, Purchase Cost            |
| Customer   | Customer, customer, Customer Name, customer_name      |

- If **Revenue** is missing it is calculated as `Quantity × Unit Price`.
- If **Cost** looks like a unit cost it is automatically multiplied by Quantity.

## Getting Started

```bash
npm install
npm run dev
