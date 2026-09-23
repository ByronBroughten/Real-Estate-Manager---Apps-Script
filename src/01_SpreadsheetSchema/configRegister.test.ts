import { describe, expect, it, vi } from "vitest";
import {
  assertNotType,
  assertType,
  type IsExactly,
} from "../testSupport/typeAssertions";
import type {
  Configs,
  ConfigSetBase,
  ConfigsNotRegistered,
  ConfigsOf,
} from "./configRegister";

describe("Register", () => {
  it("resolves an unaugmented Register to an error type, never ConfigSetBase", () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- an unaugmented Register
    type Unaugmented = ConfigsOf<{}>;
    assertType<IsExactly<Unaugmented, ConfigsNotRegistered>>(true);
    assertNotType<IsExactly<Unaugmented, ConfigSetBase>>(false);
    assertNotType<Unaugmented extends ConfigSetBase ? true : false>(false);
  });
  it("resolves this program's augmented Register to its own config set", () => {
    assertNotType<IsExactly<Configs, ConfigsNotRegistered>>(false);
    assertNotType<IsExactly<Configs, ConfigSetBase>>(false);
    assertType<Configs extends ConfigSetBase ? true : false>(true);
  });
});

describe("installedConfigs", () => {
  it("throws until the entry call installs configs", async () => {
    vi.resetModules();
    const fresh = await import("./configRegister");
    expect(() => fresh.installedConfigs()).toThrow(
      "Configs have not been installed",
    );
  });
});
