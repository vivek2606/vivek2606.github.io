import { useId, useRef, useState } from "react";
import Editor from "react-simple-code-editor";
import { getRuntime } from "../runtimes";
import { highlight } from "../lib/prism-languages";
import "prismjs/themes/prism-tomorrow.css";

interface CodeRunnerProps {
  lang: string;
  code: string;
}

type Status = "idle" | "loading" | "ready" | "running";

export default function CodeRunner({ lang, code: initialCode }: CodeRunnerProps) {
  const [code, setCode] = useState(initialCode.trim());
  const [status, setStatus] = useState<Status>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [output, setOutput] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [copied, setCopied] = useState(false);
  const runtime = useRef(getRuntime(lang)).current;
  const outputId = useId();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can fail (permissions, insecure context); the
      // button label just won't flip to "Copied!" — no further handling.
    }
  }

  async function handleRun() {
    setOutput(null);
    setIsError(false);
    try {
      if (!runtime.isLoaded()) {
        setStatus("loading");
        await runtime.load(setStatusMessage);
      }
      setStatus("running");
      const result = await runtime.run(code);
      setIsError(!result.ok);
      setOutput(result.ok ? result.stdout || "(no output)" : result.error ?? "Unknown error");
    } catch (err) {
      setIsError(true);
      setOutput(err instanceof Error ? err.message : String(err));
    } finally {
      setStatus("ready");
    }
  }

  const isBusy = status === "loading" || status === "running";

  return (
    <div className="code-runner">
      <div className="code-runner__header">
        <span className="code-runner__lang">{runtime.label}</span>
        <div className="code-runner__actions">
          <button type="button" onClick={handleCopy} className="code-runner__copy">
            {copied ? "Copied!" : "Copy"}
          </button>
          <button type="button" onClick={handleRun} disabled={isBusy} className="code-runner__run">
            {isBusy ? (
              <span className="code-runner__spinner" aria-hidden="true" />
            ) : (
              <svg className="code-runner__play-icon" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M4 2.5v11l9-5.5-9-5.5Z" />
              </svg>
            )}
            <span>{status === "loading" ? "Loading…" : status === "running" ? "Running…" : "Run"}</span>
          </button>
        </div>
      </div>
      <Editor
        value={code}
        onValueChange={setCode}
        highlight={(value) => highlight(value, lang)}
        padding={16}
        textareaClassName="code-runner__editor-input"
        preClassName="code-runner__editor-pre"
        className="code-runner__editor"
        style={{ fontFamily: "var(--mono-font)", fontSize: "0.9rem" }}
        aria-label={`Editable ${runtime.label} code`}
      />
      {isBusy && statusMessage && <p className="code-runner__status">{statusMessage}</p>}
      {output !== null && (
        <pre
          id={outputId}
          className={`code-runner__output${isError ? " code-runner__output--error" : ""}`}
        >
          {output}
        </pre>
      )}
    </div>
  );
}
