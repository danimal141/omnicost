import { Command } from "commander"
import { getFormatter } from "../../formatters/index.js"
import { AWSCostProvider } from "../../providers/aws/index.js"
import type { CLIOptions } from "../../types/index.js"
import { addCommonOptions, validateDates, validateFormat, validateGroupBy } from "../options.js"

export const awsCommand = new Command("aws")
  .description("Fetch costs from AWS Cost Explorer")
  .option("--account-id <id>", "AWS Account ID")
  .option("--region <region>", "AWS Region", "us-east-1")
  .action(async () => {
    const commonOptions = awsCommand.opts() as CLIOptions & {
      accountId?: string
      region: string
    }

    try {
      validateDates(commonOptions.start, commonOptions.end)
      const format = validateFormat(commonOptions.format || "tsv")
      const groupBy = validateGroupBy(commonOptions.groupBy || "SERVICE")

      if (!commonOptions.quiet) {
        console.log(`Fetching AWS costs from ${commonOptions.start} to ${commonOptions.end}...`)
      }

      const provider = new AWSCostProvider()
      const isValid = await provider.validateCredentials()

      if (!isValid) {
        throw new Error("Invalid or missing AWS credentials")
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

addCommonOptions(awsCommand)
