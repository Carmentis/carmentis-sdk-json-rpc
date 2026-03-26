import { JsonRpc } from "../JsonRpc";

describe("Example usage", () => {
  it("parses a request", () => {
    const res = JsonRpc.parseRequest('{"jsonrpc":"2.0","method":"subtract","params":[42,23],"id":1}');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value).toEqual({
      jsonrpc: "2.0",
      method: "subtract",
      params: [42, 23],
      id: 1,
    })
  })
})

// ---- Error builders ----

describe("JsonRpc.ErrorCode", () => {
  it("exposes standard error codes", () => {
    expect(JsonRpc.ErrorCode.ParseError).toBe(-32700);
    expect(JsonRpc.ErrorCode.InvalidRequest).toBe(-32600);
    expect(JsonRpc.ErrorCode.MethodNotFound).toBe(-32601);
    expect(JsonRpc.ErrorCode.InvalidParams).toBe(-32602);
    expect(JsonRpc.ErrorCode.InternalError).toBe(-32603);
  });
});

describe("JsonRpc.error", () => {
  it("builds a generic error response", () => {
    const res = JsonRpc.error("1", -32601, "Method not found");
    expect(res).toEqual({
      jsonrpc: "2.0",
      error: { code: -32601, message: "Method not found" },
      id: "1",
    });
  });

  it("includes data when provided", () => {
    const res = JsonRpc.error(null, -32603, "Internal error", { detail: "boom" });
    expect(res.error.data).toEqual({ detail: "boom" });
  });

  it("omits data when not provided", () => {
    const res = JsonRpc.error(null, -32603, "Internal error");
    expect("data" in res.error).toBe(false);
  });
});

describe("error shorthand builders", () => {
  it("parseError → code -32700, id null", () => {
    const res = JsonRpc.parseError();
    expect(res.error.code).toBe(-32700);
    expect(res.error.message).toBe("Parse error");
    expect(res.id).toBeNull();
  });

  it("invalidRequest defaults id to null", () => {
    const res = JsonRpc.invalidRequest();
    expect(res.error.code).toBe(-32600);
    expect(res.id).toBeNull();
  });

  it("invalidRequest accepts explicit id", () => {
    const res = JsonRpc.invalidRequest("abc");
    expect(res.id).toBe("abc");
  });

  it("methodNotFound → code -32601", () => {
    const res = JsonRpc.methodNotFound("1");
    expect(res.error.code).toBe(-32601);
    expect(res.id).toBe("1");
  });

  it("invalidParams → code -32602", () => {
    const res = JsonRpc.invalidParams(2);
    expect(res.error.code).toBe(-32602);
    expect(res.id).toBe(2);
  });

  it("internalError → code -32603", () => {
    const res = JsonRpc.internalError(null);
    expect(res.error.code).toBe(-32603);
  });
});

// ---- Success builder ----

describe("JsonRpc.success", () => {
  it("builds a success response", () => {
    expect(JsonRpc.success(1, 19)).toEqual({
      jsonrpc: "2.0",
      result: 19,
      id: 1,
    });
  });

  it("allows null id", () => {
    expect(JsonRpc.success(null, { ok: true })).toEqual({
      jsonrpc: "2.0",
      result: { ok: true },
      id: null,
    });
  });
});

// ---- Type guards ----

describe("JsonRpc.isSuccessResponse / isErrorResponse", () => {
  const ok = JsonRpc.success("1", 42);
  const err = JsonRpc.parseError();

  it("isSuccessResponse detects success", () => {
    expect(JsonRpc.isSuccessResponse(ok)).toBe(true);
    expect(JsonRpc.isSuccessResponse(err)).toBe(false);
  });

  it("isErrorResponse detects error", () => {
    expect(JsonRpc.isErrorResponse(err)).toBe(true);
    expect(JsonRpc.isErrorResponse(ok)).toBe(false);
  });

  it("rejects non-objects", () => {
    expect(JsonRpc.isSuccessResponse(null)).toBe(false);
    expect(JsonRpc.isErrorResponse("string")).toBe(false);
  });
});

// ---- parseRequest ----

