import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Field, Textarea } from "../src/field";
import { cx } from "../src/cx";
import { draftValueWins } from "../src/form-draft";

void test("a stale blank draft slot never erases a value the form was rendered with", () => {
  // The deep-link case: /enquiry?product=home-loan with an older draft that has
  // no product. Restoring "" here both wipes the choice and, on a controlled
  // select, leaves the DOM disagreeing with React about what will be submitted.
  assert.equal(draftValueWins("", "home-loan", true), false);
  // A real saved value still restores, and a blank still applies to a blank.
  assert.equal(draftValueWins("personal-loan", "home-loan", true), true);
  assert.equal(draftValueWins("personal-loan", "", true), true);
  assert.equal(draftValueWins("", "", true), true);
  // Re-filling after a rejected submit replays what the user just typed, so a
  // blank there means they cleared the field on purpose and must be honoured.
  assert.equal(draftValueWins("", "home-loan", false), true);
});

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
