import type { RequestHandler } from "express";

interface ValidateSchema {
  parse: (data: any) => any;
}

export const validate =
  (schema: ValidateSchema): RequestHandler =>
  (req, _res, next) => {
    const validated = schema.parse({
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (validated.body) req.body = validated.body;
    if (validated.params) req.params = validated.params;
    if (validated.query) req.query = validated.query;

    if (validated.headers?.["x-client-type"])
      req.clientType = validated.headers["x-client-type"];

    next();
  };
