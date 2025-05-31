import { Command } from 'commander'
import type { GroupByDimension, OutputFormat } from '../types'

export function addCommonOptions(command: Command): Command {
  return command
    .requiredOption('-s, --start <date>', 'Start date (YYYY-MM-DD)')
    .requiredOption('-e, --end <date>', 'End date (YYYY-MM-DD)')
    .option('-g, --group-by <dimension>', 'Group by dimension (SERVICE, TAG, REGION, ACCOUNT)', 'SERVICE')
    .option('-f, --format <format>', 'Output format (tsv, csv, markdown)', 'tsv')
    .option('--sheet <url>', 'Google Sheets URL for direct write')
    .option('-q, --quiet', 'Suppress progress output', false)
}

export function validateDates(start: string, end: string): void {
  const startDate = new Date(start)
  const endDate = new Date(end)

  if (isNaN(startDate.getTime())) {
    throw new Error(`Invalid start date: ${start}`)
  }

  if (isNaN(endDate.getTime())) {
    throw new Error(`Invalid end date: ${end}`)
  }

  if (startDate > endDate) {
    throw new Error('Start date must be before end date')
  }
}

export function validateGroupBy(groupBy: string): GroupByDimension {
  const validDimensions: GroupByDimension[] = ['SERVICE', 'TAG', 'REGION', 'ACCOUNT']
  const upperGroupBy = groupBy.toUpperCase() as GroupByDimension

  if (!validDimensions.includes(upperGroupBy)) {
    throw new Error(`Invalid group-by dimension: ${groupBy}. Valid options: ${validDimensions.join(', ')}`)
  }

  return upperGroupBy
}

export function validateFormat(format: string): OutputFormat {
  const validFormats: OutputFormat[] = ['tsv', 'csv', 'markdown']
  const lowerFormat = format.toLowerCase() as OutputFormat

  if (!validFormats.includes(lowerFormat)) {
    throw new Error(`Invalid format: ${format}. Valid options: ${validFormats.join(', ')}`)
  }

  return lowerFormat
}