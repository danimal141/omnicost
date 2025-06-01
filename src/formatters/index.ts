import type { CostData, OutputFormat } from "../types/index.js"

export interface Formatter {
  format(data: CostData[]): string
}

export class TSVFormatter implements Formatter {
  format(data: CostData[]): string {
    if (data.length === 0) return ""

    const headers = ["Date", "Service", "Amount", "Currency", "Region"]
    const rows = data.map((item) =>
      [item.date, item.service, item.amount.toFixed(2), item.currency, item.region || ""].join(
        "\t",
      ),
    )

    return [headers.join("\t"), ...rows].join("\n")
  }
}

export class CSVFormatter implements Formatter {
  format(data: CostData[]): string {
    if (data.length === 0) return ""

    const headers = ["Date", "Service", "Amount", "Currency", "Region"]
    const rows = data.map((item) =>
      [
        item.date,
        `"${item.service}"`,
        item.amount.toFixed(2),
        item.currency,
        item.region || "",
      ].join(","),
    )

    return [headers.join(","), ...rows].join("\n")
  }
}

export class MarkdownFormatter implements Formatter {
  format(data: CostData[]): string {
    if (data.length === 0) return ""

    const headers = "| Date | Service | Amount | Currency | Region |"
    const separator = "|------|---------|--------|----------|--------|"
    const rows = data.map(
      (item) =>
        `| ${item.date} | ${item.service} | ${item.amount.toFixed(2)} | ${item.currency} | ${
          item.region || ""
        } |`,
    )

    return [headers, separator, ...rows].join("\n")
  }
}

export function getFormatter(format: OutputFormat): Formatter {
  switch (format) {
    case "tsv":
      return new TSVFormatter()
    case "csv":
      return new CSVFormatter()
    case "markdown":
      return new MarkdownFormatter()
    default:
      throw new Error(`Unsupported format: ${format}`)
  }
}

export function formatCostData(data: CostData[], format: OutputFormat): string {
  const formatter = getFormatter(format)
  return formatter.format(data)
}
