# Article sharing icons

Published articles show a sharing panel after the article body. It includes Facebook, X, Instagram, WhatsApp, Reddit, Telegram and LinkedIn; Pinterest appears when a valid hero image is available. Email, Copy link and More are provided underneath.

The server supplies the same canonical article address used by metadata. Telugu headlines and URLs are encoded separately for each destination. External composers open in separate tabs with noopener/noreferrer. The buttons do not post automatically and load no third-party sharing scripts.

Instagram copies the article link and provides short instructions for a message or Story Link sticker, with an optional Open Instagram link. More opens the device's share menu when supported. Unsupported/failed device sharing falls back to copying; cancelling the share menu does not copy anything. If clipboard access is unavailable, a selected, read-only article URL is shown for manual copying. Feedback is announced to assistive technology.

Icons use inline SVG: Facebook, X, Instagram, WhatsApp, Reddit, Telegram and Pinterest paths are from the CC0 Simple Icons project (https://github.com/simple-icons/simple-icons); LinkedIn and utility shapes are drawn inline. Labels, keyboard focus outlines, touch targets and a wrapping mobile layout accompany the icons.

Validation: run `npm run test:share` and `npm run build` from services/mee-narada-beta. The three tests cover Telugu/URL parameter integrity and unsafe inputs, rendered link/icon accessibility, clipboard success/manual fallback, native share payloads and cancellation. Provider publishing itself requires the reader's account and is not performed by tests. The managed local Next.js preview remains unavailable; inspect the live article panel after the hosted build is ready.

Reference endpoints: Telegram https://core.telegram.org/widgets/share and Pinterest https://developers.pinterest.com/docs/web-features/buttons/. Device sharing follows the browser's Web Share support. No database migration or account permission changes are required.
