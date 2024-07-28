import type { MetaModifierData } from "../types";
import { metaModifierDictioanry } from "./modifiers";

describe("metaModifierDictioanry", () => {
  test("オブジェクトのキーとkindの値が一致する", () => {
    for (const [key, value] of Object.entries(metaModifierDictioanry)) {
      expect(value.kind).toBe(key);
    }
  });
});
