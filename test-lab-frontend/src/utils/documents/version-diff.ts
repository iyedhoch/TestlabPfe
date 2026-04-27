import { IGenerateCahierPayload, IGenerateFsdPayload } from "@/services";

type ComparablePayload = IGenerateFsdPayload | IGenerateCahierPayload | Record<string, unknown>;

const TRANSIENT_KEYS = new Set([
  "createdByName",
  "language",
  "mode",
  "sourceVersionId",
  "threadId",
]);

function normalizeScalar(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === "string") {
    return value.replace(/\u00a0/g, " ").trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  return value;
}

function normalizeComparableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeComparableValue(item));
  }

  if (value && typeof value === "object") {
    const normalizedObject = Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((accumulator, key) => {
        if (TRANSIENT_KEYS.has(key)) {
          return accumulator;
        }

        const nextValue = normalizeComparableValue(
          (value as Record<string, unknown>)[key]
        );

        if (nextValue !== undefined) {
          accumulator[key] = nextValue;
        }

        return accumulator;
      }, {});

    const authorValue = normalizedObject.author;
    const authorsValue = normalizedObject.authors;

    if (typeof authorValue === "string" && !Array.isArray(authorsValue)) {
      normalizedObject.authors = authorValue
        .split(";")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }

    if (Array.isArray(authorsValue) && typeof authorValue !== "string") {
      normalizedObject.author = (authorsValue as string[])
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .join("; ");
    }

    return normalizedObject;
  }

  return normalizeScalar(value);
}

function toComparablePayload(payload: ComparablePayload | null | undefined): Record<string, unknown> {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  return normalizeComparableValue(payload) as Record<string, unknown>;
}

export function hasDocumentPayloadChanges(
  currentPayload: ComparablePayload,
  sourcePayloadSnapshot?: Record<string, unknown> | null
): boolean {
  const currentComparable = JSON.stringify(toComparablePayload(currentPayload));
  const sourceComparable = JSON.stringify(toComparablePayload(sourcePayloadSnapshot || {}));

  return currentComparable !== sourceComparable;
}

export function applyEditModeVersionBump<T extends { version?: string }>(
  payload: T,
  options: {
    mode: "create" | "edit";
    sourceVersionNumber?: number | null;
    sourcePayloadSnapshot?: Record<string, unknown> | null;
  }
): T {
  if (options.mode !== "edit" || !options.sourceVersionNumber) {
    return payload;
  }

  const sourceVersion = String((options.sourcePayloadSnapshot?.version as string) || "").trim();
  const currentVersion = String(payload.version || "").trim();

  if (currentVersion.length > 0 && sourceVersion.length > 0 && currentVersion !== sourceVersion) {
    return payload;
  }

  return {
    ...payload,
    version: String(options.sourceVersionNumber + 1),
  };
}
