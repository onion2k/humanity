// The test API must never ship. These hold the check the production build
// runs over its own output, which stops the build if any file carries the
// test API, so it cannot creep back in through a component or an import.
import { describe, expect, it } from "vitest";
import { TEST_API_MARK, filesWithTestApi } from "../integrations/test-api.ts";

describe("filesWithTestApi", () => {
  it("names a file that carries the test API, as it looks once minified", () => {
    const files = [
      { path: "index.html", text: '<script type="module" src="/_astro/index.js"></script>' },
      { path: "_astro/TestApi.js", text: `const a={state(){}};window.${TEST_API_MARK}=a;` },
    ];
    expect(filesWithTestApi(files)).toEqual(["_astro/TestApi.js"]);
  });

  it("passes a build with no trace of it", () => {
    expect(filesWithTestApi([{ path: "index.html", text: "<p>Panic &amp; Wonder</p>" }])).toEqual([]);
  });

  it("marks the test API by the name it takes on the page", () => {
    expect(TEST_API_MARK).toBe("__pw");
  });
});
