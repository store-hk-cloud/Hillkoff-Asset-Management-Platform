"use client";

type GlobalErrorProps = {
  reset: () => void;
};

export default function GlobalError({ reset }: GlobalErrorProps) {
  return (
    <html lang="th">
      <body>
        <main>
          <h1>แอปพลิเคชันขัดข้อง / Application error</h1>
          <button onClick={reset} type="button">
            ลองอีกครั้ง / Try again
          </button>
        </main>
      </body>
    </html>
  );
}
