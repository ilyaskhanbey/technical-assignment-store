import { JSONArray, JSONObject, JSONPrimitive } from "./json-types";
import _ from 'lodash'
export type Permission = "r" | "w" | "rw" | "none";

export type StoreResult = Store | JSONPrimitive | undefined;

export type StoreValue =
  | JSONObject
  | JSONArray
  | StoreResult
  | (() => StoreResult);

export interface IStore {
  defaultPolicy: Permission;
  allowedToRead(key: string): boolean;
  allowedToWrite(key: string): boolean;
  read(path: string): StoreResult;
  write(path: string, value: StoreValue): StoreValue;
  writeEntries(entries: JSONObject): void;
  entries(): JSONObject;
}


// export function Restrict(permission: Permission = "none"): any {
//   return function (target: any, propertyKey: string): void {

//     if (!target.constructor.prototype._permissions) {
//       target.constructor.prototype._permissions = {};
//     }

//     target.constructor.prototype._permissions[propertyKey] = permission;
//   };
// }

export function Restrict(permission: Permission = "none"): any {
  return function (target: any, propertyKey: string): void {

    if (!target.hasOwnProperty('_permissions')) {
      target._permissions = {};
    }
    target._permissions[propertyKey] = permission;

  };
}



export class Store implements IStore {
  defaultPolicy: Permission = "rw";
  _permissions: Record<string, Permission> = {};


  constructor() {
    //??? 
    Object.assign(this._permissions, Object.getPrototypeOf(this)._permissions);

  }


  checkPermission(key: string, permissionType: Permission): boolean {
    const keyParts = key.split('.');



    for (let i = keyParts.length; i > 0; i--) {
      const partialKey = keyParts.slice(0, i).join('.');


      if (this._permissions[partialKey]) {
        return this._permissions[partialKey].includes(permissionType);
      }
    }

    return this.defaultPolicy.includes(permissionType);
  }

  allowedToRead(key: string): boolean {
    return this.checkPermission(key, 'r');
  }

  allowedToWrite(key: string): boolean {
    return this.checkPermission(key, 'w');
  }

  read(path: string): StoreResult {

    // const dotPath = path.replace(/:/g, '.');
    // if (this.allowedToRead(dotPath)) {


    //   return _.get(this, dotPath)
    // } else {
    //   throw new Error(`Permission denied: cannot read ${path}`);
    // }

    //TO be able to run a function
    const dotPath = path.replace(/:/g, '.');

    if (!this.allowedToRead(dotPath)) {
      throw new Error(`Permission denied: cannot read ${path}`);
    }

    const keys = dotPath.split('.');
    let current: any = this;

    for (const key of keys) {
      if (typeof current === 'function') {
        current = current();
      }
      current = current[key];

      if (current === undefined) {
        return undefined;
      }
    }

    return current;
  }

  write(path: string, value: StoreValue): StoreValue {

    const dotPath = path.replace(/:/g, '.');
    if (this.allowedToWrite(dotPath)) {
      _.set(this, dotPath, value);
      // (this as any)[path] = value;
      return value;
    } else {
      throw new Error(`Permission denied: cannot write to ${dotPath}`);
    }
  }

  writeEntries(entries: JSONObject): void {

    for (const key of _.keys(entries)) {
      if (this.allowedToWrite(key)) {
        _.set(this, key, entries[key]);

      } else {
        throw new Error(`Permission denied: cannot write to ${key}`);
      }
    }
  }

  entries(): JSONObject {


    const result_: JSONObject = {};



    const processEntry = (current: any, currentPath: string = '', result: any = result_) => {
        for (const key of Object.keys(current)) {
            if (key === '_permissions' || key === 'defaultPolicy') {
                continue;
            }

            const fullPath = currentPath ? `${currentPath}.${key}` : key;

            if (this.allowedToRead(fullPath)) {
                const value = current[key];

                if (value instanceof Store) {
                    result[key] = value.entries(); 
                } else if (typeof value === 'object' && value !== null) {
                    result[key] = {};
                    processEntry(value, fullPath, result[key]); 
                } else {
                    result[key] = value; 
                }
            }
        }
    };

    processEntry(this);

    return result_;
  }
}
