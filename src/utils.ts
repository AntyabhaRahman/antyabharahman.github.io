// Newest entry first. Shared by every list page and the home deck.
export const byDate = <T extends { data: { date: Date } }>(a: T, b: T) => b.data.date.valueOf() - a.data.date.valueOf();
