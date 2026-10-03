/**
 * Public origin of the deployed blog. The apex domain redirects here, so it
 * is the canonical host: the root `metadataBase` resolves every relative
 * metadata URL against it, and the sitemap and robots files build their
 * absolute URLs from it.
 */
export const SITE_URL = new URL("https://www.vitorbelim.com");

/** Short site name, used as the Open Graph `siteName` and in title templates. */
export const SITE_NAME = "Daily LeetCode";

/** Author credited in the site title, metadata and footer links. */
export const SITE_AUTHOR = "Vítor Belim";

/** Full site title, used for the home page and as the default `<title>`. */
export const SITE_TITLE = `${SITE_NAME} - by ${SITE_AUTHOR}`;

/** Site-wide description, used for the home page and as the default description. */
export const SITE_DESCRIPTION = `A blog to keep track of daily LeetCode challenges, with solutions by ${SITE_AUTHOR}.`;

/** Open Graph locale of every page. */
export const SITE_LOCALE = "en_US";

/**
 * BCP 47 language tag the UI formats numbers with. Fixed rather than taken
 * from the viewer's runtime, so server-rendered strings such as a progress
 * bar's `aria-valuetext` match what the browser computes on hydration.
 */
export const SITE_LANGUAGE = "en-US";
