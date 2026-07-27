"use client";

import { useCallback, useEffect, useRef, type ChangeEvent, type FormEvent } from "react";

export type FormDraft = Record<string, boolean | string>;

type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function getControl(form: HTMLFormElement, name: string): FormControl | undefined {
  const control = form.elements.namedItem(name);
  return control instanceof HTMLInputElement ||
    control instanceof HTMLSelectElement ||
    control instanceof HTMLTextAreaElement
    ? control
    : undefined;
}

function readStoredDraft(storageKey: string, fields: readonly string[]): FormDraft {
  if (typeof window === "undefined") return {};
  try {
    const stored = window.sessionStorage.getItem(storageKey);
    if (!stored) return {};
    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object") return {};

    const draft: FormDraft = {};
    for (const field of fields) {
      const value = (parsed as Record<string, unknown>)[field];
      if (typeof value === "string" || typeof value === "boolean") draft[field] = value;
    }
    return draft;
  } catch {
    return {};
  }
}

function readFormDraft(
  storageKey: string,
  form: HTMLFormElement,
  fields: readonly string[],
): FormDraft {
  const draft = readStoredDraft(storageKey, fields);
  for (const field of fields) {
    const control = getControl(form, field);
    if (!control) continue;
    draft[field] =
      control instanceof HTMLInputElement && control.type === "checkbox"
        ? control.checked
        : control.value;
  }
  return draft;
}

function applyDraft(form: HTMLFormElement, draft: FormDraft) {
  for (const [name, value] of Object.entries(draft)) {
    const control = getControl(form, name);
    if (!control) continue;
    if (control instanceof HTMLInputElement && control.type === "checkbox") {
      if (typeof value === "boolean") control.checked = value;
      continue;
    }
    if (typeof value === "string") control.value = value;
  }
}

function saveStoredDraft(storageKey: string, draft: FormDraft) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(draft));
  } catch {
    // Private browsing and restricted storage should not block form submission.
  }
}

export function useFormDraft({
  storageKey,
  fields,
  enabled = true,
  error,
  success,
  resultKey,
  restoreKey,
  onRestore,
}: {
  storageKey: string;
  fields: readonly string[];
  enabled?: boolean;
  error?: string;
  success?: boolean;
  resultKey?: unknown;
  restoreKey?: string;
  onRestore?: (draft: FormDraft) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const submittedDraftRef = useRef<FormDraft | null>(null);
  const onRestoreRef = useRef(onRestore);
  onRestoreRef.current = onRestore;
  const fieldKey = fields.join("\u0000");

  const restoreStored = useCallback(() => {
    if (!formRef.current) return;
    const draft = readStoredDraft(storageKey, fields);
    applyDraft(formRef.current, draft);
    onRestoreRef.current?.(draft);
  }, [fieldKey, storageKey]);

  useEffect(() => {
    if (enabled) restoreStored();
  }, [enabled, restoreKey, restoreStored]);

  useEffect(() => {
    if (success) {
      try {
        window.sessionStorage.removeItem(storageKey);
      } catch {
        // Restricted storage should not affect a successful save.
      }
      submittedDraftRef.current = null;
      return;
    }
    if (error && formRef.current) {
      const draft = submittedDraftRef.current ?? readStoredDraft(storageKey, fields);
      applyDraft(formRef.current, draft);
      onRestoreRef.current?.(draft);
    }
  }, [error, fieldKey, resultKey, storageKey, success]);

  const save = useCallback(
    (form: HTMLFormElement) => {
      const draft = readFormDraft(storageKey, form, fields);
      submittedDraftRef.current = draft;
      saveStoredDraft(storageKey, draft);
    },
    [fieldKey, storageKey],
  );

  const onInput = useCallback(
    (event: FormEvent<HTMLFormElement>) => save(event.currentTarget),
    [save],
  );
  const onChange = useCallback(
    (event: ChangeEvent<HTMLFormElement>) => save(event.currentTarget),
    [save],
  );
  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => save(event.currentTarget),
    [save],
  );

  return { formRef, onInput, onChange, onSubmit };
}
