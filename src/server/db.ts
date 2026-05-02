import mysql from "mysql2/promise";
import { mysqlConfig } from "./env";

const globalForDb = globalThis as unknown as {
  __mysqlPool?: mysql.Pool;
};

export function getPool(): mysql.Pool {
  if (!globalForDb.__mysqlPool) {
    globalForDb.__mysqlPool = mysql.createPool(mysqlConfig());
  }
  return globalForDb.__mysqlPool;
}
