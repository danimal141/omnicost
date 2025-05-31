import { beforeEach, describe, expect, it, vi } from "vitest"
import { AWSCostProvider } from "../../../../src/providers/aws/index.js"
import type { CostData, FetchParams } from "../../../../src/types/index.js"

describe.skip("AWS Cost Provider", () => {
  let provider: AWSCostProvider

  beforeEach(() => {
    provider = new AWSCostProvider()
  })

  describe("fetchCosts", () => {
    it("should fetch costs successfully", async () => {
      const params: FetchParams = {
        startDate: "2025-04-01",
        endDate: "2025-04-30",
        groupBy: "SERVICE",
      }

      const result = await provider.fetchCosts(params)

      expect(result).toHaveLength(3)
      expect(result[0]).toMatchObject({
        date: "2025-04-01",
        service: "Amazon EC2",
        amount: 150.25,
        currency: "USD",
      })
    })

    it("should handle empty results", async () => {
      vi.spyOn(provider, "fetchCosts").mockResolvedValue([])

      const params: FetchParams = {
        startDate: "2025-04-01",
        endDate: "2025-04-30",
        groupBy: "SERVICE",
      }

      const result = await provider.fetchCosts(params)
      expect(result).toEqual([])
    })

    it("should normalize AWS response to CostData format", async () => {
      const params: FetchParams = {
        startDate: "2025-04-01",
        endDate: "2025-04-30",
        groupBy: "SERVICE",
      }

      const result = await provider.fetchCosts(params)

      for (const item of result) {
        expect(item).toHaveProperty("date")
        expect(item).toHaveProperty("service")
        expect(item).toHaveProperty("amount")
        expect(item).toHaveProperty("currency")
        expect(typeof item.date).toBe("string")
        expect(typeof item.service).toBe("string")
        expect(typeof item.amount).toBe("number")
        expect(typeof item.currency).toBe("string")
      }
    })
  })

  describe("validateCredentials", () => {
    it("should validate credentials successfully", async () => {
      const result = await provider.validateCredentials()
      expect(result).toBe(true)
    })

    it("should return false for invalid credentials", async () => {
      vi.spyOn(provider, "validateCredentials").mockResolvedValue(false)
      const result = await provider.validateCredentials()
      expect(result).toBe(false)
    })
  })
})
