// Turns the tokens into tokens.css. The chassis and every era's raw colours go
// on :root, and each era theme maps the plain token names onto its own values.
// Keeping every era's values on :root at once is what lets a seam mix any two
// eras later, without the page knowing any colour itself.
import { aliasTarget, isAlias, type Tokens } from "./tokens.ts";

function decl(name: string, value: string | number): string {
  return `  --${name}: ${value};`;
}

/** The chassis type styles as custom properties: size, line height, weight and tracking. */
function typeDecls(tokens: Tokens): string[] {
  return tokens.typeStyles.flatMap((style) => {
    if (style.name.startsWith("display-")) return [decl(`${style.name}-weight`, style.fontWeight)];
    const lines = [
      decl(`type-${style.name}-size`, style.fontSize),
      decl(`type-${style.name}-line`, style.lineHeight),
      decl(`type-${style.name}-weight`, style.fontWeight),
    ];
    if (style.letterSpacing) lines.push(decl(`type-${style.name}-track`, style.letterSpacing));
    return lines;
  });
}

export function tokensToCss(tokens: Tokens): string {
  const root = [
    ...tokens.spacing.map((t) => decl(t.name, t.value)),
    ...tokens.radius.map((t) => decl(t.name, t.value)),
    ...tokens.duration.map((t) => decl(t.name, t.value)),
    ...tokens.easing.map((t) => decl(t.name, t.value)),
    ...Object.entries(tokens.families).map(([name, value]) => decl(`font-${name}`, value)),
    ...typeDecls(tokens),
    ...Object.entries(tokens.constants).map(([name, value]) => decl(name, value)),
    ...tokens.eras.flatMap((era) =>
      Object.entries(tokens.colours).flatMap(([name, values]) => {
        const value = values[era];
        return value === undefined || isAlias(value) ? [] : [decl(`${era}-${name}`, value)];
      }),
    ),
  ];

  const themes = tokens.eras.map((era, i) => {
    const selector = i === 0 ? `:root, [data-theme="${era}"]` : `[data-theme="${era}"]`;
    const lines = Object.entries(tokens.colours).map(([name, values]) => {
      const value = values[era] ?? "";
      return decl(name, isAlias(value) ? `var(--${aliasTarget(value)})` : `var(--${era}-${name})`);
    });
    return `${selector} {\n${lines.join("\n")}\n}`;
  });

  return [
    "/* Generated from design-system/tokens.json by src/tokens/css.ts. Do not edit by hand. */",
    `:root {\n${root.join("\n")}\n}`,
    ...themes,
    "",
  ].join("\n\n");
}
