import { describe, expect, it } from "vitest";
import type { CostData } from "../../../src/types/index.js";
import {
	formatAsTSV,
	formatAsCSV,
	formatAsMarkdown,
} from "../../../src/formatters/index.js";

describe("Formatters", () => {
	const mockData: CostData[] = [
		{
			date: "2025-04-01",
			service: "Amazon EC2",
			amount: 150.25,
			currency: "USD",
		},
		{
			date: "2025-04-01",
			service: "Amazon S3",
			amount: 25.5,
			currency: "USD",
		},
		{
			date: "2025-04-02",
			service: "Amazon EC2",
			amount: 155.0,
			currency: "USD",
		},
	];

	describe("formatAsTSV", () => {
		it("should format data as TSV", () => {
			const result = formatAsTSV(mockData);
			const lines = result.split("\n");

			expect(lines[0]).toBe("Date\tService\tAmount\tCurrency");
			expect(lines[1]).toBe("2025-04-01\tAmazon EC2\t150.25\tUSD");
			expect(lines[2]).toBe("2025-04-01\tAmazon S3\t25.5\tUSD");
			expect(lines[3]).toBe("2025-04-02\tAmazon EC2\t155\tUSD");
		});

		it("should handle empty data", () => {
			const result = formatAsTSV([]);
			expect(result).toBe("Date\tService\tAmount\tCurrency");
		});

		it("should escape tabs in service names", () => {
			const dataWithTabs: CostData[] = [
				{
					date: "2025-04-01",
					service: "Service\twith\ttabs",
					amount: 100,
					currency: "USD",
				},
			];
			const result = formatAsTSV(dataWithTabs);
			const lines = result.split("\n");
			expect(lines[1]).toBe("2025-04-01\tService with tabs\t100\tUSD");
		});
	});

	describe("formatAsCSV", () => {
		it("should format data as CSV", () => {
			const result = formatAsCSV(mockData);
			const lines = result.split("\n");

			expect(lines[0]).toBe("Date,Service,Amount,Currency");
			expect(lines[1]).toBe("2025-04-01,Amazon EC2,150.25,USD");
			expect(lines[2]).toBe("2025-04-01,Amazon S3,25.5,USD");
			expect(lines[3]).toBe("2025-04-02,Amazon EC2,155,USD");
		});

		it("should handle empty data", () => {
			const result = formatAsCSV([]);
			expect(result).toBe("Date,Service,Amount,Currency");
		});

		it("should escape commas and quotes in service names", () => {
			const dataWithSpecialChars: CostData[] = [
				{
					date: "2025-04-01",
					service: 'Service, with "quotes"',
					amount: 100,
					currency: "USD",
				},
			];
			const result = formatAsCSV(dataWithSpecialChars);
			const lines = result.split("\n");
			expect(lines[1]).toBe('2025-04-01,"Service, with ""quotes""",100,USD');
		});
	});

	describe("formatAsMarkdown", () => {
		it("should format data as Markdown table", () => {
			const result = formatAsMarkdown(mockData);
			const lines = result.split("\n");

			expect(lines[0]).toBe("| Date | Service | Amount | Currency |");
			expect(lines[1]).toBe("|------|---------|--------|----------|");
			expect(lines[2]).toBe("| 2025-04-01 | Amazon EC2 | 150.25 | USD |");
			expect(lines[3]).toBe("| 2025-04-01 | Amazon S3 | 25.5 | USD |");
			expect(lines[4]).toBe("| 2025-04-02 | Amazon EC2 | 155 | USD |");
		});

		it("should handle empty data", () => {
			const result = formatAsMarkdown([]);
			const lines = result.split("\n");
			expect(lines[0]).toBe("| Date | Service | Amount | Currency |");
			expect(lines[1]).toBe("|------|---------|--------|----------|");
			expect(lines.length).toBe(2);
		});

		it("should escape pipes in service names", () => {
			const dataWithPipes: CostData[] = [
				{
					date: "2025-04-01",
					service: "Service | with | pipes",
					amount: 100,
					currency: "USD",
				},
			];
			const result = formatAsMarkdown(dataWithPipes);
			const lines = result.split("\n");
			expect(lines[2]).toBe(
				"| 2025-04-01 | Service \\| with \\| pipes | 100 | USD |",
			);
		});
	});
});