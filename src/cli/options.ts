import type { Command } from "commander"
import type { GroupByDimension, OutputFormat } from "../types/index.js"

export function addCommonOptions(command: Command): Command {
  return command
    .requiredOption("-s, --start <date>", "Start date (YYYY-MM-DD)")
    .requiredOption("-e, --end <date>", "End date (YYYY-MM-DD)")
    .option(
      "-g, --group-by <dimension>",
      "Group by dimension (SERVICE, TAG, REGION, ACCOUNT)",
      "SERVICE",
    )
    .option("-f, --format <format>", "Output format (tsv, csv, markdown)", "tsv")
    .option("--sheet <url>", "Google Sheets URL for direct write")
    .option("-q, --quiet", "Suppress progress output", false)
}

export function validateDates(start: string, end: string): void {
  const startDate = new Date(start)
  const endDate = new Date(end)

  if (Number.isNaN(startDate.getTime())) {
    throw new Error(`Invalid start date: ${start}`)
  }

  if (Number.isNaN(endDate.getTime())) {
    throw new Error(`Invalid end date: ${end}`)
  }

  if (startDate > endDate) {
    throw new Error("Start date must be before end date")
  }
}

export function validateGroupBy(groupBy: string): GroupByDimension {
  const validDimensions: GroupByDimension[] = [
    "SERVICE",
    "TAG",
    "REGION",
    "ACCOUNT",
    "RESOURCE_GROUP",
  ]
  const upperGroupBy = groupBy.toUpperCase() as GroupByDimension

  if (!validDimensions.includes(upperGroupBy)) {
    throw new Error(
      `Invalid group-by dimension: ${groupBy}. Valid options: ${validDimensions.join(", ")}`,
    )
  }

  return upperGroupBy
}

export function validateFormat(format: string): OutputFormat {
  const validFormats: OutputFormat[] = ["tsv", "csv", "markdown"]
  const lowerFormat = format.toLowerCase() as OutputFormat

  if (!validFormats.includes(lowerFormat)) {
    throw new Error(`Invalid format: ${format}. Valid options: ${validFormats.join(", ")}`)
  }

  return lowerFormat
}

export interface ParsedOptions {
  start: string
  end: string
  groupBy?: GroupByDimension
  format?: OutputFormat
  sheet?: string
  quiet?: boolean
}

export function parseOptions(options: Record<string, unknown>): ParsedOptions {
  const start = options.start as string
  const end = options.end as string
  validateDates(start, end)

  return {
    start,
    end,
    groupBy: options.groupBy ? validateGroupBy(options.groupBy as string) : undefined,
    format: options.format ? validateFormat(options.format as string) : undefined,
    sheet: options.sheet as string | undefined,
    quiet: options.quiet as boolean | undefined,
  }
}
