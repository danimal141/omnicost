import { Command } from "commander"
import { getFormatter } from "../../formatters/index.js"
import { DatadogCostProvider } from "../../providers/datadog/index.js"
import type { CLIOptions } from "../../types/index.js"
import { addCommonOptions, validateDates, validateFormat } from "../options.js"

export const datadogCommand = new Command("datadog")
  .description("Fetch cost data from Datadog Usage API")
  .action(async () => {
    const commonOptions = datadogCommand.opts() as CLIOptions

    try {
      validateDates(commonOptions.start, commonOptions.end)
      const format = validateFormat(commonOptions.format || "tsv")

      const provider = new DatadogCostProvider()

      // Validate credentials
      console.log("Validating Datadog credentials...")
      const isValid = await provider.validateCredentials()
      if (!isValid) {
        console.error(
          "Failed to validate Datadog credentials. Please check your DD_API_KEY and DD_APP_KEY environment variables.",
        )
        process.exit(1)
      }

      // Fetch costs
      console.log(
        `Fetching Datadog usage data from ${commonOptions.start} to ${commonOptions.end}...`,
      )
      const costs = await provider.fetchCosts({
        startDate: commonOptions.start,
        endDate: commonOptions.end,
        groupBy: commonOptions.groupBy,
      })

      if (costs.length === 0) {
        console.log("No usage data found for the specified period.")
        return
      }

      // Format and output results
      const formatter = getFormatter(format)
      const output = formatter.format(costs)

      if (commonOptions.sheet) {
        // TODO: Implement Google Sheets integration
        console.log("Google Sheets integration not yet implemented")
      } else {
        console.log(output)
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`)
      } else {
        console.error("An unknown error occurred")
      }
      process.exit(1)
    }
  })

// Add common options
addCommonOptions(datadogCommand)
