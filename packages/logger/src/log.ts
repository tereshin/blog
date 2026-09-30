export type LogFields = {
  level: 'info' | 'error';
  request_id: string;
  correlation_id: string;
  event: string;
};

export function writeLog(
  stream: { write: (line: string) => void },
  fields: LogFields,
): void {
  stream.write(`${JSON.stringify(fields)}\n`);
}
