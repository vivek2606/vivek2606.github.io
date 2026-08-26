import Prism from "prismjs";
import "prismjs/components/prism-python";
import "prismjs/components/prism-r";
import "prismjs/components/prism-julia";
import "prismjs/components/prism-haskell";

// Prism's grammar keys don't all match our own runtime ids 1:1.
const GRAMMAR_BY_LANG: Record<string, string> = {
  python: "python",
  "python-full": "python",
  r: "r",
  julia: "julia",
  haskell: "haskell",
};

export function highlight(code: string, lang: string): string {
  const grammar = Prism.languages[GRAMMAR_BY_LANG[lang.toLowerCase()] ?? ""];
  if (!grammar) return code;
  return Prism.highlight(code, grammar, lang);
}
