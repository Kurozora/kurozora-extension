<script lang="ts">
  import type { FontStyle, FontWeight, FontWidth } from "@/lib/date-widget/configuration";
  import { inlineStyle, typographyProperties } from "@/lib/date-widget/typography";

  interface Props {
    /** The date to display. */
    date: Date;
    /** The font style. */
    font: FontStyle;
    /** The font weight. */
    fontWeight: FontWeight;
    /** The font width. */
    fontWidth: FontWidth;
  }

  let { date, font, fontWeight, fontWidth }: Props = $props();

  const weekdayFormat = new Intl.DateTimeFormat(undefined, { weekday: "long" });
  const dayFormat = new Intl.DateTimeFormat(undefined, { day: "numeric" });

  const weekday = $derived(weekdayFormat.format(date));
  const day = $derived(dayFormat.format(date));
  const typography = $derived(inlineStyle(typographyProperties(font, fontWeight, fontWidth)));
</script>

<div class="date" style={typography}>
  <span class="date-line date-weekday" data-text={weekday}>{weekday}</span>
  <span class="date-line date-day" data-text={day}>{day}</span>
</div>

<style>
  .date {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: var(--date-inset);
    font-family: var(--date-font-family);
    font-weight: var(--date-font-weight);
    font-stretch: var(--date-font-stretch);
    color: #ffffff;
    pointer-events: none;
  }

  .date-line {
    position: relative;
    display: block;
    line-height: 1;
    letter-spacing: var(--date-letter-spacing);
    text-shadow: 0 0 var(--date-shadow-blur) rgb(0 0 0 / 0.35);
  }

  /* The second copy the widget stacks behind each line. */
  .date-line::before {
    content: attr(data-text);
    position: absolute;
    inset: 0;
    text-shadow: 0 0 var(--date-shadow-blur) rgb(0 0 0 / 0.35);
  }

  .date-weekday {
    font-size: var(--date-weekday-size);
  }

  .date-day {
    font-size: var(--date-day-size);
  }
</style>
