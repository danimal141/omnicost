import { describe, expect, it } from "vitest";
import { parseDate, validateDateRange } from "../../../src/cli/options.js";

describe("CLI Options", () => {
	describe("parseDate", () => {
		it("should parse valid date string", () => {
			const result = parseDate("2025-04-01");
			expect(result).toBeInstanceOf(Date);
			expect(result.toISOString()).toBe("2025-04-01T00:00:00.000Z");
		});

		it("should throw error for invalid date format", () => {
			expect(() => parseDate("2025/04/01")).toThrow("Invalid date format");
			expect(() => parseDate("01-04-2025")).toThrow("Invalid date format");
			expect(() => parseDate("not-a-date")).toThrow("Invalid date format");
		});

		it("should throw error for invalid date values", () => {
			expect(() => parseDate("2025-13-01")).toThrow("Invalid date");
			expect(() => parseDate("2025-04-32")).toThrow("Invalid date");
			expect(() => parseDate("2025-02-30")).toThrow("Invalid date");
		});
	});

	describe("validateDateRange", () => {
		it("should validate correct date range", () => {
			const start = new Date("2025-04-01");
			const end = new Date("2025-04-30");
			expect(() => validateDateRange(start, end)).not.toThrow();
		});

		it("should throw error when start date is after end date", () => {
			const start = new Date("2025-04-30");
			const end = new Date("2025-04-01");
			expect(() => validateDateRange(start, end)).toThrow(
				"Start date must be before end date",
			);
		});

		it("should allow same start and end date", () => {
			const date = new Date("2025-04-01");
			expect(() => validateDateRange(date, date)).not.toThrow();
		});
	});
});