import * as XLSX from "xlsx";
import { SalesRow } from "@/types/sales";

export function parseSalesFile(file: File): Promise<SalesRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, {
          defval: "",
        });

        if (jsonData.length === 0) {
          reject(new Error("The file is empty"));
          return;
        }

        // Map to our SalesRow format (flexible column names)
        const rows: SalesRow[] = jsonData.map((row, index) => {
          const date =
            row["Date"] || row["date"] || row["Order Date"] || row["order_date"] || "";
          const orderId =
            row["Order ID"] || row["OrderID"] || row["order_id"] || row["orderId"] || `ORD-${index + 1}`;
          const product =
            row["Product"] || row["product"] || row["Item"] || row["item"] || "Unknown";
          const quantity = Number(row["Quantity"] || row["quantity"] || row["Qty"] || 1);
          const unitPrice = Number(
            row["Unit Price"] || row["unit_price"] || row["Price"] || row["price"] || 0
          );
          const revenue =
            Number(row["Revenue"] || row["revenue"] || row["Total"] || row["total"]) ||
            quantity * unitPrice;
          const customer =
            row["Customer"] || row["customer"] || row["Customer Name"] || undefined;

          return {
            date: String(date),
            orderId: String(orderId),
            product: String(product),
            quantity: isNaN(quantity) ? 1 : quantity,
            unitPrice: isNaN(unitPrice) ? 0 : unitPrice,
            revenue: isNaN(revenue) ? 0 : revenue,
            customer: customer ? String(customer) : undefined,
          };
        });

        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error("Failed to read the file"));
    reader.readAsArrayBuffer(file);
  });
}