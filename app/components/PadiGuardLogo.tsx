type PadiGuardLogoProps = {
  className?: string;
  tagline?: string;
  taglineClassName?: string;
  tone?: "default" | "inverse";
  wordmarkClassName?: string;
};

export default function PadiGuardLogo({
  className = "",
  tagline,
  taglineClassName = "",
  tone = "default",
  wordmarkClassName = "",
}: PadiGuardLogoProps) {
  return (
    <div className={`padiguard-logo ${tone === "inverse" ? "padiguard-logo-inverse" : ""} ${className}`}>
      <svg
        className="padiguard-logo-mark shrink-0"
        width="36"
        height="36"
        viewBox="0 0 36 36"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          className="padiguard-logo-shield"
          d="M18 2.5 31 7v9.1c0 8.1-5.2 14.2-13 17.4C10.2 30.3 5 24.2 5 16.1V7l13-4.5Z"
        />
        <path
          className="padiguard-logo-rice"
          d="M15.5 27.5c.6-4.7 2-9.2 4.8-14.2M18.1 21.4c-3.2-.3-5.3-1.9-6.4-4.7 3.3.2 5.4 1.8 6.7 5M19.7 15c2.2-1 3.7-3.1 4.5-6"
        />
        <path
          className="padiguard-logo-grain"
          d="M22.5 11.9c-1.2-.8-.8-2.4.5-3 1.1 1 .8 2.5-.5 3ZM20.9 14.1c-1.2-.8-.8-2.4.5-3 1.1 1 .8 2.5-.5 3ZM24.7 13.2c-1.3-.6-1.1-2.2.1-3 1.2.8 1.1 2.4-.1 3Z"
        />
      </svg>
      <span className="padiguard-logo-copy block min-w-0">
        <span className={`padiguard-wordmark text-base leading-tight tracking-tight ${wordmarkClassName}`}>
          <span className="padiguard-logo-name font-bold">Padi</span>
          <span className="padiguard-logo-accent font-medium">Guard</span>
        </span>
        {tagline && (
          <span className={`padiguard-logo-tagline block ${taglineClassName}`}>{tagline}</span>
        )}
      </span>
    </div>
  );
}
