// Newest entry first. Shared by every list page and the home deck.
export const byDate = <T extends { data: { date: Date } }>(a: T, b: T) => b.data.date.valueOf() - a.data.date.valueOf();

// Preserve the venue's official name without repeating its publication year.
export const venueWithYear = (venue: string, date: Date) => {
	const year = date.getFullYear();
	return new RegExp(`\\b${year}\\b`).test(venue) ? venue : `${venue}, ${year}`;
};

// Drafts render under `npm run dev` and stay out of the built site.
export const published = (e: { data: { draft?: boolean } }) => import.meta.env.DEV || !e.data.draft;
