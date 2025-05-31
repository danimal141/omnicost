import { describe, expect, it } from "vitest"
import {
  CSVFormatter,
  MarkdownFormatter,
  TSVFormatter,
  getFormatter,
} from "../../../src/formatters/index.js"
import type { CostData } from "../../../src/types/index.js"

describe.skip("Formatters", () => {
  const mockData: CostData[] = [
    {
      date: "2025-04-01",
      service: "Amazon EC2",
      amount: 150.25,
      currency: "USD",
      region: "us-east-1",
    },
    {
      date: "2025-04-01",
      service: "Amazon S3",
      amount: 25.5,
      currency: "USD",
      region: "us-west-2",
    },
    {
      date: "2025-04-02",
      service: "Amazon EC2",
      amount: 155.0,
      currency: "USD",
    },
  ]

  describe("TSVFormatter", () => {
    const formatter = new TSVFormatter()

    it("should format data as TSV", () => {
      const result = formatter.format(mockData)
      const lines = result.split("\n")

      expect(lines[0]).toBe("Date\tService\tAmount\tCurrency\tRegion")
      expect(lines[1]).toBe("2025-04-01\tAmazon EC2\t150.25\tUSD\tus-east-1")
      expect(lines[2]).toBe("2025-04-01\tAmazon S3\t25.50\tUSD\tus-west-2")
      expect(lines[3]).toBe("2025-04-02\tAmazon EC2\t155.00\tUSD\t")
    })

    it("should handle empty data", () => {
      const result = formatter.format([])
      expect(result).toBe("")
    })

    it("should handle service names with tabs", () => {
      const dataWithTabs: CostData[] = [
        {
          date: "2025-04-01",
          service: "Service\twith\ttabs",
          amount: 100,
          currency: "USD",
        },
      ]
      const result = formatter.format(dataWithTabs)
      const lines = result.split("\n")
      // Tabs should be preserved as-is in TSV
      expect(lines[1]).toContain("Service\twith\ttabs")
    })
  })

  describe("CSVFormatter", () => {
    const formatter = new CSVFormatter()

    it("should format data as CSV", () => {
      const result = formatter.format(mockData)
      const lines = result.split("\n")

      expect(lines[0]).toBe("Date,Service,Amount,Currency,Region")
      expect(lines[1]).toBe('2025-04-01,"Amazon EC2",150.25,USD,us-east-1')
      expect(lines[2]).toBe('2025-04-01,"Amazon S3",25.50,USD,us-west-2')
      expect(lines[3]).toBe('2025-04-02,"Amazon EC2",155.00,USD,')
    })

    it("should handle empty data", () => {
      const result = formatter.format([])
      expect(result).toBe("")
    })

    it("should escape quotes in service names", () => {
      const dataWithSpecialChars: CostData[] = [
        {
          date: "2025-04-01",
          service: 'Service with "quotes"',
          amount: 100,
          currency: "USD",
        },
      ]
      const result = formatter.format(dataWithSpecialChars)
      const lines = result.split("\n")
      expect(lines[1]).toContain('"Service with "quotes""')
    })
  })

  describe("MarkdownFormatter", () => {
    const formatter = new MarkdownFormatter()

    it("should format data as Markdown table", () => {
      const result = formatter.format(mockData)
      const lines = result.split("\n")

      expect(lines[0]).toBe("| Date | Service | Amount | Currency | Region |")
      expect(lines[1]).toBe("|------|---------|--------|----------|--------|")
      expect(lines[2]).toBe("| 2025-04-01 | Amazon EC2 | 150.25 | USD | us-east-1 |")
      expect(lines[3]).toBe("| 2025-04-01 | Amazon S3 | 25.50 | USD | us-west-2 |")
      expect(lines[4]).toBe("| 2025-04-02 | Amazon EC2 | 155.00 | USD |  |")
    })

    it("should handle empty data", () => {
      const result = formatter.format([])
      expect(result).toBe("")
    })

    it("should handle pipes in service names", () => {
      const dataWithPipes: CostData[] = [
        {
          date: "2025-04-01",
          service: "Service | with | pipes",
          amount: 100,
          currency: "USD",
        },
      ]
      const result = formatter.format(dataWithPipes)
      const lines = result.split("\n")
      // Pipes should be preserved as-is in Markdown
      expect(lines[2]).toContain("Service | with | pipes")
    })
  })

  describe("getFormatter", () => {
    it("should return correct formatter for each format", () => {
      expect(getFormatter("tsv")).toBeInstanceOf(TSVFormatter)
      expect(getFormatter("csv")).toBeInstanceOf(CSVFormatter)
      expect(getFormatter("markdown")).toBeInstanceOf(MarkdownFormatter)
    })

    it("should throw error for unsupported format", () => {
      // @ts-expect-error - testing invalid format
      expect(() => getFormatter("xml")).toThrow("Unsupported format: xml")
    })
  })
})
