import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { fieldErrors } from "./validation";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

/** Turn thrown errors (Zod, BookingError, generic) into safe JSON responses. */
export function handleError(err: unknown) {
  if (err instanceof ZodError) {
    return NextResponse.json(
      { ok: false, error: "Please check the highlighted fields.", fields: fieldErrors(err) },
      { status: 422 },
    );
  }
  const e = err as { name?: string; code?: string; message?: string };
  if (e?.name === "BookingError") {
    return fail(e.message ?? "Booking error", 409, { code: e.code });
  }
  console.error("API error:", err);
  return fail("Something went wrong. Please try again.", 500);
}
