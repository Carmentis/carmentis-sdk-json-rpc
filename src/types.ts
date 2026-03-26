export type JsonRpcId = string | number | null;
export type JsonRpcParams = unknown[] | Record<string, unknown>;

export interface JsonRpcRequest<P extends JsonRpcParams = JsonRpcParams> {
  jsonrpc: "2.0";
  method: string;
  params?: P;
  id: JsonRpcId;
}

export interface JsonRpcNotification<P extends JsonRpcParams = JsonRpcParams> {
  jsonrpc: "2.0";
  method: string;
  params?: P;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcSuccessResponse<T = unknown> {
  jsonrpc: "2.0";
  result: T;
  id: JsonRpcId;
}

export interface JsonRpcErrorResponse {
  jsonrpc: "2.0";
  error: JsonRpcError;
  id: JsonRpcId;
}

export type JsonRpcResponse<T = unknown> =
  | JsonRpcSuccessResponse<T>
  | JsonRpcErrorResponse;

export interface BatchParseResult {
  valid: Array<JsonRpcRequest | JsonRpcNotification>;
  errors: Array<JsonRpcErrorResponse>;
}

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: JsonRpcErrorResponse };
