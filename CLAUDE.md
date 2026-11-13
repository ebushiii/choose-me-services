# Choose Me Services site guide

This file is for the Eugenius builder and anyone editing this site. Read it before changing anything.

## Who the site is for
Choose Me Services: Malika's mobile notary business in Chicago. She comes to the client (home, office, hospital, care facility) across the South Side and Chicagoland, evenings and weekends. Black woman-owned. The domain is choosemeservices.com (see `CNAME`); the site is hosted on Vercel at https://choose-me-services.vercel.app.

## How the site is built
Plain static HTML, no build step, no framework. Every page must work by opening the file. Styles live inside each page in a `<style>` block.

- `index.html`: the home page, one long page. Sections in order: the hero with the Book Online button, `#services` (General Notary, Mobile Notary, Evenings & Weekends), the service area map and travel fees, Why Choose Me, Notary Service Done Right, client reviews, Hours of Service, the closing booking band, and the footer.
- `flyer.html`: a print flyer page (fixed size, not part of the site navigation and not in the sitemap). Change it only when the client asks about the flyer.
- `privacy.html`: the privacy policy.
- `malika.png`, `team.png`: the photos.
- `CNAME`: the domain name. `sitemap.xml`, `robots.txt`.
- `googlefa93f31a42ae323b.html`: Google site verification. Never touch it.
- `.github/`: the automation that runs you. Never edit it.

## Design
Use the CSS custom properties in the `:root` block of `index.html` (`--navy`, `--navy-deep`, `--gold`, `--gold-soft`, `--cream`, `--ink`, `--muted`, `--white`, `--radius`, `--shadow`) and the existing classes (`.wrap`, `.block`, `.eyebrow`, `.section-title`, `.section-sub`, `.card`, `.btn`, `.btn-primary`). Headings are Playfair Display, body text is Inter. A new page copies the look of `privacy.html`: same fonts, same colors, the "Back to home" link and the footer with the privacy link. Everything must work at phone width with no sideways scrolling.

## Booking and contact
This site has no form and no server code. People book through Malika's Square booking page:
`https://book.squareup.com/appointments/3lkk93l4jg1hsr/location/LD8N7G1JMHT05`
Every booking button uses that exact link. They can also call or text (708) 918-3335 or email choosemeservices@gmail.com.

The service area map uses Leaflet with OpenStreetMap tiles. Leave it as it is unless she asks about the map.

If a request asks for a form, there is nowhere on this site for its answers to go. Do not add a form and do not add any outside form, booking or tracking service. Make every other part of the change, point people to the Square booking link or the phone and email instead, and say in your final message that a form needs the site team to set up delivery first.

When she gives a link to a form or document she wants on the site, open the link and use HER wording, in her order. Do not write your own.

## Things that must stay
- The Square booking link above, exactly as written.
- The phone number (708) 918-3335 and the email choosemeservices@gmail.com, unless she gives new ones.
- The travel fees ($25 within 20 miles, $50 beyond 20 miles) and the hours of service, unless she asks to change them.
- The "Commissioned Notary Public" line and the "Notary Public" line in the footer.
- The privacy policy link in the page footer.

## When a change collects something new
If a change makes the site collect a new kind of information or adds a new outside tool, update the matching paragraph in `privacy.html` ("What we collect", "Who helps us") in plain words. Add every new public page to `sitemap.xml`.

## Never
Never invent reviews, testimonials, star ratings, credentials, certifications (for example loan signing agent or NNA certification), results or prices. Never describe the service as giving legal advice or preparing legal documents; a notary witnesses and certifies signatures. Never touch sign-in, payment links, secrets, the `CNAME` file, domain settings or `.github/`.

## Working notes (background for the team)
- `.github/eugenius/edit.mjs` and `preview.mjs` are an older editor. The workflow does not run them.
