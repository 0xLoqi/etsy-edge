/**
 * Test fitTag strategies against the Etsy optimization rules.
 *
 * Rules (from the AI prompt):
 *  1. Exactly 13 tags returned
 *  2. Every tag ≤ 20 characters
 *  3. Every tag is multi-word (2-4 words)
 *  4. Tags must not repeat words in the optimized title (can't test here — needs title context)
 */

// --- Strategies ---

/** Strategy A: Current code — hard slice at 20 chars */
function sliceAt20(raw) {
  return raw.trim().toLowerCase().slice(0, 20);
}

/** Strategy B (my first fix): Trim to last whole word within 20 chars */
function trimToWord(raw) {
  const tag = raw.trim().toLowerCase();
  if (tag.length <= 20) return tag;
  const trimmed = tag.slice(0, 20);
  const lastSpace = trimmed.lastIndexOf(" ");
  return lastSpace > 0 ? trimmed.slice(0, lastSpace) : trimmed;
}

/** Strategy C (my second fix): Drop tags over 20 chars entirely */
function dropOverlong(raw) {
  const tag = raw.trim().toLowerCase();
  return tag.length <= 20 ? tag : null;
}

// --- Validation ---

function validate(tag, strategyName) {
  const issues = [];
  if (tag === null) {
    issues.push("DROPPED (tag count will be < 13)");
    return issues;
  }
  if (tag.length > 20) issues.push(`over 20 chars (${tag.length})`);
  if (tag.length === 0) issues.push("empty string");
  const words = tag.split(/\s+/).filter(Boolean);
  if (words.length < 2) issues.push(`single word (need 2-4)`);
  // Check for obviously truncated words (ends mid-word compared to a full word)
  if (tag.length === 20 && !tag.endsWith(" ")) {
    // Could be a natural 20-char tag or could be truncated — flag it
    issues.push("suspiciously exactly 20 chars (possible truncation)");
  }
  return issues;
}

// --- Test Data: Real AI-generated tags from the bug report ---
const testTags = [
  "woodland animal print",      // 21 chars
  "nursery wall decor",          // 18 chars — fine
  "framed canvas art",           // 17 chars — fine
  "triptych wall art",           // 17 chars — fine
  "living room decor",           // 17 chars — fine
  "forest animal artwork",       // 21 chars
  "giclee canvas prints",        // 20 chars — exactly at limit
  "horse art gift",              // 14 chars — fine
  "nature inspired decor",       // 21 chars
  "bedroom wall art set",        // 20 chars — exactly at limit
  "animal canvas triptych",      // 22 chars
  "woodland nursery decor",      // 22 chars
  "ready to hang art",           // 17 chars — fine
];

console.log(`Testing ${testTags.length} tags from real AI output\n`);
console.log("=".repeat(90));

const strategies = [
  { name: "A: slice(0,20) [current]", fn: sliceAt20 },
  { name: "B: trim to word boundary", fn: trimToWord },
  { name: "C: drop overlong tags",    fn: dropOverlong },
];

for (const { name, fn } of strategies) {
  console.log(`\nStrategy: ${name}`);
  console.log("-".repeat(90));

  const results = testTags.map(fn);
  let totalIssues = 0;
  let tagCount = results.filter(r => r !== null).length;

  for (let i = 0; i < testTags.length; i++) {
    const original = testTags[i];
    const result = results[i];
    const issues = validate(result, name);

    const status = issues.length === 0 ? "OK" : "FAIL";
    const display = result === null ? "(dropped)" : `"${result}"`;
    console.log(
      `  ${status.padEnd(4)} | "${original}" (${original.length}ch) → ${display} (${result?.length ?? 0}ch)${issues.length ? " — " + issues.join(", ") : ""}`
    );
    totalIssues += issues.length;
  }

  console.log(`\n  Summary: ${tagCount}/13 tags kept, ${totalIssues} issues`);
  if (tagCount < 13) console.log(`  ⚠️  RULE VIOLATION: Need exactly 13 tags, only have ${tagCount}`);
}

console.log("\n" + "=".repeat(90));
console.log("\nVerdict:");
console.log("  A (current):  Keeps 13 tags but produces garbled truncations like 'woodland animal prin'");
console.log("  B (word trim): Keeps 13 tags, tags are clean but shorter (loses specificity)");
console.log("  C (drop):     Clean tags but loses count — VIOLATES the 13-tag rule");
