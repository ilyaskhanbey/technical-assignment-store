import { Restrict, Store } from "./store";

export class UserStore extends Store {
  @Restrict("rw")
  public name: string = "John Doe";

  constructor() {
    super();
    this.defaultPolicy = "rw";
  }
}
