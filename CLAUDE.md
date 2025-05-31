# CLAUDE.md  
**Project Name:** `omnicost` – Multi-cloud cost report CLI

> Status: **Development**  
> Target version: **v1.0.0 GA**

---

## 1  Why this project?

| Problem | Need |
|---------|------|
| クラウド別・期間別のコスト明細を毎回ポータルで手作業DL | **1コマンド**で取得 → スプレッドシートに貼るだけにしたい |
| マルチクラウド (AWS / GCP / Azure / Datadog) で API 仕様がバラバラ | アダプタ方式で **共通スキーマ** に正規化 |
| Excel 加工が面倒・自動化しづらい | TSV/CSV だけでなく **Google Sheets 直接書込み** |

---

## 2  MVP Scope

* **Providers:** AWS Cost Explorer · GCP Billing BQ Export · Azure Cost Details API · Datadog Usage
* **Output:** TSV (default) / CSV / Markdown &rarr; Stdout -or- **Google Sheets** (`--sheet <URL>`)
* **CLI Usage (typical)**  
  ```bash
  omnicost aws --account-id 123456... \
    --start 2025-04-01 --end 2025-04-30 \
    --group-by SERVICE --sheet https://docs.google.com/...
  ```

---

## 3  Core Architecture

### 3.1 Provider Adapter Pattern
```typescript
interface CostProvider {
  fetchCosts(params: FetchParams): Promise<CostData[]>
  validateCredentials(): Promise<boolean>
}

interface CostData {
  date: string
  service: string
  amount: number
  currency: string
  tags?: Record<string, string>
}
```

### 3.2 Directory Structure
```
omnicost/
├── src/
│   ├── cli/           # CLI entry point & command definitions
│   ├── providers/     # Cloud provider adapters
│   │   ├── aws/
│   │   ├── gcp/
│   │   ├── azure/
│   │   └── datadog/
│   ├── formatters/    # Output formatters (TSV, CSV, Markdown)
│   ├── sheets/        # Google Sheets integration
│   └── utils/         # Common utilities
├── tests/
├── package.json
├── tsconfig.json
└── README.md
```

### 3.3 Key Dependencies
- **CLI**: commander.js
- **AWS**: @aws-sdk/client-cost-explorer
- **GCP**: @google-cloud/bigquery
- **Azure**: @azure/arm-costmanagement
- **Google Sheets**: googleapis
- **Testing**: vitest
- **Linting**: eslint + prettier

---

## 4  Development Phases

### Phase 1: Foundation ✅
- [x] Project setup (TypeScript, ESLint, testing)
- [x] CLI skeleton with commander.js
- [x] Provider adapter interface
- [x] Basic AWS Cost Explorer integration

### Phase 2: Provider Implementation 🚧
- [x] AWS Cost Explorer
  - [x] Full API integration with @aws-sdk/client-cost-explorer
  - [x] Credential validation
  - [x] Error handling & retry logic (3 attempts, exponential backoff)
  - [x] Pagination support
  - [x] Comprehensive unit tests (9 test cases)
- [ ] GCP BigQuery billing export
- [ ] Azure Cost Management API
- [ ] Datadog Usage API

### Phase 3: Output & Integration
- [ ] TSV/CSV/Markdown formatters
- [ ] Google Sheets OAuth & write
- [ ] Date range & grouping options
- [ ] Progress indicators

### Phase 4: Polish & Release
- [ ] Comprehensive testing
- [ ] Documentation (README, examples)
- [ ] CI/CD pipeline
- [ ] npm publish

---

## 5  CLI Commands & Options

### Basic Usage
```bash
# AWS costs for last month
omnicost aws --start 2025-04-01 --end 2025-04-30

# GCP with BigQuery dataset
omnicost gcp --project my-project --dataset billing_export \
  --start 2025-04-01 --end 2025-04-30

# Azure with subscription ID
omnicost azure --subscription 12345... --start 2025-04-01 --end 2025-04-30

# Datadog usage
omnicost datadog --start 2025-04-01 --end 2025-04-30
```

### Common Options
```bash
--start, -s        Start date (YYYY-MM-DD)
--end, -e          End date (YYYY-MM-DD)
--group-by, -g     Group by dimension (SERVICE, TAG, etc.)
--format, -f       Output format (tsv, csv, markdown)
--sheet            Google Sheets URL for direct write
--quiet, -q        Suppress progress output
```

### Environment Variables
```bash
# AWS
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION

# GCP
GOOGLE_APPLICATION_CREDENTIALS

# Azure
AZURE_CLIENT_ID
AZURE_CLIENT_SECRET
AZURE_TENANT_ID

# Datadog
DD_API_KEY
DD_APP_KEY
```

---

## 6  Testing Strategy

### 6.1 Overview
- **Framework**: Vitest
- **Coverage target**: 80%+
- **Test types**: Unit tests only (for now)

### 6.2 Unit Tests
Focus on isolated component testing:

#### CLI Options (`tests/unit/cli/options.test.ts`)
- Date parsing validation (YYYY-MM-DD format)
- Date range validation (start <= end)
- Invalid input handling

#### Provider Adapters (`tests/unit/providers/*/`)
- Mock external API calls
- Test data normalization to CostData interface
- Error handling (auth failures, network errors)
- Edge cases (empty results, pagination)

#### Formatters (`tests/unit/formatters/`)
- TSV/CSV generation accuracy
- Special character escaping
- Header formatting
- Empty data handling

### 6.3 Test Data & Mocking
- Fixed test fixtures for predictable results
- API response mocks for all providers
- Edge case scenarios:
  - Empty cost data
  - Single day vs. multi-month ranges
  - Large datasets (1000+ items)
  - Various currency formats

### 6.4 Directory Structure
```
tests/
└── unit/
    ├── cli/
    │   └── options.test.ts
    ├── providers/
    │   ├── aws/
    │   │   └── index.test.ts
    │   ├── gcp/
    │   │   └── index.test.ts
    │   ├── azure/
    │   │   └── index.test.ts
    │   └── datadog/
    │       └── index.test.ts
    └── formatters/
        └── index.test.ts
```

---

## 7  Future Enhancements (Post-MVP)

- [ ] Cost anomaly detection
- [ ] Budget alerts
- [ ] Historical trend charts
- [ ] Slack/Teams notifications
- [ ] Cost allocation tags support
- [ ] Multi-account/project aggregation

---

## 8  Current TODO List

### ✅ Completed
- Project foundation setup
- AWS provider full implementation with tests
- CLI command structure for AWS

### 🚧 In Progress
- None

### 📋 Next Tasks (Priority Order)
1. **GCP BigQuery billing export provider** - Next provider to implement
2. **Azure Cost Management API provider**
3. **Datadog Usage API provider**
4. **Google Sheets integration** - OAuth & direct write functionality
5. **Complete unit tests** - CLI options & formatters (currently skipped)
6. **Documentation** - README, usage examples

### 📝 Development Notes
- AWS provider serves as reference implementation for other providers
- All providers should follow same pattern: validateCredentials(), fetchCosts()
- Maintain test coverage above 80%
- Run `npm run lint`, `npm run format`, `npm test` before commits
- Keep credentials in environment variables, never commit them
