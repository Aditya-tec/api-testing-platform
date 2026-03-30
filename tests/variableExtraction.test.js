// tests/variableExtraction.test.js
// Verifies variable injection and extraction work correctly
// — the core of the request chaining feature.

const { injectVariables, extractVariables } = require("../src/services/requestExecutor");

describe("Variable Injection", () => {
  test("replaces {{variable}} with value from map", () => {
    const variables = new Map([["userId", "123"]]);
    const result = injectVariables("https://api.example.com/users/{{userId}}", variables);
    expect(result).toBe("https://api.example.com/users/123");
  });

  test("replaces multiple variables in one string", () => {
    const variables = new Map([["org", "acme"], ["id", "42"]]);
    const result = injectVariables("https://api.example.com/{{org}}/items/{{id}}", variables);
    expect(result).toBe("https://api.example.com/acme/items/42");
  });

  test("leaves unreplaced placeholder if variable missing", () => {
    const variables = new Map();
    const result = injectVariables("https://api.example.com/{{missing}}", variables);
    expect(result).toBe("https://api.example.com/{{missing}}");
  });

  test("returns non-string values unchanged", () => {
    const variables = new Map();
    expect(injectVariables(null, variables)).toBeNull();
    expect(injectVariables(undefined, variables)).toBeUndefined();
  });
});

describe("Variable Extraction", () => {
  test("extracts a top-level value from response", () => {
    const variables = new Map();
    const responseData = { uuid: "abc-123" };
    const rules = [{ variable: "myUuid", from: "uuid" }];
    extractVariables(responseData, rules, variables);
    expect(variables.get("myUuid")).toBe("abc-123");
  });

  test("extracts a nested value using dot-path", () => {
    const variables = new Map();
    const responseData = { data: { user: { id: 99 } } };
    const rules = [{ variable: "userId", from: "data.user.id" }];
    extractVariables(responseData, rules, variables);
    expect(variables.get("userId")).toBe(99);
  });

  test("does not set variable if path does not exist", () => {
    const variables = new Map();
    const responseData = { data: {} };
    const rules = [{ variable: "missing", from: "data.user.id" }];
    extractVariables(responseData, rules, variables);
    expect(variables.has("missing")).toBe(false);
  });

  test("extracts multiple variables in one pass", () => {
    const variables = new Map();
    const responseData = { id: 1, token: "xyz" };
    const rules = [
      { variable: "id", from: "id" },
      { variable: "token", from: "token" },
    ];
    extractVariables(responseData, rules, variables);
    expect(variables.get("id")).toBe(1);
    expect(variables.get("token")).toBe("xyz");
  });
});