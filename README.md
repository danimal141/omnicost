# omnicost

Multi-cloud cost report CLI tool that fetches cost data from various cloud providers and outputs in multiple formats.

## Features

- **Multi-cloud support**: AWS, Azure, GCP, Datadog
- **Multiple output formats**: TSV (default), CSV, Markdown
- **Flexible grouping**: Group costs by service, tag, or other dimensions
- **Date range support**: Specify custom date ranges for cost analysis
- **Google Sheets integration** (coming soon): Direct write to Google Sheets

## Installation

```bash
npm install -g omnicost
```

Or run locally:

```bash
git clone https://github.com/yourusername/omnicost.git
cd omnicost
npm install
npm run build
npm link
```

## Usage

### AWS

```bash
# Basic usage
omnicost aws --start 2025-01-01 --end 2025-01-31

# With specific account ID
omnicost aws --account-id 123456789012 --start 2025-01-01 --end 2025-01-31

# Group by service
omnicost aws --start 2025-01-01 --end 2025-01-31 --group-by SERVICE

# Output as CSV
omnicost aws --start 2025-01-01 --end 2025-01-31 --format csv

# Filter by specific services
omnicost aws --start 2025-01-01 --end 2025-01-31 --filter-service "Amazon EC2,Amazon S3"
```

### Azure

```bash
# Basic usage with subscription ID
omnicost azure --subscription-id your-subscription-id --start 2025-01-01 --end 2025-01-31

# Group by resource group
omnicost azure --subscription-id your-subscription-id --start 2025-01-01 --end 2025-01-31 --group-by RESOURCE_GROUP

# Filter by specific resource groups
omnicost azure --subscription-id your-subscription-id --start 2025-01-01 --end 2025-01-31 --filter-resource-group "rg1,rg2"
```

### GCP

```bash
# Basic usage
omnicost gcp --project my-project --dataset billing_export --start 2025-01-01 --end 2025-01-31

# Group by project
omnicost gcp --project my-project --dataset billing_export --start 2025-01-01 --end 2025-01-31 --group-by PROJECT

# Group by region
omnicost gcp --project my-project --dataset billing_export --start 2025-01-01 --end 2025-01-31 --group-by REGION
```

### Datadog

```bash
# Basic usage
omnicost datadog --start 2025-01-01 --end 2025-01-31

# Group by product family
omnicost datadog --start 2025-01-01 --end 2025-01-31 --group-by PRODUCT_FAMILY

# Filter by specific products
omnicost datadog --start 2025-01-01 --end 2025-01-31 --filter-product "logs,apm"
```

## Authentication

### AWS

Set AWS credentials using one of the following methods:

1. Environment variables:
   ```bash
   export AWS_ACCESS_KEY_ID=your-access-key
   export AWS_SECRET_ACCESS_KEY=your-secret-key
   export AWS_REGION=us-east-1
   ```

2. AWS CLI configuration:
   ```bash
   aws configure
   ```

3. IAM roles (when running on EC2)

Required IAM permissions:
- `ce:GetCostAndUsage`

### Azure

Set Azure credentials using environment variables:

```bash
export AZURE_CLIENT_ID=your-client-id
export AZURE_CLIENT_SECRET=your-client-secret
export AZURE_TENANT_ID=your-tenant-id
```

Required permissions:
- Cost Management Reader role on the subscription

### GCP

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

Required permissions:
- BigQuery Data Viewer
- BigQuery Job User

### Datadog

```bash
export DD_API_KEY=your-api-key
export DD_APP_KEY=your-app-key
```

Required permissions:
- Usage Read permission

## Options

### Common Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--start` | `-s` | Start date (YYYY-MM-DD) | Required |
| `--end` | `-e` | End date (YYYY-MM-DD) | Required |
| `--group-by` | `-g` | Group by dimension | None |
| `--format` | `-f` | Output format (tsv, csv, markdown) | tsv |
| `--quiet` | `-q` | Suppress progress output | false |

### AWS-specific Options

| Option | Description |
|--------|-------------|
| `--account-id` | AWS account ID to query |
| `--filter-service` | Comma-separated list of services to include |
| `--filter-tag` | Filter by tag (format: key=value) |

### Azure-specific Options

| Option | Description |
|--------|-------------|
| `--subscription-id` | Azure subscription ID |
| `--filter-resource-group` | Comma-separated list of resource groups |
| `--filter-service` | Comma-separated list of services |

### GCP-specific Options

| Option | Description |
|--------|-------------|
| `--project` | GCP Project ID |
| `--dataset` | BigQuery dataset containing billing export |

### Datadog-specific Options

| Option | Description |
|--------|-------------|
| `--filter-product` | Comma-separated list of products to include |

## Output Formats

### TSV (Tab-Separated Values)
Default format, suitable for Excel/Google Sheets paste:
```
Date	Service	Amount	Currency
2025-01-01	Amazon EC2	100.50	USD
2025-01-01	Amazon S3	25.30	USD
```

### CSV (Comma-Separated Values)
Standard CSV format:
```
Date,Service,Amount,Currency
2025-01-01,Amazon EC2,100.50,USD
2025-01-01,Amazon S3,25.30,USD
```

### Markdown
GitHub-flavored markdown table:
```
| Date | Service | Amount | Currency |
|------|---------|--------|----------|
| 2025-01-01 | Amazon EC2 | 100.50 | USD |
| 2025-01-01 | Amazon S3 | 25.30 | USD |
```

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/omnicost.git
cd omnicost

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Lint & format
npm run lint
npm run format
```

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Project Structure

```
omnicost/
├── src/
│   ├── cli/           # CLI entry point & command definitions
│   ├── providers/     # Cloud provider adapters
│   ├── formatters/    # Output formatters
│   ├── sheets/        # Google Sheets integration (coming soon)
│   └── utils/         # Common utilities
├── tests/
│   └── unit/          # Unit tests
├── package.json
├── tsconfig.json
└── README.md
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure:
- All tests pass (`npm test`)
- Code is linted (`npm run lint`)
- Code is formatted (`npm run format`)
- Build succeeds (`npm run build`)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Roadmap

- [x] AWS Cost Explorer support
- [x] Azure Cost Management support
- [x] GCP BigQuery billing export
- [x] Datadog Usage API
- [ ] Google Sheets direct write
- [ ] Cost anomaly detection
- [ ] Budget alerts
- [ ] Historical trend charts