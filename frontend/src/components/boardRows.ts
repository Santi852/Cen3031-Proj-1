// Which rows a short board shows, shared by the Social leaderboards and the
// friends' streak board: always the top 3, then one more row, which is your
// own spot if you're below the top 3, otherwise 4th place so the board still
// has four rows. This checks the rows, not your rank: when many people tie
// (everyone has 0 at the start of a week) you can be ranked 1st without being
// one of the first three.
export function boardRows<T extends { userId: string }>(
  top: T[],
  you: T | null,
): T[] {
  const youInTop3 =
    you !== null && top.slice(0, 3).some((e) => e.userId === you.userId);
  const fourth = you && !youInTop3 ? you : top[3];
  return fourth ? [...top.slice(0, 3), fourth] : top.slice(0, 3);
}
