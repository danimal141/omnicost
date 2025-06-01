import { BigQuery } from "@google-cloud/bigquery"
import type { CostData, CostProvider, FetchParams } from "../../types/index.js"

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

interface BigQueryCostRow {
  date: string
  service: string
  amount: string
  currency: string
  labels: string
}

export class GCPCostProvider implements CostProvider {
  name = "GCP BigQuery Billing Export"
  private bigquery: BigQuery
  private projectId: string
  private dataset: string

  constructor(projectId: string, dataset: string) {
    this.projectId = projectId
    this.dataset = dataset
    this.bigquery = new BigQuery({ projectId })
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const query = `
        SELECT 1
        FROM \`${this.projectId}.${this.dataset}.gcp_billing_export_v1_*\`
        LIMIT 1
      `
      await this.executeQueryWithRetry(query)
      return true
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message.includes("Not found") ||
          error.message.includes("Permission denied") ||
          error.message.includes("Could not load the default credentials")
        ) {
          console.error("Invalid GCP credentials or dataset not found")
          return false
        }
      }
      throw error
    }
  }

  async fetchCosts(params: FetchParams): Promise<CostData[]> {
    const query = this.buildQuery(params)
    const rows = await this.executeQueryWithRetry(query)

    return rows.map((row) => ({
      date: row.date,
      service: row.service || "Unknown",
      amount: Number.parseFloat(row.amount || "0"),
      currency: row.currency || "USD",
      tags: row.labels ? JSON.parse(row.labels) : {},
    }))
  }

  private buildQuery(params: FetchParams): string {
    const groupByColumn = this.mapGroupByToGCPColumn(params.groupBy)
    const groupByClause = groupByColumn ? `, ${groupByColumn} as service` : ", 'Total' as service"
    const groupByAggregation = groupByColumn ? `${groupByColumn}, ` : ""

    return `
      SELECT
        DATE(usage_start_time) as date${groupByClause},
        SUM(cost) as amount,
        currency,
        TO_JSON_STRING(labels) as labels
      FROM \`${this.projectId}.${this.dataset}.gcp_billing_export_v1_*\`
      WHERE DATE(usage_start_time) >= '${params.startDate}'
        AND DATE(usage_start_time) <= '${params.endDate}'
      GROUP BY ${groupByAggregation}date, currency, labels
      ORDER BY date, service
    `
  }

  private mapGroupByToGCPColumn(groupBy?: string): string | null {
    if (!groupBy) return null

    const mappings: Record<string, string> = {
      SERVICE: "service.description",
      PROJECT: "project.id",
      REGION: "location.location",
      SKU: "sku.description",
    }
    return mappings[groupBy] || null
  }

  private async executeQueryWithRetry(query: string): Promise<BigQueryCostRow[]> {
    let lastError: Error | undefined

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const [job] = await this.bigquery.createQueryJob({ query })
        const [rows] = await job.getQueryResults()
        return rows
      } catch (error) {
        lastError = error as Error

        if (this.isRetriableError(error) && attempt < MAX_RETRIES) {
          console.warn(
            `GCP BigQuery request failed (attempt ${attempt}/${MAX_RETRIES}), retrying...`,
          )
          await this.delay(RETRY_DELAY_MS * attempt)
        } else {
          break
        }
      }
    }

    throw lastError || new Error("Failed to execute GCP BigQuery request")
  }

  private isRetriableError(error: unknown): boolean {
    if (!(error instanceof Error)) return false

    const retriablePatterns = [
      "rateLimitExceeded",
      "backendError",
      "internalError",
      "timeout",
      "ECONNREFUSED",
      "ETIMEDOUT",
      "ENOTFOUND",
      "503",
      "500",
    ]

    return retriablePatterns.some((pattern) =>
      error.message.toLowerCase().includes(pattern.toLowerCase()),
    )
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
