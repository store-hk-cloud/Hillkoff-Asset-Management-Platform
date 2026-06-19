interface NDEFRecord {
  readonly recordType: string;
  readonly mediaType?: string;
  readonly data?: DataView;
}

interface NDEFMessage {
  readonly records: readonly NDEFRecord[];
}

interface NDEFReadingEvent extends Event {
  readonly message: NDEFMessage;
  readonly serialNumber: string;
}

interface NDEFReader extends EventTarget {
  scan(options?: { signal?: AbortSignal }): Promise<void>;
  write(
    message:
      | string
      | {
          records: readonly {
            recordType: "url" | "text";
            data: string;
          }[];
        },
    options?: { overwrite?: boolean; signal?: AbortSignal },
  ): Promise<void>;
  makeReadOnly(): Promise<void>;
  onreading: ((event: NDEFReadingEvent) => void) | null;
  onreadingerror: ((event: Event) => void) | null;
}

declare const NDEFReader: {
  prototype: NDEFReader;
  new (): NDEFReader;
};
