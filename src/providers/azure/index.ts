import {
  CostManagementClient,
  type QueryDefinition,
  type QueryResult,
} from "@azure/arm-costmanagement"
import { ClientSecretCredential } from "@azure/identity"
import type { CostData, CostProvider, FetchParams } from "../../types/index.js"

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

export class AzureCostProvider implements CostProvider {
  name = "Azure Cost Management"
  private client: CostManagementClient
  private credential: ClientSecretCredential
  private subscriptionId: string

  constructor(subscriptionId: string) {
    this.subscriptionId = subscriptionId

    const tenantId = process.env.AZURE_TENANT_ID
    const clientId = process.env.AZURE_CLIENT_ID
    const clientSecret = process.env.AZURE_CLIENT_SECRET

    if (!tenantId || !clientId || !clientSecret) {
      throw new Error("Azure credentials not found in environment variables")
    }

    this.credential = new ClientSecretCredential(tenantId, clientId, clientSecret)
    this.client = new CostManagementClient(this.credential)
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const scope = `/subscriptions/${this.subscriptionId}`
      const queryDefinition: QueryDefinition = {
        type: "Usage",
        timeframe: "Custom",
        timePeriod: {
          from: new Date(new Date().setDate(new Date().getDate() - 1)),
          to: new Date(),
        },
        dataset: {
          granularity: "Daily",
          aggregation: {
            totalCost: {
              name: "Cost",
              function: "Sum",
            },
          },
        },
      }

      await this.executeQueryWithRetry(scope, queryDefinition)
      return true
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message.includes("AuthenticationError") ||
          error.message.includes("InvalidAuthenticationToken") ||
          error.message.includes("UnauthorizedRequestError") ||
          error.message.includes("SubscriptionNotFound")
        ) {
          console.error("Invalid Azure credentials or subscription not found")
          return false
        }
      }
      throw error
    }
  }

  async fetchCosts(params: FetchParams): Promise<CostData[]> {
    const scope = `/subscriptions/${this.subscriptionId}`
    const results: CostData[] = []

    const queryDefinition: QueryDefinition = {
      type: "Usage",
      timeframe: "Custom",
      timePeriod: {
        from: new Date(params.startDate),
        to: new Date(params.endDate),
      },
      dataset: {
        granularity: "Daily",
        aggregation: {
          totalCost: {
            name: "Cost",
            function: "Sum",
          },
          totalCostUSD: {
            name: "CostUSD",
            function: "Sum",
          },
        },
        grouping: this.getGroupingDefinition(params.groupBy),
      },
    }

    const response = await this.executeQueryWithRetry(scope, queryDefinition)

    if (response.rows) {
      for (const row of response.rows) {
        const date = this.formatDate(row[0] as number)
        const service = params.groupBy ? (row[1] as string) || "Unknown" : "Total"
        const amount = row[params.groupBy ? 2 : 1] as number
        const currency = "USD" // Azure Cost Management API returns costs in USD by default

        results.push({
          date,
          service,
          amount,
          currency,
        })
      }
    }

    return results
  }

  private getGroupingDefinition(groupBy?: string) {
    if (!groupBy) return undefined

    const mappings: Record<string, string> = {
      SERVICE: "ServiceName",
      REGION: "ResourceLocation",
      RESOURCE_GROUP: "ResourceGroupName",
      TAG: "Tags",
    }

    const dimension = mappings[groupBy]
    if (!dimension) return undefined

    return [
      {
        type: "Dimension",
        name: dimension,
      },
    ]
  }

  private formatDate(dateNumber: number): string {
    const dateStr = dateNumber.toString()
    const year = dateStr.substring(0, 4)
    const month = dateStr.substring(4, 6)
    const day = dateStr.substring(6, 8)
    return `${year}-${month}-${day}`
  }

  private async executeQueryWithRetry(
    scope: string,
    queryDefinition: QueryDefinition,
  ): Promise<QueryResult> {
    let lastError: Error | undefined

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await this.client.query.usage(scope, queryDefinition)
        return response
      } catch (error) {
        lastError = error as Error

        if (this.isRetriableError(error) && attempt < MAX_RETRIES) {
          console.warn(`Azure API request failed (attempt ${attempt}/${MAX_RETRIES}), retrying...`)
          await this.delay(RETRY_DELAY_MS * attempt)
        } else {
          break
        }
      }
    }

    throw lastError || new Error("Failed to execute Azure API request")
  }

  private isRetriableError(error: unknown): boolean {
    if (!(error instanceof Error)) return false

    const retriablePatterns = [
      "TooManyRequests",
      "RequestTimeout",
      "ServiceUnavailable",
      "GatewayTimeout",
      "NetworkError",
      "ECONNREFUSED",
      "ETIMEDOUT",
      "ENOTFOUND",
      "503",
      "504",
      "429",
    ]

    return retriablePatterns.some((pattern) =>
      error.message.toLowerCase().includes(pattern.toLowerCase()),
    )
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
