import React, { useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export type ScanTabKey = 'file' | 'url' | 'hash' | 'history';

interface ScanTab {
  key: ScanTabKey;
  icon: React.ElementType;
}

interface ScanTabBarProps {
  tabs: ScanTab[];
  activeTab: ScanTabKey;
  onSelect: (key: ScanTabKey) => void;
  onKeyDown?: (e: React.KeyboardEvent, index: number) => void;
}

// Geometry â€” kept together so the raised disc and its icon always line up.
const BAR_H = 92; // pink bar height (px)
const DISC = 96; // diameter of the raised background-coloured disc (px)
const DISC_ICON = 34; // glyph inside the disc (px)
const ICON = 30; // glyph size on the bar for idle tabs (px)
const RAISE = 12; // disc centre sits this far above the bar's top edge (px)
const PAGE_BG = '#17183B'; // colour behind the bar â€” the disc matches this
const BAR_PINK = '#FF4F79';

// One shared, buttery easing for every moving part so nothing fights.
const EASE = 'cubic-bezier(0.34, 1.35, 0.4, 1)'; // gentle overshoot = "flow"
const GLIDE = '520ms';

/**
 * Pink pill navigation matching the mockup. Idle tabs are a white icon sitting
 * on the bar with a white label beneath. The active tab's icon rides inside a
 * large *background-coloured* disc that bulges up out of the top edge of the
 * bar â€” a smooth round bump the same navy as the page, with the white glyph
 * centred in it. All labels stay on one baseline.
 *
 * The disc is a plain circle positioned above the bar (not clipped, since the
 * bar is a normal `flex` box), measured so it tracks the active tab's centre,
 * and its transform transitions with a soft ease so switching tabs glides.
 */
export const ScanTabBar: React.FC<ScanTabBarProps> = ({
  tabs,
  activeTab,
  onSelect,
  onKeyDown,
}) => {
  const { t } = useTranslation();
  const listRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [centers, setCenters] = useState<number[]>([]);
  // The raised disc only appears while the pointer is over the bar (see docs
  // below) — otherwise every tab reads as a plain white glyph on pink.
  const [hovered, setHovered] = useState(false);
  // Which tab the pointer is currently over (null = none). When hovering the
  // bar, the disc rides the hovered tab so each icon "works"/lifts in turn;
  // when not hovering, it falls back to the active tab.
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Track each tab's horizontal centre so the disc can sit over the active one.
  useLayoutEffect(() => {
    const measure = () => {
      const list = listRef.current;
      if (!list) return;
      const listLeft = list.getBoundingClientRect().left;
      setCenters(
        btnRefs.current.map((btn) => {
          if (!btn) return 0;
          const r = btn.getBoundingClientRect();
          return r.left - listLeft + r.width / 2;
        })
      );
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [tabs.length]);

  const activeIndex = tabs.findIndex((tab) => tab.key === activeTab);
  // The tab the disc should sit over: the hovered one if any, else the active.
  const focusIndex = hoveredIndex ?? activeIndex;
  const discX = centers[focusIndex] ?? 0;

  return (


    <div
      ref={listRef}
      role="tablist"
      aria-label={t('dashboard.scanModeAria')}
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setHoveredIndex(null);
      }}
    >
      {/* Pink bar. */}
      <div
        className="flex rounded-card"
        style={{ height: BAR_H, backgroundColor: BAR_PINK }}
      >
        {tabs.map(({ key, icon: Icon }, index) => {
          const active = activeTab === key;
          const label = t(
            `dashboard.tab${key.charAt(0).toUpperCase()}${key.slice(1)}`
          );
          // The glyph is hidden on the tab the disc currently covers (the
          // hovered tab while hovering, else the active tab).
          const lifted = hovered && focusIndex === index;
          return (
            <button
              key={key}
              ref={(el) => {
                btnRefs.current[index] = el;
              }}
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onSelect(key)}
              onKeyDown={(e) => onKeyDown?.(e, index)}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="group relative flex h-full flex-1 min-w-[92px] flex-col items-center justify-center gap-2 px-3 focus:outline-none"
            >
              {/* Idle tabs show their glyph on the bar. When the bar is hovered,
                  the tab under the disc hides its glyph here because the disc
                  overlay renders the icon instead. The glyph scales + fades with
                  the shared ease so it flows. When NOT hovered, every glyph is
                  shown (no disc), so the bar reads as plain pink + white icons. */}
              <span
                className="flex items-center justify-center"
                style={{
                  height: ICON,
                  width: ICON,
                  opacity: lifted ? 0 : 1,
                  transform: lifted ? 'scale(0.6)' : 'scale(1)',
                  transition: `opacity ${GLIDE} ${EASE}, transform ${GLIDE} ${EASE}`,
                }}
              >
                <Icon style={{ height: ICON, width: ICON, color: '#fff' }} />
              </span>

              <span
                className="whitespace-nowrap text-[15px] font-extrabold leading-none text-white"
                style={{
                  transition: `transform ${GLIDE} ${EASE}, opacity ${GLIDE} ${EASE}`,
                  transform: lifted ? 'translateY(-2px)' : 'translateY(0)',
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>


      {/* Raised background-coloured disc that bulges above the bar over the
          active tab, with the active glyph centred inside it. It only appears
          while the pointer is over the bar (`hovered`) — otherwise the bar is a
          plain pink strip and the active tab is indistinguishable at a glance.
          Driven by a GPU translate3d (no layout) so it glides smoothly between
          tabs; the glyph cross-fades + pops in as the disc settles. */}
      {discX > 0 && (
        <div
          className="pointer-events-none absolute z-10 flex items-center justify-center rounded-full"
          style={{
            width: DISC,
            height: DISC,
            left: 0,
            // Centre the disc RAISE above the bar's top edge; the wrapper's
            // top aligns with the bar's top, so a negative top works.
            top: -RAISE - DISC / 2,
            backgroundColor: PAGE_BG,
            // x is the measured tab centre; -50% keeps the disc centred on it.
            transform: `translate3d(${discX}px, 0, 0) translateX(-50%) scale(${hovered ? 1 : 0.6})`,
            opacity: hovered ? 1 : 0,
            transition: `transform ${GLIDE} ${EASE}, opacity 260ms ease-out`,
            willChange: 'transform, opacity',
          }}
        >
          {(() => {
            const FocusIcon = tabs[focusIndex]?.icon;
            return FocusIcon ? (
              <FocusIcon
                key={tabs[focusIndex]?.key}
                className="scan-tab-disc-icon"
                style={{ height: DISC_ICON, width: DISC_ICON, color: '#fff' }}
              />
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
};

export default ScanTabBar;

