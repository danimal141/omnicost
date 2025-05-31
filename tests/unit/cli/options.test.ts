import { describe, expect, it } from "vitest"
import { validateDates, validateFormat, validateGroupBy } from "../../../src/cli/options.js"

describe.skip("CLI Options", () => {
  describe("validateDates", () => {
    it("should validate correct date range", () => {
      expect(() => validateDates("2025-04-01", "2025-04-30")).not.toThrow()
    })

    it("should throw error when start date is after end date", () => {
      expect(() => validateDates("2025-04-30", "2025-04-01")).toThrow(
        "Start date must be before end date",
      )
    })

    it("should allow same start and end date", () => {
      expect(() => validateDates("2025-04-01", "2025-04-01")).not.toThrow()
    })

    it("should throw error for invalid start date", () => {
      expect(() => validateDates("invalid-date", "2025-04-01")).toThrow("Invalid start date")
    })

    it("should throw error for invalid end date", () => {
      expect(() => validateDates("2025-04-01", "invalid-date")).toThrow("Invalid end date")
    })
  })

  describe("validateGroupBy", () => {
    it("should validate correct group by dimensions", () => {
      expect(validateGroupBy("SERVICE")).toBe("SERVICE")
      expect(validateGroupBy("TAG")).toBe("TAG")
      expect(validateGroupBy("REGION")).toBe("REGION")
      expect(validateGroupBy("ACCOUNT")).toBe("ACCOUNT")
    })

    it("should convert lowercase to uppercase", () => {
      expect(validateGroupBy("service")).toBe("SERVICE")
      expect(validateGroupBy("tag")).toBe("TAG")
    })

    it("should throw error for invalid dimension", () => {
      expect(() => validateGroupBy("INVALID")).toThrow("Invalid group-by dimension")
    })
  })

  describe("validateFormat", () => {
    it("should validate correct output formats", () => {
      expect(validateFormat("tsv")).toBe("tsv")
      expect(validateFormat("csv")).toBe("csv")
      expect(validateFormat("markdown")).toBe("markdown")
    })

    it("should convert uppercase to lowercase", () => {
      expect(validateFormat("TSV")).toBe("tsv")
      expect(validateFormat("CSV")).toBe("csv")
      expect(validateFormat("MARKDOWN")).toBe("markdown")
    })

    it("should throw error for invalid format", () => {
      expect(() => validateFormat("xml")).toThrow("Invalid format")
    })
  })
})
