import * as v from "valibot";
import { NotificationSchema, RequestSchema } from "./schemas";
import type {
  BatchParseResult,
  JsonRpcErrorResponse,
  JsonRpcId,
  JsonRpcNotification,
  JsonRpcParams,
  JsonRpcRequest,
  JsonRpcSuccessResponse,
  ParseResult,
} from "./types";

export class JsonRpc {
  private constructor() {}

  static readonly ErrorCode = {
    ParseError: -32700,
    InvalidRequest: -32600,
    MethodNotFound: -32601,
    InvalidParams: -32602,
    InternalError: -32603,
  } as const;

  // ---- Error builders ----

  static error(
    id: JsonRpcId,
    code: number,
    message: string,
    data?: unknown
  ): JsonRpcErrorResponse {
    const response: JsonRpcErrorResponse = {
      jsonrpc: "2.0",
      error: { code, message },
      id,
    };
    if (data !== undefined) {
      response.error.data = data;
    }
    return response;
  }

  static parseError(data?: unknown): JsonRpcErrorResponse {
    return JsonRpc.error(null, JsonRpc.ErrorCode.ParseError, "Parse error", data);
  }

  static invalidRequest(id: JsonRpcId = null, data?: unknown): JsonRpcErrorResponse {
    return JsonRpc.error(id, JsonRpc.ErrorCode.InvalidRequest, "Invalid Request", data);
  }

  static methodNotFound(id: JsonRpcId, data?: unknown): JsonRpcErrorResponse {
    return JsonRpc.error(id, JsonRpc.ErrorCode.MethodNotFound, "Method not found", data);
  }

  static invalidParams(id: JsonRpcId, data?: unknown): JsonRpcErrorResponse {
    return JsonRpc.error(id, JsonRpc.ErrorCode.InvalidParams, "Invalid params", data);
  }

  static internalError(id: JsonRpcId, data?: unknown): JsonRpcErrorResponse {
    return JsonRpc.error(id, JsonRpc.ErrorCode.InternalError, "Internal error", data);
  }

  // ---- Success builder ----

  static success<T = unknown>(id: JsonRpcId, result: T): JsonRpcSuccessResponse<T> {
    return { jsonrpc: "2.0", result, id };
  }

  // ---- Type guards ----

  static isNotification(
    req: JsonRpcRequest | JsonRpcNotification
  ): req is JsonRpcNotification {
    return !("id" in req);
  }

  static isRequest(
    req: JsonRpcRequest | JsonRpcNotification
  ): req is JsonRpcRequest {
    return "id" in req;
  }

  static isSuccessResponse<T = unknown>(
    response: unknown
  ): response is JsonRpcSuccessResponse<T> {
    return (
      typeof response === "object" &&
      response !== null &&
      (response as Record<string, unknown>)["jsonrpc"] === "2.0" &&
      "result" in response &&
      !("error" in response)
    );
  }

  static isErrorResponse(response: unknown): response is JsonRpcErrorResponse {
    return (
      typeof response === "object" &&
      response !== null &&
      (response as Record<string, unknown>)["jsonrpc"] === "2.0" &&
      "error" in response &&
      !("result" in response)
    );
  }

  static isBatchResult(value: unknown): value is BatchParseResult {
    return (
      typeof value === "object" &&
      value !== null &&
      "valid" in value &&
      "errors" in value
    );
  }

  // ---- Parsing ----

  private static parseRawObject(
    raw: Record<string, unknown>
  ): ParseResult<JsonRpcRequest | JsonRpcNotification> {
    const hasId = "id" in raw;

    if (hasId) {
      const result = v.safeParse(RequestSchema, raw);
      if (!result.success) {
        const rawId = raw["id"];
        const id: JsonRpcId =
          typeof rawId === "string" ||
          (typeof rawId === "number" && Number.isInteger(rawId)) ||
          rawId === null
            ? (rawId as JsonRpcId)
            : null;
        return { ok: false, error: JsonRpc.invalidRequest(id) };
      }
      const req: JsonRpcRequest = {
        jsonrpc: "2.0",
        method: result.output.method,
        id: result.output.id,
      };
      if (result.output.params !== undefined) {
        req.params = result.output.params as JsonRpcParams;
      }
      return { ok: true, value: req };
    } else {
      const result = v.safeParse(NotificationSchema, raw);
      if (!result.success) {
        return { ok: false, error: JsonRpc.invalidRequest(null) };
      }
      const notif: JsonRpcNotification = {
        jsonrpc: "2.0",
        method: result.output.method,
      };
      if (result.output.params !== undefined) {
        notif.params = result.output.params as JsonRpcParams;
      }
      return { ok: true, value: notif };
    }
  }

  static parseRequest(
    input: string | unknown
  ): ParseResult<JsonRpcRequest | JsonRpcNotification> {
    let parsed: unknown;

    if (typeof input === "string") {
      try {
        parsed = JSON.parse(input);
      } catch {
        return { ok: false, error: JsonRpc.parseError() };
      }
    } else {
      parsed = input;
    }

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { ok: false, error: JsonRpc.invalidRequest(null) };
    }

    return JsonRpc.parseRawObject(parsed as Record<string, unknown>);
  }

  static parseBatch(
    input: string | unknown
  ): ParseResult<BatchParseResult> {
    let parsed: unknown;

    if (typeof input === "string") {
      try {
        parsed = JSON.parse(input);
      } catch {
        return { ok: false, error: JsonRpc.parseError() };
      }
    } else {
      parsed = input;
    }

    if (!Array.isArray(parsed)) {
      return { ok: false, error: JsonRpc.invalidRequest(null) };
    }

    if (parsed.length === 0) {
      return { ok: false, error: JsonRpc.invalidRequest(null) };
    }

    const valid: Array<JsonRpcRequest | JsonRpcNotification> = [];
    const errors: Array<JsonRpcErrorResponse> = [];

    for (const item of parsed) {
      if (typeof item !== "object" || item === null || Array.isArray(item)) {
        errors.push(JsonRpc.invalidRequest(null));
        continue;
      }
      const result = JsonRpc.parseRawObject(item as Record<string, unknown>);
      if (result.ok) {
        valid.push(result.value);
      } else {
        errors.push(result.error);
      }
    }

    return { ok: true, value: { valid, errors } };
  }

  static parse(
    input: string | unknown
  ): ParseResult<(JsonRpcRequest | JsonRpcNotification) | BatchParseResult> {
    let parsed: unknown;

    if (typeof input === "string") {
      try {
        parsed = JSON.parse(input);
      } catch {
        return { ok: false, error: JsonRpc.parseError() };
      }
    } else {
      parsed = input;
    }

    if (Array.isArray(parsed)) {
      return JsonRpc.parseBatch(parsed);
    }

    return JsonRpc.parseRequest(parsed);
  }
}
