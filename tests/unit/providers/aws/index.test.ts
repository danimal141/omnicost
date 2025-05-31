import { beforeEach, describe, expect, it, vi } from "vitest"
import { AWSCostProvider } from "../../../../src/providers/aws/index.js"
import type { FetchParams } from "../../../../src/types/index.js"

// Mock AWS SDK
vi.mock("@aws-sdk/client-cost-explorer", () => ({
  CostExplorerClient: vi.fn().mockImplementation(() => ({
    send: vi.fn(),
  })),
  GetCostAndUsageCommand: vi.fn(),
}))

describe("AWS Cost Provider", () => {
  let provider: AWSCostProvider

  beforeEach(() => {
    vi.clearAllMocks()
    provider = new AWSCostProvider()
  })

  describe("fetchCosts", () => {
    it("should fetch costs successfully with grouping", async () => {
      const mockResponse = {
        ResultsByTime: [
          {
            TimePeriod: { Start: "2025-04-01", End: "2025-04-02" },
            Groups: [
              {
                Keys: ["Amazon EC2"],
                Metrics: {
                  UnblendedCost: {
                    Amount: "150.25",
                    Unit: "USD",
                  },
                },
              },
              {
                Keys: ["Amazon S3"],
                Metrics: {
                  UnblendedCost: {
                    Amount: "75.50",
                    Unit: "USD",
                  },
                },
              },
            ],
          },
        ],
      }

      const { CostExplorerClient } = await import("@aws-sdk/client-cost-explorer")
      const mockSend = vi.fn().mockResolvedValue(mockResponse)
      vi.mocked(CostExplorerClient).mockImplementation(
        () =>
          ({
            send: mockSend,
          }) as any,
      )

      provider = new AWSCostProvider()

      const params: FetchParams = {
        startDate: "2025-04-01",
        endDate: "2025-04-30",
        groupBy: "SERVICE",
      }

      const result = await provider.fetchCosts(params)

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        date: "2025-04-01",
        service: "Amazon EC2",
        amount: 150.25,
        currency: "USD",
      })
      expect(result[1]).toMatchObject({
        date: "2025-04-01",
        service: "Amazon S3",
        amount: 75.5,
        currency: "USD",
      })
    })

    it("should handle empty results", async () => {
      const mockResponse = {
        ResultsByTime: [],
      }

      const { CostExplorerClient } = await import("@aws-sdk/client-cost-explorer")
      const mockSend = vi.fn().mockResolvedValue(mockResponse)
      vi.mocked(CostExplorerClient).mockImplementation(
        () =>
          ({
            send: mockSend,
          }) as any,
      )

      provider = new AWSCostProvider()

      const params: FetchParams = {
        startDate: "2025-04-01",
        endDate: "2025-04-30",
        groupBy: "SERVICE",
      }

      const result = await provider.fetchCosts(params)
      expect(result).toEqual([])
    })

    it("should handle results without grouping", async () => {
      const mockResponse = {
        ResultsByTime: [
          {
            TimePeriod: { Start: "2025-04-01", End: "2025-04-02" },
            Total: {
              UnblendedCost: {
                Amount: "225.75",
                Unit: "USD",
              },
            },
          },
        ],
      }

      const { CostExplorerClient } = await import("@aws-sdk/client-cost-explorer")
      const mockSend = vi.fn().mockResolvedValue(mockResponse)
      vi.mocked(CostExplorerClient).mockImplementation(
        () =>
          ({
            send: mockSend,
          }) as any,
      )

      provider = new AWSCostProvider()

      const params: FetchParams = {
        startDate: "2025-04-01",
        endDate: "2025-04-30",
      }

      const result = await provider.fetchCosts(params)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        date: "2025-04-01",
        service: "Total",
        amount: 225.75,
        currency: "USD",
      })
    })

    it("should handle pagination", async () => {
      const mockResponsePage1 = {
        ResultsByTime: [
          {
            TimePeriod: { Start: "2025-04-01", End: "2025-04-02" },
            Groups: [
              {
                Keys: ["Amazon EC2"],
                Metrics: { UnblendedCost: { Amount: "100.00", Unit: "USD" } },
              },
            ],
          },
        ],
        NextPageToken: "page2",
      }

      const mockResponsePage2 = {
        ResultsByTime: [
          {
            TimePeriod: { Start: "2025-04-02", End: "2025-04-03" },
            Groups: [
              {
                Keys: ["Amazon S3"],
                Metrics: { UnblendedCost: { Amount: "50.00", Unit: "USD" } },
              },
            ],
          },
        ],
      }

      const { CostExplorerClient } = await import("@aws-sdk/client-cost-explorer")
      const mockSend = vi
        .fn()
        .mockResolvedValueOnce(mockResponsePage1)
        .mockResolvedValueOnce(mockResponsePage2)

      vi.mocked(CostExplorerClient).mockImplementation(
        () =>
          ({
            send: mockSend,
          }) as any,
      )

      provider = new AWSCostProvider()

      const params: FetchParams = {
        startDate: "2025-04-01",
        endDate: "2025-04-30",
        groupBy: "SERVICE",
      }

      const result = await provider.fetchCosts(params)

      expect(mockSend).toHaveBeenCalledTimes(2)
      expect(result).toHaveLength(2)
      expect(result[0].service).toBe("Amazon EC2")
      expect(result[1].service).toBe("Amazon S3")
    })
  })

  describe("validateCredentials", () => {
    it("should validate credentials successfully", async () => {
      const { CostExplorerClient } = await import("@aws-sdk/client-cost-explorer")
      const mockSend = vi.fn().mockResolvedValue({})
      vi.mocked(CostExplorerClient).mockImplementation(
        () =>
          ({
            send: mockSend,
          }) as any,
      )

      provider = new AWSCostProvider()
      const result = await provider.validateCredentials()

      expect(result).toBe(true)
      expect(mockSend).toHaveBeenCalled()
    })

    it("should return false for invalid credentials", async () => {
      const { CostExplorerClient } = await import("@aws-sdk/client-cost-explorer")
      const mockError = new Error("Invalid credentials")
      mockError.name = "UnrecognizedClientException"
      const mockSend = vi.fn().mockRejectedValue(mockError)
      vi.mocked(CostExplorerClient).mockImplementation(
        () =>
          ({
            send: mockSend,
          }) as any,
      )

      provider = new AWSCostProvider()
      const result = await provider.validateCredentials()

      expect(result).toBe(false)
    })

    it("should throw error for other failures", async () => {
      const { CostExplorerClient } = await import("@aws-sdk/client-cost-explorer")
      const mockError = new Error("Network error")
      const mockSend = vi.fn().mockRejectedValue(mockError)
      vi.mocked(CostExplorerClient).mockImplementation(
        () =>
          ({
            send: mockSend,
          }) as any,
      )

      provider = new AWSCostProvider()

      await expect(provider.validateCredentials()).rejects.toThrow("Network error")
    })
  })

  describe("error handling", () => {
    it("should retry on throttling errors", async () => {
      const mockResponse = {
        ResultsByTime: [
          {
            TimePeriod: { Start: "2025-04-01", End: "2025-04-02" },
            Total: { UnblendedCost: { Amount: "100.00", Unit: "USD" } },
          },
        ],
      }

      const { CostExplorerClient } = await import("@aws-sdk/client-cost-explorer")
      const throttleError = new Error("Too many requests")
      throttleError.name = "ThrottlingException"

      const mockSend = vi
        .fn()
        .mockRejectedValueOnce(throttleError)
        .mockResolvedValueOnce(mockResponse)

      vi.mocked(CostExplorerClient).mockImplementation(
        () =>
          ({
            send: mockSend,
          }) as any,
      )

      provider = new AWSCostProvider()

      const params: FetchParams = {
        startDate: "2025-04-01",
        endDate: "2025-04-30",
      }

      const result = await provider.fetchCosts(params)

      expect(mockSend).toHaveBeenCalledTimes(2)
      expect(result).toHaveLength(1)
      expect(result[0].amount).toBe(100.0)
    })

    it("should fail after max retries", async () => {
      const { CostExplorerClient } = await import("@aws-sdk/client-cost-explorer")
      const throttleError = new Error("Too many requests")
      throttleError.name = "ThrottlingException"

      const mockSend = vi.fn().mockRejectedValue(throttleError)

      vi.mocked(CostExplorerClient).mockImplementation(
        () =>
          ({
            send: mockSend,
          }) as any,
      )

      provider = new AWSCostProvider()

      const params: FetchParams = {
        startDate: "2025-04-01",
        endDate: "2025-04-30",
      }

      await expect(provider.fetchCosts(params)).rejects.toThrow("Too many requests")
      expect(mockSend).toHaveBeenCalledTimes(3) // MAX_RETRIES = 3
    })
  })
})