describe("JsonRpc.parseRequest", () => {
  it("parses a request with positional params", () => {
    const res = JsonRpc.parseRequest(
      '{"jsonrpc":"2.0","method":"subtract","params":[42,23],"id":1}'
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value).toEqual({
      jsonrpc: "2.0",
      method: "subtract",
      params: [42, 23],
      id: 1,
    });
    expect(JsonRpc.isRequest(res.value)).toBe(true);
  });

  it("parses a request with named params", () => {
    const res = JsonRpc.parseRequest(
      '{"jsonrpc":"2.0","method":"subtract","params":{"subtrahend":23,"minuend":42},"id":3}'
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect((res.value as any).params).toEqual({ subtrahend: 23, minuend: 42 });
  });

  it("parses a request without params", () => {
    const res = JsonRpc.parseRequest(
      '{"jsonrpc":"2.0","method":"get_data","id":"9"}'
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value).toEqual({ jsonrpc: "2.0", method: "get_data", id: "9" });
  });

  it("parses a notification (no id)", () => {
    const res = JsonRpc.parseRequest(
      '{"jsonrpc":"2.0","method":"update","params":[1,2,3,4,5]}'
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(JsonRpc.isNotification(res.value)).toBe(true);
    expect(JsonRpc.isRequest(res.value)).toBe(false);
  });

  it("parses a notification with no params", () => {
    const res = JsonRpc.parseRequest('{"jsonrpc":"2.0","method":"foobar"}');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(JsonRpc.isNotification(res.value)).toBe(true);
  });

  it("accepts string, number, and null as id", () => {
    expect(JsonRpc.parseRequest({ jsonrpc: "2.0", method: "m", id: "str" }).ok).toBe(true);
    expect(JsonRpc.parseRequest({ jsonrpc: "2.0", method: "m", id: 42 }).ok).toBe(true);
    expect(JsonRpc.parseRequest({ jsonrpc: "2.0", method: "m", id: null }).ok).toBe(true);
  });

  it("rejects fractional number id", () => {
    const res = JsonRpc.parseRequest({ jsonrpc: "2.0", method: "m", id: 1.5 });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.error.code).toBe(-32600);
  });

  it("returns ParseError for invalid JSON string", () => {
    const res = JsonRpc.parseRequest('{"jsonrpc": "2.0", "method": "foobar, "params": "bar", "baz]');
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.error.code).toBe(-32700);
    expect(res.error.id).toBeNull();
  });

  it("returns InvalidRequest when method is not a string", () => {
    const res = JsonRpc.parseRequest('{"jsonrpc":"2.0","method":1,"params":"bar"}');
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.error.code).toBe(-32600);
    expect(res.error.id).toBeNull();
  });

  it("returns InvalidRequest for wrong jsonrpc version", () => {
    const res = JsonRpc.parseRequest({ jsonrpc: "1.0", method: "m", id: 1 });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.error.code).toBe(-32600);
  });

  it("returns InvalidRequest for reserved rpc. method", () => {
    const res = JsonRpc.parseRequest({ jsonrpc: "2.0", method: "rpc.discover", id: 1 });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.error.code).toBe(-32600);
  });

  it("returns InvalidRequest when params is not array or object", () => {
    const res = JsonRpc.parseRequest({ jsonrpc: "2.0", method: "m", params: "bad", id: 1 });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.error.code).toBe(-32600);
  });

  it("accepts a pre-parsed object", () => {
    const res = JsonRpc.parseRequest({ jsonrpc: "2.0", method: "ping", id: 0 });
    expect(res.ok).toBe(true);
  });

  it("returns InvalidRequest for a non-object input", () => {
    const res = JsonRpc.parseRequest(42);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.error.code).toBe(-32600);
  });
});

// ---- parseBatch ----

describe("JsonRpc.parseBatch", () => {
  it("returns InvalidRequest for empty array", () => {
    const res = JsonRpc.parseBatch("[]");
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.error.code).toBe(-32600);
  });

  it("returns ParseError for invalid JSON", () => {
    const res = JsonRpc.parseBatch('[{"jsonrpc":"2.0","method"');
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.error.code).toBe(-32700);
  });

  it("returns InvalidRequest when input is not an array", () => {
    const res = JsonRpc.parseBatch({ jsonrpc: "2.0", method: "m", id: 1 });
    expect(res.ok).toBe(false);
  });

  it("collects errors for invalid items — [1]", () => {
    const res = JsonRpc.parseBatch("[1]");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.valid).toHaveLength(0);
    expect(res.value.errors).toHaveLength(1);
    expect(res.value.errors[0].error.code).toBe(-32600);
  });

  it("collects errors for multiple invalid items — [1,2,3]", () => {
    const res = JsonRpc.parseBatch("[1,2,3]");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.valid).toHaveLength(0);
    expect(res.value.errors).toHaveLength(3);
  });

  it("parses a valid batch with mixed requests and notifications", () => {
    const input = JSON.stringify([
      { jsonrpc: "2.0", method: "sum", params: [1, 2, 4], id: "1" },
      { jsonrpc: "2.0", method: "notify_hello", params: [7] },
      { jsonrpc: "2.0", method: "subtract", params: [42, 23], id: "2" },
    ]);
    const res = JsonRpc.parseBatch(input);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.valid).toHaveLength(3);
    expect(res.value.errors).toHaveLength(0);
    expect(JsonRpc.isRequest(res.value.valid[0])).toBe(true);
    expect(JsonRpc.isNotification(res.value.valid[1])).toBe(true);
  });

  it("separates valid and invalid items in a mixed batch", () => {
    const input = JSON.stringify([
      { jsonrpc: "2.0", method: "sum", params: [1, 2, 4], id: "1" },
      { foo: "boo" },
      { jsonrpc: "2.0", method: "subtract", params: [42, 23], id: "2" },
    ]);
    const res = JsonRpc.parseBatch(input);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.valid).toHaveLength(2);
    expect(res.value.errors).toHaveLength(1);
  });

  it("returns ok with empty valid for all-notification batch", () => {
    const input = JSON.stringify([
      { jsonrpc: "2.0", method: "notify_sum", params: [1, 2, 4] },
      { jsonrpc: "2.0", method: "notify_hello", params: [7] },
    ]);
    const res = JsonRpc.parseBatch(input);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.valid).toHaveLength(2);
    expect(res.value.errors).toHaveLength(0);
  });
});

// ---- parse (auto-detect) ----

describe("JsonRpc.parse", () => {
  it("detects a single request", () => {
    const res = JsonRpc.parse('{"jsonrpc":"2.0","method":"ping","id":1}');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(JsonRpc.isBatchResult(res.value)).toBe(false);
  });

  it("detects a batch", () => {
    const res = JsonRpc.parse('[{"jsonrpc":"2.0","method":"ping","id":1}]');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(JsonRpc.isBatchResult(res.value)).toBe(true);
  });

  it("returns ParseError for invalid JSON", () => {
    const res = JsonRpc.parse("not-json");
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.error.code).toBe(-32700);
  });
});
