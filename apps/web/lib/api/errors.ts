import {
  apiErrorSchema,
  type ApiErrorCode,
} from "@helvety-cloud/api-contract";
import { NextResponse } from "next/server";

export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number,
): NextResponse {
  const body = apiErrorSchema.parse({
    error: { code, message },
  });
  return NextResponse.json(body, { status });
}

export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}
