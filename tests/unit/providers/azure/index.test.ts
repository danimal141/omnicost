import { CostManagementClient } from "@azure/arm-costmanagement"
import { ClientSecretCredential } from "@azure/identity"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AzureCostProvider } from "../../../../src/providers/azure/index.js"

vi.mock("@azure/arm-costmanagement")
vi.mock("@azure/identity")

describe("AzureCostProvider", () => {
  let provider: AzureCostProvider
  let mockClient: any
  let consoleErrorSpy: any

  beforeEach(() => {
    process.env.AZURE_TENANT_ID = "test-tenant-id"
    process.env.AZURE_CLIENT_ID = "test-client-id"
    process.env.AZURE_CLIENT_SECRET = "test-client-secret"

    mockClient = {
      query: {
        usage: vi.fn(),
      },
    }

    vi.mocked(ClientSecretCredential).mockImplementation(() => ({}) as any)
    vi.mocked(CostManagementClient).mockImplementation(() => mockClient)

    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(console, "warn").mockImplementation(() => {})

    provider = new AzureCostProvider("test-subscription-id")
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.resetAllMocks()
    vi.unstubAllEnvs()
    consoleErrorSpy.mockRestore()
  })

  describe("constructor", () => {
    it("should throw error when Azure credentials are missing", () => {
      // Save current value
      const originalTenantId = process.env.AZURE_TENANT_ID
      // Delete by assigning empty string
      process.env.AZURE_TENANT_ID = ""

      expect(() => new AzureCostProvider("test-subscription-id")).toThrow(
        "Azure credentials not found in environment variables",
      )

      // Restore original value
      process.env.AZURE_TENANT_ID = originalTenantId
    })

    it("should create instance with valid credentials", () => {
      const provider = new AzureCostProvider("test-subscription-id")
      expect(provider.name).toBe("Azure Cost Management")
    })
  })

  describe("validateCredentials", () => {
    it("should return true for valid credentials", async () => {
      mockClient.query.usage.mockResolvedValueOnce({
        rows: [[20250101, 100]],
      })

      const result = await provider.validateCredentials()
      expect(result).toBe(true)
      expect(mockClient.query.usage).toHaveBeenCalledWith(
        "/subscriptions/test-subscription-id",
        expect.objectContaining({
          type: "Usage",
          timeframe: "Custom",
        }),
      )
    })

    it("should return false for authentication errors", async () => {
      mockClient.query.usage.mockRejectedValueOnce(new Error("InvalidAuthenticationToken"))

      const result = await provider.validateCredentials()
      expect(result).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Invalid Azure credentials or subscription not found",
      )
    })

    it("should return false for subscription not found", async () => {
      mockClient.query.usage.mockRejectedValueOnce(new Error("SubscriptionNotFound"))

      const result = await provider.validateCredentials()
      expect(result).toBe(false)
    })

    it("should throw for non-authentication errors", async () => {
      mockClient.query.usage.mockRejectedValueOnce(new Error("Network error"))

      await expect(provider.validateCredentials()).rejects.toThrow("Network error")
    })
  })

  describe("fetchCosts", () => {
    it("should fetch costs without grouping", async () => {
      mockClient.query.usage.mockResolvedValueOnce({
        rows: [
          [20250101, 100],
          [20250102, 150],
        ],
        properties: {
          columns: [
            { name: "Date", type: "DateTime" },
            { name: "Cost", type: "Currency" },
          ],
        },
      })

      const result = await provider.fetchCosts({
        startDate: "2025-01-01",
        endDate: "2025-01-02",
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        date: "2025-01-01",
        service: "Total",
        amount: 100,
        currency: "USD",
      })
      expect(result[1]).toEqual({
        date: "2025-01-02",
        service: "Total",
        amount: 150,
        currency: "USD",
      })
    })

    it("should fetch costs with service grouping", async () => {
      mockClient.query.usage.mockResolvedValueOnce({
        rows: [
          [20250101, "Virtual Machines", 50],
          [20250101, "Storage", 30],
          [20250102, "Virtual Machines", 60],
          [20250102, "Storage", 40],
        ],
        properties: {
          columns: [
            { name: "Date", type: "DateTime" },
            { name: "ServiceName", type: "String" },
            { name: "Cost", type: "Currency" },
          ],
        },
      })

      const result = await provider.fetchCosts({
        startDate: "2025-01-01",
        endDate: "2025-01-02",
        groupBy: "SERVICE",
      })

      expect(result).toHaveLength(4)
      expect(result[0]).toEqual({
        date: "2025-01-01",
        service: "Virtual Machines",
        amount: 50,
        currency: "USD",
      })
      expect(result[2]).toEqual({
        date: "2025-01-02",
        service: "Virtual Machines",
        amount: 60,
        currency: "USD",
      })
    })

    it("should handle empty results", async () => {
      mockClient.query.usage.mockResolvedValueOnce({
        rows: [],
      })

      const result = await provider.fetchCosts({
        startDate: "2025-01-01",
        endDate: "2025-01-02",
      })

      expect(result).toEqual([])
    })

    it("should retry on retriable errors", async () => {
      mockClient.query.usage
        .mockRejectedValueOnce(new Error("TooManyRequests"))
        .mockResolvedValueOnce({
          rows: [[20250101, 100]],
          properties: {
            columns: [
              { name: "Date", type: "DateTime" },
              { name: "Cost", type: "Currency" },
            ],
          },
        })

      const result = await provider.fetchCosts({
        startDate: "2025-01-01",
        endDate: "2025-01-01",
      })

      expect(mockClient.query.usage).toHaveBeenCalledTimes(2)
      expect(result).toHaveLength(1)
    })

    it("should fail after max retries", async () => {
      mockClient.query.usage.mockRejectedValue(new Error("ServiceUnavailable"))

      await expect(
        provider.fetchCosts({
          startDate: "2025-01-01",
          endDate: "2025-01-02",
        }),
      ).rejects.toThrow("ServiceUnavailable")

      expect(mockClient.query.usage).toHaveBeenCalledTimes(3)
    })

    it("should handle null service names", async () => {
      mockClient.query.usage.mockResolvedValueOnce({
        rows: [[20250101, null, 100]],
        properties: {
          columns: [
            { name: "Date", type: "DateTime" },
            { name: "ServiceName", type: "String" },
            { name: "Cost", type: "Currency" },
          ],
        },
      })

      const result = await provider.fetchCosts({
        startDate: "2025-01-01",
        endDate: "2025-01-01",
        groupBy: "SERVICE",
      })

      expect(result[0].service).toBe("Unknown")
    })
  })

  describe("date formatting", () => {
    it("should correctly format date numbers", async () => {
      mockClient.query.usage.mockResolvedValueOnce({
        rows: [
          [20250115, 100],
          [20251231, 150],
        ],
        properties: {
          columns: [
            { name: "Date", type: "DateTime" },
            { name: "Cost", type: "Currency" },
          ],
        },
      })

      const result = await provider.fetchCosts({
        startDate: "2025-01-15",
        endDate: "2025-12-31",
      })

      expect(result[0].date).toBe("2025-01-15")
      expect(result[1].date).toBe("2025-12-31")
    })
  })

  describe("grouping options", () => {
    it("should support region grouping", async () => {
      mockClient.query.usage.mockResolvedValueOnce({
        rows: [[20250101, "East US", 100]],
        properties: {
          columns: [
            { name: "Date", type: "DateTime" },
            { name: "ResourceLocation", type: "String" },
            { name: "Cost", type: "Currency" },
          ],
        },
      })

      const result = await provider.fetchCosts({
        startDate: "2025-01-01",
        endDate: "2025-01-01",
        groupBy: "REGION",
      })

      expect(result[0].service).toBe("East US")
    })

    it("should support resource group grouping", async () => {
      mockClient.query.usage.mockResolvedValueOnce({
        rows: [[20250101, "my-resource-group", 100]],
        properties: {
          columns: [
            { name: "Date", type: "DateTime" },
            { name: "ResourceGroupName", type: "String" },
            { name: "Cost", type: "Currency" },
          ],
        },
      })

      const result = await provider.fetchCosts({
        startDate: "2025-01-01",
        endDate: "2025-01-01",
        groupBy: "RESOURCE_GROUP",
      })

      expect(result[0].service).toBe("my-resource-group")
    })
  })
})
