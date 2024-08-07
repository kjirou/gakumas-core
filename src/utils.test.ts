import type { GetRandom } from "./types";
import { getRandomInteger, validateNumberInRange } from "./utils";

describe("getRandomInteger", () => {
  const testParameters: Array<{
    expected: ReturnType<typeof getRandomInteger>;
    max: Parameters<typeof getRandomInteger>[1];
    random: ReturnType<GetRandom>;
  }> = [
    {
      random: 0,
      max: 0,
      expected: 0,
    },
    {
      random: 0.999999,
      max: 0,
      expected: 0,
    },
    {
      random: 0,
      max: 1,
      expected: 0,
    },
    {
      random: 0.49,
      max: 1,
      expected: 0,
    },
    {
      random: 0.5,
      max: 1,
      expected: 1,
    },
    {
      random: 0.999999,
      max: 1,
      expected: 1,
    },
  ];
  test.each(testParameters)(
    "random: $random, max: $max => $expected",
    ({ random, max, expected }) => {
      expect(getRandomInteger(() => random, max)).toBe(expected);
    },
  );
});
describe("validateNumberInRange", () => {
  const testCases: Array<{
    args: Parameters<typeof validateNumberInRange>;
    expected: ReturnType<typeof validateNumberInRange>;
  }> = [
    {
      args: [1, { min: 1 }],
      expected: true,
    },
    {
      args: [0, { min: 1 }],
      expected: false,
    },
    {
      args: [1, { max: 1 }],
      expected: true,
    },
    {
      args: [2, { max: 1 }],
      expected: false,
    },
    {
      args: [1, { min: 1, max: 3 }],
      expected: true,
    },
    {
      args: [3, { min: 1, max: 3 }],
      expected: true,
    },
    {
      args: [0, { min: 1, max: 3 }],
      expected: false,
    },
    {
      args: [4, { min: 1, max: 3 }],
      expected: false,
    },
  ];
  test.each(testCases)(
    "$args.0, $args.1 => $expected",
    ({ args, expected }) => {
      expect(validateNumberInRange(...args)).toBe(expected);
    },
  );
});
