<script lang="ts">
  interface Props {
    /** Text shown in the field's label. */
    label: string;
    /** Two-way bound value of the input. */
    value?: string;
    /** Native input type, e.g. "email" or "password". */
    type?: string;
    /** Unique id linking the label to the input. */
    id: string;
    /** Placeholder shown when the field is empty. */
    placeholder?: string;
    /** Autocomplete hint passed to the browser. */
    autocomplete?: HTMLInputElement["autocomplete"];
    /** Virtual keyboard hint, e.g. "numeric". */
    inputmode?:
      | "none"
      | "text"
      | "decimal"
      | "numeric"
      | "tel"
      | "search"
      | "email"
      | "url";
    /** Maximum number of characters accepted. */
    maxlength?: number;
    /** Whether the field must be filled before submitting. */
    required?: boolean;
    /** Whether the field is non-interactive. */
    disabled?: boolean;
  }

  let {
    label,
    value = $bindable(""),
    type = "text",
    id,
    placeholder = "",
    autocomplete,
    inputmode,
    maxlength,
    required = false,
    disabled = false,
  }: Props = $props();
</script>

<div>
  <label class="block font-medium text-sm text-secondary" for={id}>
    {label}
  </label>
  <input
    class="block mt-1 w-full px-3 py-2 rounded-lg shadow-sm bg-secondary text-primary border border-primary transition ease-in-out duration-150 placeholder:text-secondary focus:border-tint focus:ring-2 focus:ring-orange-500 focus:outline-none disabled:opacity-25"
    {id}
    {type}
    {placeholder}
    {autocomplete}
    {inputmode}
    {maxlength}
    {required}
    {disabled}
    {value}
    oninput={(event) => (value = event.currentTarget.value)}
  />
</div>
