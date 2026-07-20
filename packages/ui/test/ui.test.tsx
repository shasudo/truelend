import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Field, Textarea } from "../src/field";
import { cx } from "../src/cx";

void test("cx gives callers deterministic control over conflicting Tailwind classes", () => {
  assert.equal(
    cx("max-w-6xl bg-white min-h-28", "max-w-2xl bg-navy-900 min-h-16"),
    "max-w-2xl bg-navy-900 min-h-16",
  );
  assert.equal(cx("hover:bg-red-700", false, "hover:bg-navy-900"), "hover:bg-navy-900");
});

void test("Field composes existing descriptions with its validation error", () => {
  const markup = renderToStaticMarkup(
    <Field label="Message" htmlFor="message" error="Message is required">
      <Textarea id="message" aria-describedby="message-count" />
    </Field>,
  );

  assert.match(markup, /aria-describedby="message-count message-error"/);
  assert.match(markup, /aria-invalid="true"/);
  assert.match(markup, /id="message-error" role="alert"/);
});
