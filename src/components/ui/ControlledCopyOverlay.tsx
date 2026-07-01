import React from "react";

interface Props {
  text: string;
  /**
   * Optional: fixes the container that already has `position: relative`.
   * The overlay is `absolute` and non-interactive, so it stays out of the way
   * of the user's clicks / selection on the underlying document.
   */
  className?: string;
}

/**
 * Marca d'água diagonal repetida, injetada por cima de conteúdo renderizado em
 * canvas (ex.: PDFCanvasViewer). Use dentro de um contêiner com
 * `position: relative`.
 *
 * Como o conteúdo abaixo é canvas próprio da aplicação (não iframe cross-origin),
 * o overlay CSS funciona de forma confiável.
 */
export const ControlledCopyOverlay: React.FC<Props> = ({ text, className }) => {
  return (
    <div
      aria-hidden
      className={
        "pointer-events-none absolute inset-0 overflow-hidden select-none " +
        (className ?? "")
      }
      style={{
        zIndex: 5,
        // Repeating diagonal pattern via CSS gradients + text rendered as SVG data URL
        backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(
          `<svg xmlns='http://www.w3.org/2000/svg' width='420' height='260'>
            <text x='50%' y='50%' fill='rgba(220,38,38,0.18)' font-size='36' font-weight='700'
                  font-family='sans-serif' text-anchor='middle' dominant-baseline='middle'
                  transform='rotate(-30 210 130)'>${text}</text>
          </svg>`
        )}")`,
        backgroundRepeat: "repeat",
      }}
    />
  );
};

export default ControlledCopyOverlay;
