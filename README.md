# Business Analyser

Sales & e-commerce revenue analyser with cost/profit insights, charts, date filters, and trend-based projections.

## Features

- **Upload** CSV or Excel files (flexible column name detection)
- **Metrics**: Total revenue, orders, AOV, cost, profit, margin, growth rate, average daily revenue
- **Date range filter** – analyse any period within your data
- **Charts**:
  - Revenue over time + projected future revenue (area chart)
  - Top products (horizontal bar chart)
- **Projection methods**:
  - **Trend** – simple linear regression on daily revenue
  - **Flat average** – constant average daily revenue
- **Top customers** (when a Customer column is present)
- **Monthly breakdown** table
- **Export** full analysis to CSV

## Expected columns (flexible names)

| Field       | Accepted headers                                      |
|-------------|-------------------------------------------------------|
| Date        | Date, Order Date, order_date, OrderDate               |
| Order ID    | Order ID, OrderID, order_id, orderId                  |
| Product     | Product, product, Item, item                          |
| Quantity    | Quantity, quantity, Qty, qty                          |
| Unit Price  | Unit Price, unit_price, Price, price, UnitPrice       |
| Revenue     | Revenue, revenue, Total, total, Amount                |
| Cost        | Cost, cost, Unit Cost, COGS, Purchase Cost            |
| Customer    | Customer, customer, Customer Name, customer_name      |

If Revenue is missing it is calculated as Quantity × Unit Price.  
If Cost is a unit cost it is automatically multiplied by Quantity.

## Getting Started

```bash
npm install
npm run dev
