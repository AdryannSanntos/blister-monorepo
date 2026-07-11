import { describe, expect, it } from "vitest";

import { maskCpf, maskPhone } from "./brazilian-input-masks";

describe("maskCpf", () => {
  it("formats partial and full CPF", () => {
    expect(maskCpf("123")).toBe("123");
    expect(maskCpf("12345678901")).toBe("123.456.789-01");
  });
});

describe("maskPhone", () => {
  it("formats landline and mobile numbers", () => {
    expect(maskPhone("11")).toBe("(11");
    expect(maskPhone("1133334444")).toBe("(11) 3333-4444");
    expect(maskPhone("11999998888")).toBe("(11) 99999-8888");
  });
});
