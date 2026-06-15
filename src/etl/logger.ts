type LogLevel = "INFO" | "WARN" | "ERROR" | "OK";

function formatMessage(level: LogLevel, message: string): string {
  const ts = new Date().toISOString();
  return `[${ts}] [${level}] ${message}`;
}

export const etlLog = {
  info: (msg: string) => console.log(formatMessage("INFO", msg)),
  warn: (msg: string) => console.warn(formatMessage("WARN", msg)),
  error: (msg: string) => console.error(formatMessage("ERROR", msg)),
  ok: (msg: string) => console.log(formatMessage("OK", msg)),
};
