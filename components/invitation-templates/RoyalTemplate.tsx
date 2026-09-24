import {
  formatDate,
  formatDayMonth,
  type InvitationView,
} from "./types";

export function RoyalTemplate({ view }: { view: InvitationView }) {
  const { content, sections, functions, media } = view;

  return (
    <div className="bg-[#1a0f0a] text-amber-50">
      <div className="relative">
        {view.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={view.coverImageUrl}
            alt=""
            className="h-72 w-full object-cover opacity-70"
          />
        )}
        <div className="px-6 py-10 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-300">
            {view.guest ? `Dear ${view.guest.name}` : "You are invited"}
          </p>
          <h1 className="mt-4 font-serif text-3xl font-semibold tracking-wide">
            {content.headline || view.eventName}
          </h1>
          <p className="mt-3 text-sm uppercase tracking-[0.2em] text-amber-200">
            {formatDate(view.startDate)}
            {view.endDate ? ` — ${formatDate(view.endDate)}` : ""}
          </p>
          {(view.city || view.locationName) && (
            <p className="mt-1 text-sm uppercase tracking-[0.2em] text-amber-200">
              {view.locationName || view.city}
            </p>
          )}
          {view.guest?.isVip && (
            <span className="mt-4 inline-block rounded-full border border-amber-400 px-3 py-1 text-xs uppercase tracking-widest text-amber-300">
              VIP
            </span>
          )}
        </div>
      </div>

      <div className="space-y-8 px-6 py-10">
        {sections.welcome && (content.welcome || content.headline) && (
          <Section title="Welcome">
            <p>{content.welcome}</p>
          </Section>
        )}

        {sections.about && content.about && (
          <Section title="Our Story">
            <p>{content.about}</p>
          </Section>
        )}

        {sections.functions && functions.length > 0 && (
          <Section title="Events">
            <ul className="space-y-4">
              {functions.map((fn) => (
                <li key={fn.id} className="border-l-2 border-amber-400 pl-4">
                  <p className="text-xs uppercase tracking-widest text-amber-300">
                    {formatDayMonth(fn.date)}
                    {fn.startTime ? ` · ${fn.startTime}` : ""}
                  </p>
                  <p className="text-lg font-semibold">{fn.name}</p>
                  {fn.venueName && <p className="text-sm text-amber-200">{fn.venueName}</p>}
                  {sections.dressCode && fn.dressCode && (
                    <p className="text-xs text-amber-300">Dress code: {fn.dressCode}</p>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {sections.gallery && media.length > 0 && (
          <Section title="Gallery">
            <div className="grid grid-cols-3 gap-2">
              {media.map((m) =>
                m.type === "video" ? (
                  <video
                    key={m.url}
                    src={m.url}
                    controls
                    className="aspect-square w-full rounded object-cover"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={m.url}
                    src={m.url}
                    alt=""
                    className="aspect-square w-full rounded object-cover"
                  />
                ),
              )}
            </div>
          </Section>
        )}

        {sections.venue && (view.locationName || content.venueNote) && (
          <Section title="Venue">
            <p>{view.locationName}</p>
            {content.venueNote && <p className="mt-1">{content.venueNote}</p>}
            {sections.directions && (
              <a
                className="mt-3 inline-block rounded border border-amber-400 px-4 py-2 text-sm text-amber-200"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  view.locationName || view.city || "",
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                Get Directions
              </a>
            )}
          </Section>
        )}

        {content.hostMessage && (
          <Section title="A note from us">
            <p className="italic">{content.hostMessage}</p>
            {view.hostName && <p className="mt-2 text-sm">— {view.hostName}</p>}
          </Section>
        )}

        {sections.rsvp && view.rsvpUrl && (
          <Section title="RSVP">
            <p>{content.rsvpMessage}</p>
            <a
              href={view.rsvpUrl}
              className="mt-3 inline-block rounded bg-amber-400 px-6 py-3 font-semibold text-[#1a0f0a]"
            >
              {view.guest ? "Confirm your attendance" : "RSVP"}
            </a>
          </Section>
        )}

        {sections.contact && view.contactNumber && (
          <Section title="Contact">
            <p>{view.contactNumber}</p>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-center text-xs uppercase tracking-[0.3em] text-amber-300">
        {title}
      </h2>
      <div className="text-center text-sm leading-relaxed text-amber-100">
        {children}
      </div>
    </section>
  );
}
