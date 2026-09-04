import {
  REVIEW_PERIOD_GROUPS,
  REVIEW_PERIOD_LABELS,
  type ReviewPeriod,
} from "@/lib/performance/labels";

const selectClass =
  "mt-1 h-9 w-full rounded-md border border-line bg-white px-2 text-sm";

export function PeriodSelect({
  name,
  value,
  defaultValue = "ANNUAL",
  onChange,
}: {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: ReviewPeriod) => void;
}) {
  return (
    <select
      name={name}
      className={selectClass}
      {...(value != null
        ? {
            value,
            onChange: onChange
              ? (e) => onChange(e.target.value as ReviewPeriod)
              : undefined,
          }
        : { defaultValue })}
    >
      {REVIEW_PERIOD_GROUPS.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.ids.map((id) => (
            <option key={id} value={id}>
              {REVIEW_PERIOD_LABELS[id]}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
