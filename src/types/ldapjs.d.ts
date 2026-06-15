declare module "ldapjs" {
  export interface LdapAttribute {
    type: string;
    values: Buffer[] | string[];
  }

  export interface SearchEntry {
    attributes: LdapAttribute[];
  }

  export interface Client {
    bind(dn: string, password: string, callback: (error: Error | null) => void): void;
    unbind(callback?: () => void): void;
    destroy(): void;
    search(
      base: string,
      options: Record<string, unknown>,
      callback: (error: Error | null, response: SearchCallbackResponse) => void
    ): void;
  }

  export interface SearchCallbackResponse {
    on(event: "searchEntry", listener: (entry: SearchEntry) => void): void;
    on(event: "error", listener: (error: Error) => void): void;
    on(event: "end", listener: () => void): void;
  }

  export function createClient(options: Record<string, unknown>): Client;
}
