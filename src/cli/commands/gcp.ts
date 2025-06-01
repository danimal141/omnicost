import { Command } from "commander"
import { getFormatter } from "../../formatters/index.js"
import { GCPCostProvider } from "../../providers/gcp/index.js"
import type { CLIOptions } from "../../types/index.js"
import { addCommonOptions, validateDates, validateFormat, validateGroupBy } from "../options.js"

export const gcpCommand = new Command("gcp")
  .description("Fetch costs from GCP BigQuery billing export")
  .requiredOption("--project <id>", "GCP Project ID")
  .requiredOption("--dataset <name>", "BigQuery dataset containing billing export")
  .action(async () => {
    const commonOptions = gcpCommand.opts() as CLIOptions & {
      project: string
      dataset: string
    }

    try {
      validateDates(commonOptions.start, commonOptions.end)
      const format = validateFormat(commonOptions.format || "tsv")
      const groupBy = validateGroupBy(commonOptions.groupBy || "SERVICE")

      if (!commonOptions.quiet) {
        console.log(`Fetching GCP costs from ${commonOptions.start} to ${commonOptions.end}...`)
      }

      const provider = new GCPCostProvider(commonOptions.project, commonOptions.dataset)
      const isValid = await provider.validateCredentials()

      if (!isValid) {
        throw new Error("Invalid GCP credentials or dataset not found")
      }

      const costs = await provider.fetchCosts({
        startDate: commonOptions.start,
        endDate: commonOptions.end,
        groupBy,
      })

      const formatter = getFormatter(format)
      const output = formatter.format(costs)

      if (commonOptions.sheet) {
        // TODO: Implement Google Sheets integration
        console.log("Google Sheets integration not yet implemented")
        console.log("Sheet URL:", commonOptions.sheet)
      } else {
        console.log(output)
      }
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

addCommonOptions(gcpCommand)
