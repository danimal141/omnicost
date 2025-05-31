#!/usr/bin/env node

import { Command } from 'commander'
import { awsCommand } from './commands/aws.js'
import { gcpCommand } from './commands/gcp.js'
import { azureCommand } from './commands/azure.js'
import { datadogCommand } from './commands/datadog.js'

const program = new Command()

program
  .name('omnicost')
  .description('Multi-cloud cost report CLI')
  .version('0.1.0')

program.addCommand(awsCommand)
program.addCommand(gcpCommand)
program.addCommand(azureCommand)
program.addCommand(datadogCommand)

program.parse()