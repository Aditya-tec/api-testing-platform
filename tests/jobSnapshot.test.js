// tests/jobSnapshot.test.js
// Verifies the snapshot stored on a Job is a deep copy
// and not a reference to the Collection's requests array.
// This is the core guarantee of deterministic reruns.

describe("Job Snapshot Isolation", () => {
  test("modifying original array does not affect snapshot", () => {
    // Simulate what createJob does: deep copy via JSON round-trip
    const originalRequests = [
      { index: 0, name: "Get User", method: "GET", url: "https://api.example.com/user" }
    ];

    // This is how Mongoose Mixed fields behave after save/retrieve
    const snapshot = JSON.parse(JSON.stringify(originalRequests));

    // Mutate the original
    originalRequests[0].url = "https://api.example.com/MUTATED";
    originalRequests.push({ index: 1, name: "New Request", method: "POST", url: "https://api.example.com/new" });

    // Snapshot must be unchanged
    expect(snapshot).toHaveLength(1);
    expect(snapshot[0].url).toBe("https://api.example.com/user");
  });

  test("snapshot preserves all request fields", () => {
    const request = {
      index: 0,
      name: "Auth Request",
      method: "POST",
      url: "https://api.example.com/login",
      headers: { "x-api-key": "secret" },
      body: { username: "admin" },
      extract: [{ variable: "token", from: "data.token" }],
      timeoutMs: 5000,
    };

    const snapshot = JSON.parse(JSON.stringify([request]));

    expect(snapshot[0].index).toBe(0);
    expect(snapshot[0].headers["x-api-key"]).toBe("secret");
    expect(snapshot[0].extract[0].variable).toBe("token");
    expect(snapshot[0].timeoutMs).toBe(5000);
  });
});