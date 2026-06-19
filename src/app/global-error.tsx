"use client";

type GlobalErrorProps = {
  reset: () => void;
};

export default function GlobalError({ reset }: GlobalErrorProps) {
  return (
    <html lang="th">
      <body>
        <main>
          <h1>Application error</h1>
          <button onClick={reset} type="button">
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
