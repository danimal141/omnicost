import { client, v1 } from "@datadog/datadog-api-client"
import type { CostData, CostProvider, FetchParams } from "../../types/index.js"

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

export class DatadogCostProvider implements CostProvider {
  name = "Datadog Usage"
  private api: v1.UsageMeteringApi

  constructor() {
    const configuration = client.createConfiguration({
      authMethods: {
        apiKeyAuth: process.env.DD_API_KEY || process.env.DATADOG_API_KEY || "",
        appKeyAuth: process.env.DD_APP_KEY || process.env.DATADOG_APP_KEY || "",
      },
    })
    this.api = new v1.UsageMeteringApi(configuration)
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const endMonth = new Date()
      const startMonth = new Date()
      startMonth.setMonth(startMonth.getMonth() - 1)

      await this.api.getUsageSummary({
        startMonth,
        endMonth,
      })
      return true
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("403") || error.message.includes("401")) {
          console.error("Invalid Datadog credentials")
          return false
        }
      }
      throw error
    }
  }

  async fetchCosts(params: FetchParams): Promise<CostData[]> {
    const results: CostData[] = []

    try {
      const response = await this.executeWithRetry(async () => {
        const startDate = new Date(params.startDate)
        const endDate = new Date(params.endDate)

        if (params.groupBy) {
          // Use attribution API for grouped data
          const startMonth = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}`
          const endMonth = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}`

          return await this.api.getMonthlyUsageAttribution({
            startMonth: new Date(startMonth),
            endMonth: new Date(endMonth),
            fields: params.groupBy.toLowerCase() as v1.MonthlyUsageAttributionSupportedMetrics,
          })
        }

        // Use summary API for total costs
        return await this.api.getUsageSummary({
          startMonth: startDate,
          endMonth: endDate,
          includeOrgDetails: true,
        })
      })

      // Check the type of response we got
      if (!response) {
        throw new Error("No response from Datadog API")
      }

      if (params.groupBy && "usage" in response) {
        // Process attribution response
        const attributionResponse = response as v1.MonthlyUsageAttributionResponse
        for (const item of attributionResponse.usage || []) {
          const monthlyUsage = item as v1.MonthlyUsageAttributionBody
          if (monthlyUsage.values) {
            const values = Object.values(monthlyUsage.values)
            for (const value of values) {
              const cost = this.calculateCost(value)
              if (cost > 0) {
                results.push({
                  date:
                    (monthlyUsage.month instanceof Date
                      ? monthlyUsage.month.toISOString().split("T")[0]
                      : monthlyUsage.month) || new Date().toISOString().split("T")[0],
                  service: "Datadog Usage",
                  amount: cost,
                  currency: "USD",
                  tags: this.extractTags(monthlyUsage, params.groupBy),
                })
              }
            }
          }
        }
      } else if ("usage" in response) {
        // Process summary response - usage is always an array for UsageSummaryResponse
        const summaryResponse = response as v1.UsageSummaryResponse
        for (const summary of summaryResponse.usage || []) {
          const date =
            (summary.date instanceof Date
              ? summary.date.toISOString().split("T")[0]
              : summary.date) || new Date().toISOString().split("T")[0]

          // Extract costs from various usage types - check each property existence
          const usageTypes: Array<{ name: string; value: number | undefined }> = []

          if ("apmHostTop99p" in summary && summary.apmHostTop99p) {
            usageTypes.push({ name: "APM Hosts", value: summary.apmHostTop99p })
          }
          if ("ingestedEventsBytesSum" in summary && summary.ingestedEventsBytesSum) {
            usageTypes.push({ name: "APM Traces", value: summary.ingestedEventsBytesSum })
          }
          if ("indexedEventsCountSum" in summary && summary.indexedEventsCountSum) {
            usageTypes.push({ name: "Logs", value: summary.indexedEventsCountSum })
          }
          if ("infraHostTop99p" in summary && summary.infraHostTop99p) {
            usageTypes.push({ name: "Infrastructure Hosts", value: summary.infraHostTop99p })
          }
          if ("syntheticsCheckCallsCountSum" in summary && summary.syntheticsCheckCallsCountSum) {
            usageTypes.push({ name: "Synthetics", value: summary.syntheticsCheckCallsCountSum })
          }
          if ("rumTotalSessionCountSum" in summary && summary.rumTotalSessionCountSum) {
            usageTypes.push({ name: "RUM Sessions", value: summary.rumTotalSessionCountSum })
          }

          for (const usage of usageTypes) {
            if (usage.value && usage.value > 0) {
              results.push({
                date,
                service: usage.name,
                amount: usage.value,
                currency: "USD",
              })
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch Datadog usage data: ${error.message}`)
      }
      throw error
    }

    return results
  }

  private async executeWithRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
    try {
      return await fn()
    } catch (error) {
      if (retries > 1 && error instanceof Error) {
        if (
          error.message.includes("429") ||
          error.message.includes("503") ||
          error.message.includes("ECONNRESET")
        ) {
          const delay = RETRY_DELAY_MS * (MAX_RETRIES - retries + 1)
          console.warn(`Request failed, retrying in ${delay}ms... (${retries - 1} retries left)`)
          await new Promise((resolve) => setTimeout(resolve, delay))
          return this.executeWithRetry(fn, retries - 1)
        }
      }
      throw error
    }
  }

  private calculateCost(value: v1.MonthlyUsageAttributionValues): number {
    // Datadog API returns usage counts, not direct costs
    // In a real implementation, you would need to apply pricing based on your contract
    // For now, we'll return the usage value as a placeholder
    // Check if value has a usage property (for testing compatibility)
    if ("usage" in value && typeof value.usage === "number") {
      return value.usage
    }
    // Otherwise try to get the first numeric value
    const firstValue = Object.values(value)[0]
    if (typeof firstValue === "string" || typeof firstValue === "number") {
      return Number.parseFloat(String(firstValue)) || 0
    }
    return 0
  }

  private extractTags(
    item: v1.MonthlyUsageAttributionBody,
    groupBy?: string,
  ): Record<string, string> | undefined {
    if (!groupBy || !item.tags) return undefined

    const tags: Record<string, string> = {}
    if (Array.isArray(item.tags)) {
      for (const tag of item.tags) {
        const [key, value] = tag.split(":")
        if (key && value) {
          tags[key] = value
        }
      }
    }

    return Object.keys(tags).length > 0 ? tags : undefined
  }
}
