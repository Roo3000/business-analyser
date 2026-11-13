import * as XLSX from "xlsx";
import { SalesRow } from "@/types/sales";

export function parseSalesFile(file: File): Promise<SalesRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, {
          defval: "",
          raw: false,
        });

        if (jsonData.length === 0) {
          reject(new Error("The file is empty"));
          return;
        }

        const rows: SalesRow[] = jsonData.map((row, index) => {
          // ----- Date -----
          let rawDate =
            row["Date"] ||
            row["date"] ||
            row["Order Date"] ||
            row["order_date"] ||
            row["OrderDate"] ||
            "";

          let dateStr = "";
          if (rawDate instanceof Date) {
            dateStr = rawDate.toISOString().split("T")[0];
          } else if (typeof rawDate === "number") {
            const excelDate = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
            dateStr = excelDate.toISOString().split("T")[0];
          } else {
            dateStr = String(rawDate).trim();
          }

          // ----- Other fields -----
          const orderId =
            row["Order ID"] ||
            row["OrderID"] ||
            row["order_id"] ||
            row["orderId"] ||
            `ORD-${index + 1}`;

          const product =
            row["Product"] ||
            row["product"] ||
            row["Item"] ||
            row["item"] ||
            "Unknown";

          const quantity = Number(
            row["Quantity"] || row["quantity"] || row["Qty"] || row["qty"] || 1
          );

          const unitPrice = Number(
            row["Unit Price"] ||
              row["unit_price"] ||
              row["Price"] ||
              row["price"] ||
              row["UnitPrice"] ||
              0
          );

          const revenue =
            Number(
              row["Revenue"] ||
                row["revenue"] ||
                row["Total"] ||
                row["total"] ||
                row["Amount"]
            ) || quantity * unitPrice;

          // ----- NEW: Cost -----
          // Accepts "Cost", "Unit Cost", "COGS", "Purchase Cost", etc.
          // If the column is unit cost, we multiply by quantity
          let cost: number | undefined = undefined;
          const rawCost =
            row["Cost"] ||
            row["cost"] ||
            row["Unit Cost"] ||
            row["unit_cost"] ||
            row["COGS"] ||
            row["cogs"] ||
            row["Purchase Cost"] ||
            row["purchase_cost"];

          if (rawCost !== undefined && rawCost !== "") {
            const costValue = Number(rawCost);
            if (!isNaN(costValue)) {
              // If the column name suggests unit cost, multiply by quantity
              const isUnitCost =
                String(
                  Object.keys(row).find((k) =>
                    ["Unit Cost", "unit_cost", "UnitCost"].includes(k)
                  ) || ""
                ).length > 0;

              cost = isUnitCost ? costValue * quantity : costValue;
            }
          }

          const customer =
            row["Customer"] ||
            row["customer"] ||
            row["Customer Name"] ||
            row["customer_name"] ||
            undefined;

          return {
            date: dateStr,
            orderId: String(orderId),
            product: String(product),
            quantity: isNaN(quantity) ? 1 : quantity,
            unitPrice: isNaN(unitPrice) ? 0 : unitPrice,
            revenue: isNaN(revenue) ? 0 : revenue,
            cost: cost,
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