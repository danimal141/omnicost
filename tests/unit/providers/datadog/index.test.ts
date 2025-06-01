import { beforeEach, describe, expect, it, vi } from "vitest"
import { DatadogCostProvider } from "../../../../src/providers/datadog/index.js"

// Mock the Datadog API client
vi.mock("@datadog/datadog-api-client", () => ({
  v1: {
    UsageMeteringApi: vi.fn().mockImplementation(() => ({
      getUsageSummary: vi.fn(),
      getMonthlyUsageAttribution: vi.fn(),
    })),
    MonthlyUsageAttributionSupportedMetrics: {},
  },
  client: {
    createConfiguration: vi.fn().mockReturnValue({}),
  },
}))

describe("DatadogCostProvider", () => {
  let provider: DatadogCostProvider
  let mockApi: any

  beforeEach(() => {
    vi.clearAllMocks()
    provider = new DatadogCostProvider()
    mockApi = (provider as any).api
  })

  describe("validateCredentials", () => {
    it("should return true when credentials are valid", async () => {
      mockApi.getUsageSummary.mockResolvedValueOnce({
        usage: [],
      })

      const result = await provider.validateCredentials()
      expect(result).toBe(true)
      expect(mockApi.getUsageSummary).toHaveBeenCalledWith({
        startMonth: expect.any(Date),
        endMonth: expect.any(Date),
      })
    })

    it("should return false when credentials are invalid (401)", async () => {
      mockApi.getUsageSummary.mockRejectedValueOnce(new Error("401 Unauthorized"))

      const result = await provider.validateCredentials()
      expect(result).toBe(false)
    })

    it("should return false when credentials are invalid (403)", async () => {
      mockApi.getUsageSummary.mockRejectedValueOnce(new Error("403 Forbidden"))

      const result = await provider.validateCredentials()
      expect(result).toBe(false)
    })

    it("should throw error for other failures", async () => {
      mockApi.getUsageSummary.mockRejectedValueOnce(new Error("Network error"))

      await expect(provider.validateCredentials()).rejects.toThrow("Network error")
    })
  })

  describe("fetchCosts", () => {
    it("should fetch and transform summary data without grouping", async () => {
      // Create a properly typed response that matches UsageSummaryResponse structure
      const mockSummary = {
        date: new Date("2025-01-01"),
        apmHostTop99p: 10,
        infraHostTop99p: 20,
        indexedEventsCountSum: 1000000,
        syntheticsCheckCallsCountSum: 5000,
        rumTotalSessionCountSum: 10000,
      }

      // The response should have usage as a single object, not array for UsageSummaryResponse
      const mockResponse = {
        usage: [mockSummary], // This matches the expected type
      }

      mockApi.getUsageSummary.mockResolvedValueOnce(mockResponse)

      const result = await provider.fetchCosts({
        startDate: "2025-01-01",
        endDate: "2025-01-31",
      })

      expect(mockApi.getUsageSummary).toHaveBeenCalledWith({
        startMonth: new Date("2025-01-01"),
        endMonth: new Date("2025-01-31"),
        includeOrgDetails: true,
      })

      expect(result).toHaveLength(5)

      // Check that all expected services are present (order may vary)
      const services = result.map((r) => r.service)
      expect(services).toContain("APM Hosts")
      expect(services).toContain("Infrastructure Hosts")
      expect(services).toContain("Logs")
      expect(services).toContain("Synthetics")
      expect(services).toContain("RUM Sessions")

      // Check specific values
      const apmHosts = result.find((r) => r.service === "APM Hosts")
      expect(apmHosts).toBeDefined()
      expect(apmHosts?.amount).toBe(10)
      expect(apmHosts?.currency).toBe("USD")
      expect(apmHosts?.date).toBe("2025-01-01")

      const infraHosts = result.find((r) => r.service === "Infrastructure Hosts")
      expect(infraHosts).toBeDefined()
      expect(infraHosts?.amount).toBe(20)
    })

    it("should fetch and transform attribution data with grouping", async () => {
      const mockResponse = {
        usage: [
          {
            month: "2025-01",
            values: {
              api_usage: {
                productName: "API Usage",
                usage: 1000,
              },
              apm_usage: {
                productName: "APM Usage",
                usage: 2000,
              },
            },
          },
        ],
      }

      mockApi.getMonthlyUsageAttribution.mockResolvedValueOnce(mockResponse)

      const result = await provider.fetchCosts({
        startDate: "2025-01-01",
        endDate: "2025-01-31",
        groupBy: "SERVICE",
      })

      expect(mockApi.getMonthlyUsageAttribution).toHaveBeenCalledWith({
        startMonth: new Date("2025-01-01"),
        endMonth: new Date("2025-01-01"),
        fields: "service",
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        date: "2025-01",
        service: "Datadog Usage",
        amount: 1000,
        currency: "USD",
        tags: undefined,
      })
    })

    it("should handle empty results", async () => {
      mockApi.getUsageSummary.mockResolvedValueOnce({ usage: [] })

      const result = await provider.fetchCosts({
        startDate: "2025-01-01",
        endDate: "2025-01-31",
      })

      expect(result).toEqual([])
    })

    it("should handle zero values", async () => {
      const mockResponse = {
        usage: [
          {
            date: new Date("2025-01-01"),
            apmHostTop99p: 0,
            infraHostTop99p: 0,
          },
        ],
      }

      mockApi.getUsageSummary.mockResolvedValueOnce(mockResponse)

      const result = await provider.fetchCosts({
        startDate: "2025-01-01",
        endDate: "2025-01-31",
      })

      expect(result).toEqual([])
    })

    it("should retry on retryable errors", async () => {
      mockApi.getUsageSummary
        .mockRejectedValueOnce(new Error("429 Too Many Requests"))
        .mockResolvedValueOnce({ usage: [] })

      const result = await provider.fetchCosts({
        startDate: "2025-01-01",
        endDate: "2025-01-31",
      })

      expect(mockApi.getUsageSummary).toHaveBeenCalledTimes(2)
      expect(result).toEqual([])
    })

    it("should handle ECONNRESET errors with retry", async () => {
      mockApi.getUsageSummary
        .mockRejectedValueOnce(new Error("ECONNRESET"))
        .mockResolvedValueOnce({ usage: [] })

      const result = await provider.fetchCosts({
        startDate: "2025-01-01",
        endDate: "2025-01-31",
      })

      expect(mockApi.getUsageSummary).toHaveBeenCalledTimes(2)
      expect(result).toEqual([])
    })

    it("should fail after max retries", async () => {
      mockApi.getUsageSummary
        .mockRejectedValueOnce(new Error("503 Service Unavailable"))
        .mockRejectedValueOnce(new Error("503 Service Unavailable"))
        .mockRejectedValueOnce(new Error("503 Service Unavailable"))

      await expect(
        provider.fetchCosts({
          startDate: "2025-01-01",
          endDate: "2025-01-31",
        }),
      ).rejects.toThrow("Failed to fetch Datadog usage data: 503 Service Unavailable")

      expect(mockApi.getUsageSummary).toHaveBeenCalledTimes(3)
    }, 10000) // Increase timeout to 10 seconds

    it("should throw wrapped error for API failures", async () => {
      mockApi.getUsageSummary.mockRejectedValueOnce(new Error("API Error"))

      await expect(
        provider.fetchCosts({
          startDate: "2025-01-01",
          endDate: "2025-01-31",
        }),
      ).rejects.toThrow("Failed to fetch Datadog usage data: API Error")
    })
  })
})
