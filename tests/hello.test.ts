import { describe, expect, it } from "vitest"
import { add, greet } from "../src/hello.js"

describe("greet", () => {
  it("should return greeting message", () => {
    expect(greet("World")).toBe("Hello, World!")
    expect(greet("TypeScript")).toBe("Hello, TypeScript!")
  })
})

describe("add", () => {
  it("should add two numbers correctly", () => {
    expect(add(2, 3)).toBe(5)
    expect(add(-1, 1)).toBe(0)
    expect(add(0, 0)).toBe(0)
  })
})
