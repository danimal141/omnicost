import {
  CostExplorerClient,
  GetCostAndUsageCommand,
  type GetCostAndUsageCommandOutput,
} from "@aws-sdk/client-cost-explorer"
import type { CostData, CostProvider, FetchParams } from "../../types/index.js"

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

export class AWSCostProvider implements CostProvider {
  name = "AWS Cost Explorer"
  private client: CostExplorerClient

  constructor() {
    this.client = new CostExplorerClient({
      region: process.env.AWS_REGION || "us-east-1",
    })
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const command = new GetCostAndUsageCommand({
        TimePeriod: {
          Start: new Date().toISOString().split("T")[0],
          End: new Date().toISOString().split("T")[0],
        },
        Granularity: "DAILY",
        Metrics: ["UnblendedCost"],
      })
      await this.executeWithRetry(command)
      return true
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.name === "UnrecognizedClientException" ||
          error.name === "CredentialsError" ||
          error.message.includes("Could not load credentials")
        ) {
          console.error("Invalid AWS credentials")
          return false
        }
      }
      throw error
    }
  }

  async fetchCosts(params: FetchParams): Promise<CostData[]> {
    const results: CostData[] = []
    let nextPageToken: string | undefined

    do {
      const command = new GetCostAndUsageCommand({
        TimePeriod: {
          Start: params.startDate,
          End: params.endDate,
        },
        Granularity: "DAILY",
        Metrics: ["UnblendedCost"],
        GroupBy: params.groupBy
          ? [
              {
                Type: "DIMENSION",
                Key: this.mapGroupByToAWSDimension(params.groupBy),
              },
            ]
          : undefined,
        NextPageToken: nextPageToken,
      })

      const response = await this.executeWithRetry<GetCostAndUsageCommandOutput>(command)
      nextPageToken = response.NextPageToken

      if (response.ResultsByTime) {
        for (const timeResult of response.ResultsByTime) {
          const date = timeResult.TimePeriod?.Start || params.startDate

          if (timeResult.Groups && timeResult.Groups.length > 0) {
            for (const group of timeResult.Groups) {
              const service = group.Keys?.[0] || "Unknown"
              const amount = Number.parseFloat(group.Metrics?.UnblendedCost?.Amount || "0")
              const currency = group.Metrics?.UnblendedCost?.Unit || "USD"

              results.push({
                date,
                service,
                amount,
                currency,
              })
            }
          } else {
            const amount = Number.parseFloat(timeResult.Total?.UnblendedCost?.Amount || "0")
            const currency = timeResult.Total?.UnblendedCost?.Unit || "USD"

            results.push({
              date,
              service: "Total",
              amount,
              currency,
            })
          }
        }
      }
    } while (nextPageToken)

    return results
  }

  private mapGroupByToAWSDimension(groupBy: string): string {
    const mappings: Record<string, string> = {
      SERVICE: "SERVICE",
      ACCOUNT: "LINKED_ACCOUNT",
      REGION: "REGION",
      TAG: "TAG",
    }
    return mappings[groupBy] || "SERVICE"
  }

  private async executeWithRetry<T>(command: GetCostAndUsageCommand): Promise<T> {
    let lastError: Error | undefined

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return (await this.client.send(command)) as T
      } catch (error) {
        lastError = error as Error

        if (this.isRetriableError(error) && attempt < MAX_RETRIES) {
          console.warn(`AWS API request failed (attempt ${attempt}/${MAX_RETRIES}), retrying...`)
          await this.delay(RETRY_DELAY_MS * attempt)
        } else {
          break
        }
      }
    }

    throw lastError || new Error("Failed to execute AWS API request")
  }

  private isRetriableError(error: unknown): boolean {
    if (!(error instanceof Error)) return false

    const retriableErrors = [
      "ThrottlingException",
      "TooManyRequestsException",
      "ServiceUnavailable",
      "RequestTimeout",
      "RequestTimeoutException",
      "NetworkingError",
    ]

    return (
      retriableErrors.some((name) => error.name === name) ||
      error.message.includes("timeout") ||
      error.message.includes("ECONNREFUSED")
    )
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
