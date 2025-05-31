export interface FetchParams {
  startDate: string
  endDate: string
  groupBy?: GroupByDimension
  filters?: Record<string, string>
}

export interface CostData {
  date: string
  service: string
  amount: number
  currency: string
  tags?: Record<string, string>
  region?: string
  account?: string
}

export interface CostProvider {
  name: string
  fetchCosts(params: FetchParams): Promise<CostData[]>
  validateCredentials(): Promise<boolean>
}

export type GroupByDimension = 'SERVICE' | 'TAG' | 'REGION' | 'ACCOUNT'

export type OutputFormat = 'tsv' | 'csv' | 'markdown'

export interface CLIOptions {
  start: string
  end: string
  groupBy?: GroupByDimension
  format?: OutputFormat
  sheet?: string
  quiet?: boolean
}