import { Command } from "commander"
import { formatCostData } from "../../formatters/index.js"
import { AzureCostProvider } from "../../providers/azure/index.js"
import type { CLIOptions } from "../../types/index.js"
import { validateDates, validateFormat, validateGroupBy } from "../options.js"

export const azureCommand = new Command("azure")
  .description("Fetch cost data from Azure Cost Management")
  .requiredOption("-s, --subscription <id>", "Azure subscription ID")
  .requiredOption("--start <date>", "Start date (YYYY-MM-DD)")
  .requiredOption("--end <date>", "End date (YYYY-MM-DD)")
  .option("-g, --group-by <dimension>", "Group by dimension (SERVICE, REGION, RESOURCE_GROUP)")
  .option("-f, --format <format>", "Output format", "tsv")
  .option("--sheet <url>", "Google Sheets URL for direct write")
  .option("-q, --quiet", "Suppress progress output")
  .action(async (options: CLIOptions & { subscription: string }) => {
    try {
      validateDates(options.start, options.end)
      const format = validateFormat(options.format || "tsv")
      const groupBy = options.groupBy ? validateGroupBy(options.groupBy) : undefined

      const provider = new AzureCostProvider(options.subscription)

      if (!options.quiet) {
        console.log("Validating Azure credentials...")
      }

      const isValid = await provider.validateCredentials()
      if (!isValid) {
        console.error("Failed to validate Azure credentials")
        process.exit(1)
      }

      if (!options.quiet) {
        console.log("Fetching cost data from Azure...")
      }

      const costs = await provider.fetchCosts({
        startDate: options.start,
        endDate: options.end,
        groupBy: groupBy,
      })

      if (!options.quiet) {
        console.log(`Retrieved ${costs.length} cost entries`)
      }

      // For now, output to console. Sheet integration will come later.
      const formatted = formatCostData(costs, format)
      console.log(formatted)
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })
