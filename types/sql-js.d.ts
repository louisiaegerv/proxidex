declare module 'sql.js' {
  export interface SqlJsStatic {
    Database: new (data?: Buffer | null) => Database
  }
  
  export interface Database {
    exec(sql: string, params?: (string | number)[]): QueryResults[]
    run(sql: string, params?: (string | number)[]): void
    prepare(sql: string): Statement
    export(): Uint8Array
    close(): void
  }
  
  export interface Statement {
    run(params?: (string | number)[]): void
    get(params?: (string | number)[]): any
    free(): void
  }
  
  export interface QueryResults {
    columns: string[]
    values: (string | number | null)[][]
  }
  
  export interface Config {
    locateFile?: (file: string) => string
  }
  
  function initSqlJs(config?: Config): Promise<SqlJsStatic>
  
  export default initSqlJs
}
