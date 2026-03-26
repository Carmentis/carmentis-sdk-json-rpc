import * as v from "valibot";

export const IdSchema = v.union([
  v.string(),
  v.pipe(v.number(), v.integer()),
  v.null_(),
]);

export const ParamsSchema = v.union([
  v.array(v.unknown()),
  v.record(v.string(), v.unknown()),
]);

const MethodSchema = v.pipe(
  v.string(),
  v.check(
    (s) => !s.startsWith("rpc."),
    "Method names starting with 'rpc.' are reserved"
  )
);

const BaseEntries = {
  jsonrpc: v.literal("2.0" as const),
  method: MethodSchema,
  params: v.optional(ParamsSchema),
};

export const RequestSchema = v.object({
  ...BaseEntries,
  id: IdSchema,
});

export const NotificationSchema = v.object({
  ...BaseEntries,
});
