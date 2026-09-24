import { formatDate, formatDayMonth, type InvitationView } from "./types";

export function MinimalTemplate({ view }: { view: InvitationView }) {
  const { content, sections, functions, media } = view;

  return (
    <div className="bg-white text-slate-800">
      {view.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={view.coverImageUrl} alt="" className="h-80 w-full object-cover" />
      )}

      <div className="px-6 py-12 text-center">
        {view.guest && (
          <p className="text-sm text-slate-500">Dear {view.guest.name},</p>
        )}
        <h1 className="mt-2 text-4xl font-light tracking-tight text-slate-900">
          {content.headline || view.eventName}
        </h1>
        <p className="mt-4 text-sm text-slate-500">
          {formatDate(view.startDate)}
          {view.endDate ? ` – ${formatDate(view.endDate)}` : ""}
          {view.city ? ` · ${view.city}` : ""}
        </p>
        {view.guest?.isVip && (
          <span className="mt-3 inline-block rounded-full bg-slate-900 px-3 py-1 text-xs text-white">
            VIP
          </span>
        )}
      </div>

      <div className="mx-auto max-w-lg space-y-10 px-6 pb-14">
        {sections.welcome && content.welcome && (
          <p className="text-center leading-relaxed text-slate-600">{content.welcome}</p>
        )}

        {sections.about && content.about && (
          <Block title="About">
            <p>{content.about}</p>
          </Block>
        )}

        {sections.functions && functions.length > 0 && (
          <Block title="Schedule">
            <ul className="space-y-4">
              {functions.map((fn) => (
                <li key={fn.id} className="flex gap-4">
                  <span className="w-16 shrink-0 text-xs font-medium uppercase text-slate-400">
                    {formatDayMonth(fn.date)}
                  </span>
                  <span>
                    <span className="block font-medium text-slate-900">{fn.name}</span>
                    <span className="block text-sm text-slate-500">
                      {fn.startTime ? `${fn.startTime} · ` : ""}
                      {fn.venueName ?? ""}
                    </span>
                    {sections.dressCode && fn.dressCode && (
                      <span className="block text-xs text-slate-400">
                        Dress code: {fn.dressCode}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </Block>
        )}

        {sections.gallery && media.length > 0 && (
          <Block title="Gallery">
            <div className="grid grid-cols-2 gap-2">
              {media.map((m) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={m.url}
                  src={m.url}
                  alt=""
                  className="aspect-[4/3] w-full rounded object-cover"
                />
              ))}
            </div>
          </Block>
        )}

        {sections.venue && (view.locationName || content.venueNote) && (
          <Block title="Venue">
            <p>{view.locationName}</p>
            {content.venueNote && <p className="mt-1 text-slate-500">{content.venueNote}</p>}
            {sections.directions && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  view.locationName || view.city || "",
                )}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm text-slate-900 underline"
              >
                Get directions →
              </a>
            )}
          </Block>
        )}

        {content.hostMessage && (
          <Block title="A note">
            <p className="italic text-slate-600">{content.hostMessage}</p>
            {view.hostName && <p className="mt-1 text-sm text-slate-400">— {view.hostName}</p>}
          </Block>
        )}

        {sections.rsvp && view.rsvpUrl && (
          <div className="text-center">
            <p className="mb-3 text-slate-600">{content.rsvpMessage}</p>
            <a
              href={view.rsvpUrl}
              className="inline-block rounded-full bg-slate-900 px-8 py-3 font-medium text-white"
            >
              RSVP
            </a>
          </div>
        )}

        {sections.contact && view.contactNumber && (
          <Block title="Contact">
            <p>{view.contactNumber}</p>
          </Block>
        )}
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
        {title}
      </h2>
      <div className="text-sm leading-relaxed text-slate-700">{children}</div>
    </section>
  );
}
