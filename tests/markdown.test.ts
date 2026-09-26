// The export's titles and bodies carry one piece of markdown: *italics* for the
// names of works. Anything else would print as stray symbols, so it is refused
// rather than passed through.
import { describe, expect, it } from "vitest";
import { renderInline } from "../src/data/markdown.ts";

describe("renderInline", () => {
  it("turns *italics* into <em> and gives the plain text alongside", () => {
    expect(renderInline("In the *Phaedrus*, Thamus warns.")).toEqual({
      html: "In the <em>Phaedrus</em>, Thamus warns.",
      text: "In the Phaedrus, Thamus warns.",
    });
  });

  it("handles more than one italic run", () => {
    expect(renderInline("*Dr. Strangelove* and *Fail-Safe*").html).toBe(
      "<em>Dr. Strangelove</em> and <em>Fail-Safe</em>",
    );
  });

  it("escapes HTML, so copy can never inject markup", () => {
    expect(renderInline('Fish & chips <script>"x"</script>').html).toBe(
      "Fish &amp; chips &lt;script&gt;&quot;x&quot;&lt;/script&gt;",
    );
  });

  it("leaves apostrophes and other punctuation as written", () => {
    expect(renderInline("*Cat's Cradle*: it's 2001.").html).toBe("<em>Cat's Cradle</em>: it's 2001.");
  });

  it.each([
    ["an unclosed italic", "The *Titanic sank"],
    ["bold", "**Very** bad"],
    ["a link", "See [this](https://example.com)"],
    ["code", "Run `rm`"],
    ["an empty italic", "Nothing ** here"],
  ])("refuses %s", (_, source) => {
    expect(() => renderInline(source)).toThrow();
  });
});
