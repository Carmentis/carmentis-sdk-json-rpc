# @cmts-dev/carmentis-sdk-json-rpc

TypeScript SDK for parsing and building [JSON-RPC 2.0](https://www.jsonrpc.org/specification) messages, with runtime validation powered by [valibot](https://valibot.dev).

## Installation

```bash
npm install @cmts-dev/carmentis-sdk-json-rpc valibot
```

## Quick start

```ts
import { JsonRpc } from "@cmts-dev/carmentis-sdk-json-rpc";

// Parse an incoming request (string or object)
const result = JsonRpc.parseRequest(rawInput);

if (!result.ok) {
  // result.error is a ready-to-send JsonRpcErrorResponse
  send(result.error);
} else if (JsonRpc.isRequest(result.value)) {
  // Regular request — you must reply
  const { method, params, id } = result.value;
  send(JsonRpc.success(id, { answer: 42 }));
} else {
  // Notification — no reply needed
  const { method, params } = result.value;
}
```

---

## API

### `JsonRpc` — static class

#### Parsing

| Method | Description |
|---|---|
| `JsonRpc.parse(input)` | Auto-detects single request or batch |
| `JsonRpc.parseRequest(input)` | Parses a single request or notification |
| `JsonRpc.parseBatch(input)` | Parses a batch array |

All parse methods accept either a `string` (raw JSON) or a pre-parsed value.
They return a `ParseResult<T>`: `{ ok: true, value }` or `{ ok: false, error }`.

`parseBatch` returns `ParseResult<BatchParseResult>` where `value.valid` holds the valid items and `value.errors` holds per-item error responses.

#### Building responses

```ts
JsonRpc.success(id, result)        // { jsonrpc: "2.0", result, id }
JsonRpc.error(id, code, message)   // generic error response
JsonRpc.parseError()               // code -32700
JsonRpc.invalidRequest(id?)        // code -32600
JsonRpc.methodNotFound(id)         // code -32601
JsonRpc.invalidParams(id)          // code -32602
JsonRpc.internalError(id)          // code -32603
```

#### Error codes

```ts
JsonRpc.ErrorCode.ParseError      // -32700
JsonRpc.ErrorCode.InvalidRequest  // -32600
JsonRpc.ErrorCode.MethodNotFound  // -32601
JsonRpc.ErrorCode.InvalidParams   // -32602
JsonRpc.ErrorCode.InternalError   // -32603
```

#### Type guards

```ts
JsonRpc.isRequest(req)          // req is JsonRpcRequest
JsonRpc.isNotification(req)     // req is JsonRpcNotification
JsonRpc.isSuccessResponse(res)  // res is JsonRpcSuccessResponse
JsonRpc.isErrorResponse(res)    // res is JsonRpcErrorResponse
JsonRpc.isBatchResult(value)    // value is BatchParseResult
```

---

## Examples

### Single request / response

```ts
// --> {"jsonrpc":"2.0","method":"subtract","params":[42,23],"id":1}
const result = JsonRpc.parseRequest(input);
// <-- {"jsonrpc":"2.0","result":19,"id":1}
send(JsonRpc.success(1, 19));
```

### Notification (no reply)

```ts
// --> {"jsonrpc":"2.0","method":"update","params":[1,2,3,4,5]}
const result = JsonRpc.parseRequest(input);
if (result.ok && JsonRpc.isNotification(result.value)) {
  // process silently, do not send a response
}
```

### Batch request

```ts
// --> [{"jsonrpc":"2.0","method":"sum","params":[1,2,4],"id":"1"}, ...]
const result = JsonRpc.parseBatch(input);
if (!result.ok) {
  return send(result.error); // invalid JSON or empty array
}

const responses: JsonRpcResponse[] = [];

for (const req of result.value.valid) {
  if (JsonRpc.isNotification(req)) continue; // no reply for notifications
  const dispatch = registry.dispatch(req);
  responses.push(
    dispatch.ok
      ? JsonRpc.success(req.id, await handle(dispatch))
      : dispatch.error
  );
}

// Include per-item parse errors in the batch response
responses.push(...result.value.errors);

if (responses.length > 0) send(responses);
```

### Error handling

```ts
const result = JsonRpc.parseRequest(input);
if (!result.ok) {
  // Already a valid JsonRpcErrorResponse, send it directly
  return send(result.error);
}

try {
  const value = await processRequest(result.value);
  send(JsonRpc.success(result.value.id, value));
} catch (err) {
  send(JsonRpc.internalError(result.value.id, { message: String(err) }));
}
```

---

## Types

```ts
type JsonRpcId = string | number | null;
type JsonRpcParams = unknown[] | Record<string, unknown>;

interface JsonRpcRequest<P = JsonRpcParams> { jsonrpc: "2.0"; method: string; params?: P; id: JsonRpcId }
interface JsonRpcNotification<P = JsonRpcParams> { jsonrpc: "2.0"; method: string; params?: P }
interface JsonRpcSuccessResponse<T = unknown> { jsonrpc: "2.0"; result: T; id: JsonRpcId }
interface JsonRpcErrorResponse { jsonrpc: "2.0"; error: JsonRpcError; id: JsonRpcId }
interface JsonRpcError { code: number; message: string; data?: unknown }

interface BatchParseResult {
  valid: Array<JsonRpcRequest | JsonRpcNotification>;
  errors: Array<JsonRpcErrorResponse>;
}

type ParseResult<T> = { ok: true; value: T } | { ok: false; error: JsonRpcErrorResponse };
```
