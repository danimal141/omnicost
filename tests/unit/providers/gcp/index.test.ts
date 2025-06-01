import { beforeEach, describe, expect, it, vi } from "vitest"
import { GCPCostProvider } from "../../../../src/providers/gcp/index.js"
import type { FetchParams } from "../../../../src/types/index.js"

// Mock Google Cloud BigQuery
vi.mock("@google-cloud/bigquery", () => ({
  BigQuery: vi.fn().mockImplementation(() => ({
    createQueryJob: vi.fn(),
  })),
}))

describe("GCP Cost Provider", () => {
  let provider: GCPCostProvider
  const mockProjectId = "test-project"
  const mockDataset = "billing_dataset"

  beforeEach(() => {
    vi.clearAllMocks()
    provider = new GCPCostProvider(mockProjectId, mockDataset)
  })

  describe("fetchCosts", () => {
    it("should fetch costs successfully with grouping", async () => {
      const mockRows = [
        {
          date: "2025-04-01",
          service: "Compute Engine",
          amount: "250.50",
          currency: "USD",
          labels: '{"env":"production","team":"backend"}',
        },
        {
          date: "2025-04-01",
          service: "Cloud Storage",
          amount: "125.25",
          currency: "USD",
          labels: '{"env":"production","team":"data"}',
        },
      ]

      const mockJob = {
        getQueryResults: vi.fn().mockResolvedValue([mockRows]),
      }

      const { BigQuery } = await import("@google-cloud/bigquery")
      const mockCreateQueryJob = vi.fn().mockResolvedValue([mockJob])
      vi.mocked(BigQuery).mockImplementation(
        () =>
          ({
            createQueryJob: mockCreateQueryJob,
          }) as any,
      )

      provider = new GCPCostProvider(mockProjectId, mockDataset)

      const params: FetchParams = {
        startDate: "2025-04-01",
        endDate: "2025-04-30",
        groupBy: "SERVICE",
      }

      const result = await provider.fetchCosts(params)

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        date: "2025-04-01",
        service: "Compute Engine",
        amount: 250.5,
        currency: "USD",
        tags: { env: "production", team: "backend" },
      })
      expect(result[1]).toMatchObject({
        date: "2025-04-01",
        service: "Cloud Storage",
        amount: 125.25,
        currency: "USD",
        tags: { env: "production", team: "data" },
      })
    })

    it("should handle empty results", async () => {
      const mockRows: any[] = []

      const mockJob = {
        getQueryResults: vi.fn().mockResolvedValue([mockRows]),
      }

      const { BigQuery } = await import("@google-cloud/bigquery")
      const mockCreateQueryJob = vi.fn().mockResolvedValue([mockJob])
      vi.mocked(BigQuery).mockImplementation(
        () =>
          ({
            createQueryJob: mockCreateQueryJob,
          }) as any,
      )

      provider = new GCPCostProvider(mockProjectId, mockDataset)

      const params: FetchParams = {
        startDate: "2025-04-01",
        endDate: "2025-04-30",
        groupBy: "SERVICE",
      }

      const result = await provider.fetchCosts(params)
      expect(result).toEqual([])
    })

    it("should handle results without grouping", async () => {
      const mockRows = [
        {
          date: "2025-04-01",
          service: "Total",
          amount: "375.75",
          currency: "USD",
          labels: "{}",
        },
      ]

      const mockJob = {
        getQueryResults: vi.fn().mockResolvedValue([mockRows]),
      }

      const { BigQuery } = await import("@google-cloud/bigquery")
      const mockCreateQueryJob = vi.fn().mockResolvedValue([mockJob])
      vi.mocked(BigQuery).mockImplementation(
        () =>
          ({
            createQueryJob: mockCreateQueryJob,
          }) as any,
      )

      provider = new GCPCostProvider(mockProjectId, mockDataset)

      const params: FetchParams = {
        startDate: "2025-04-01",
        endDate: "2025-04-30",
      }

      const result = await provider.fetchCosts(params)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        date: "2025-04-01",
        service: "Total",
        amount: 375.75,
        currency: "USD",
        tags: {},
      })
    })

    it("should handle different groupBy options", async () => {
      const mockRows = [
        {
          date: "2025-04-01",
          service: "my-project-123",
          amount: "100.00",
          currency: "USD",
          labels: "{}",
        },
      ]

      const mockJob = {
        getQueryResults: vi.fn().mockResolvedValue([mockRows]),
      }

      const { BigQuery } = await import("@google-cloud/bigquery")
      const mockCreateQueryJob = vi.fn().mockResolvedValue([mockJob])
      vi.mocked(BigQuery).mockImplementation(
        () =>
          ({
            createQueryJob: mockCreateQueryJob,
          }) as any,
      )

      provider = new GCPCostProvider(mockProjectId, mockDataset)

      const params: FetchParams = {
        startDate: "2025-04-01",
        endDate: "2025-04-30",
        groupBy: "PROJECT",
      }

      await provider.fetchCosts(params)

      expect(mockCreateQueryJob).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining("project.id as service"),
        }),
      )
    })
  })

  describe("validateCredentials", () => {
    it("should validate credentials successfully", async () => {
      const mockJob = {
        getQueryResults: vi.fn().mockResolvedValue([[]]),
      }

      const { BigQuery } = await import("@google-cloud/bigquery")
      const mockCreateQueryJob = vi.fn().mockResolvedValue([mockJob])
      vi.mocked(BigQuery).mockImplementation(
        () =>
          ({
            createQueryJob: mockCreateQueryJob,
          }) as any,
      )

      provider = new GCPCostProvider(mockProjectId, mockDataset)
      const result = await provider.validateCredentials()

      expect(result).toBe(true)
      expect(mockCreateQueryJob).toHaveBeenCalled()
    })

    it("should return false for dataset not found", async () => {
      const { BigQuery } = await import("@google-cloud/bigquery")
      const mockError = new Error("Not found: Dataset test-project:billing_dataset")
      const mockCreateQueryJob = vi.fn().mockRejectedValue(mockError)
      vi.mocked(BigQuery).mockImplementation(
        () =>
          ({
            createQueryJob: mockCreateQueryJob,
          }) as any,
      )

      provider = new GCPCostProvider(mockProjectId, mockDataset)
      const result = await provider.validateCredentials()

      expect(result).toBe(false)
    })

    it("should return false for permission denied", async () => {
      const { BigQuery } = await import("@google-cloud/bigquery")
      const mockError = new Error("Permission denied on dataset")
      const mockCreateQueryJob = vi.fn().mockRejectedValue(mockError)
      vi.mocked(BigQuery).mockImplementation(
        () =>
          ({
            createQueryJob: mockCreateQueryJob,
          }) as any,
      )

      provider = new GCPCostProvider(mockProjectId, mockDataset)
      const result = await provider.validateCredentials()

      expect(result).toBe(false)
    })

    it("should throw error for other failures", async () => {
      const { BigQuery } = await import("@google-cloud/bigquery")
      const mockError = new Error("Network error")
      const mockCreateQueryJob = vi.fn().mockRejectedValue(mockError)
      vi.mocked(BigQuery).mockImplementation(
        () =>
          ({
            createQueryJob: mockCreateQueryJob,
          }) as any,
      )

      provider = new GCPCostProvider(mockProjectId, mockDataset)

      await expect(provider.validateCredentials()).rejects.toThrow("Network error")
    })
  })

  describe("error handling", () => {
    it("should retry on rate limit errors", async () => {
      const mockRows = [
        {
          date: "2025-04-01",
          service: "Total",
          amount: "100.00",
          currency: "USD",
          labels: "{}",
        },
      ]

      const mockJob = {
        getQueryResults: vi.fn().mockResolvedValue([mockRows]),
      }

      const { BigQuery } = await import("@google-cloud/bigquery")
      const rateLimitError = new Error("rateLimitExceeded: Too many requests")

      const mockCreateQueryJob = vi
        .fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce([mockJob])

      vi.mocked(BigQuery).mockImplementation(
        () =>
          ({
            createQueryJob: mockCreateQueryJob,
          }) as any,
      )

      provider = new GCPCostProvider(mockProjectId, mockDataset)

      const params: FetchParams = {
        startDate: "2025-04-01",
        endDate: "2025-04-30",
      }

      const result = await provider.fetchCosts(params)

      expect(mockCreateQueryJob).toHaveBeenCalledTimes(2)
      expect(result).toHaveLength(1)
      expect(result[0].amount).toBe(100.0)
    })

    it("should fail after max retries", async () => {
      const { BigQuery } = await import("@google-cloud/bigquery")
      const rateLimitError = new Error("rateLimitExceeded: Too many requests")

      const mockCreateQueryJob = vi.fn().mockRejectedValue(rateLimitError)

      vi.mocked(BigQuery).mockImplementation(
        () =>
          ({
            createQueryJob: mockCreateQueryJob,
          }) as any,
      )

      provider = new GCPCostProvider(mockProjectId, mockDataset)

      const params: FetchParams = {
        startDate: "2025-04-01",
        endDate: "2025-04-30",
      }

      await expect(provider.fetchCosts(params)).rejects.toThrow("rateLimitExceeded")
      expect(mockCreateQueryJob).toHaveBeenCalledTimes(3) // MAX_RETRIES = 3
    })

    it("should retry on backend errors", async () => {
      const mockRows = [
        {
          date: "2025-04-01",
          service: "Total",
          amount: "100.00",
          currency: "USD",
          labels: "{}",
        },
      ]

      const mockJob = {
        getQueryResults: vi.fn().mockResolvedValue([mockRows]),
      }

      const { BigQuery } = await import("@google-cloud/bigquery")
      const backendError = new Error("backendError: Internal server error")

      const mockCreateQueryJob = vi
        .fn()
        .mockRejectedValueOnce(backendError)
        .mockResolvedValueOnce([mockJob])

      vi.mocked(BigQuery).mockImplementation(
        () =>
          ({
            createQueryJob: mockCreateQueryJob,
          }) as any,
      )

      provider = new GCPCostProvider(mockProjectId, mockDataset)

      const params: FetchParams = {
        startDate: "2025-04-01",
        endDate: "2025-04-30",
      }

      const result = await provider.fetchCosts(params)

      expect(mockCreateQueryJob).toHaveBeenCalledTimes(2)
      expect(result).toHaveLength(1)
    })
  })
})
