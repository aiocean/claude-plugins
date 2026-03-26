# Component API Design

A component's API is its contract with every developer who uses it. Poor APIs force workarounds, create inconsistency, and resist refactoring. Good APIs are predictable, composable, and hard to misuse.

## Props Design Fundamentals

### Variant, Size, Color — The Standard Triad

Use string union types, never boolean flags for mutually exclusive states.

```tsx
// Bad: boolean flag explosion
<Button primary large rounded disabled />

// Good: variant + size props
<Button variant="primary" size="lg" disabled />

// Implementation with cva (class-variance-authority)
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  // Base classes applied always
  'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:   'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-500',
        ghost:     'text-gray-700 hover:bg-gray-100 focus-visible:ring-gray-500',
        danger:    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
        outline:   'border border-gray-300 text-gray-700 hover:bg-gray-50',
      },
      size: {
        xs: 'h-6 px-2 text-xs rounded',
        sm: 'h-8 px-3 text-sm rounded-md',
        md: 'h-9 px-4 text-sm rounded-md',
        lg: 'h-10 px-6 text-base rounded-lg',
        xl: 'h-12 px-8 text-lg rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  variant,
  size,
  loading,
  leftIcon,
  rightIcon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <Spinner size="sm" className="mr-2" />
      ) : leftIcon ? (
        <span className="mr-2">{leftIcon}</span>
      ) : null}
      {children}
      {rightIcon && !loading && (
        <span className="ml-2">{rightIcon}</span>
      )}
    </button>
  );
}
```

### Avoid Prop Proliferation

```tsx
// Bad: too many one-off props
<Avatar
  src={user.avatar}
  fallbackText={user.initials}
  showBorder
  borderColor="blue"
  showStatus
  statusColor="green"
  statusPosition="bottom-right"
  size={40}
/>

// Good: structured sub-objects for related props
<Avatar
  src={user.avatar}
  fallback={user.initials}
  size="md"
  badge={{ status: 'online', position: 'bottom-right' }}
/>
```

### Boolean Props — When They Are Acceptable

Use booleans only for truly binary, independent attributes:

```tsx
// Acceptable boolean props
<Input disabled />
<Input required />
<Input readOnly />
<Card elevated />      // shadow on/off
<Text truncate />      // text-overflow: ellipsis
<Divider vertical />   // horizontal vs vertical axis
```

Never use boolean props for variants where more values might be added later:

```tsx
// Bad: what happens when you need "warning" or "info"?
<Badge success />
<Badge error />

// Good: variants scale cleanly
<Badge variant="success" />
<Badge variant="error" />
<Badge variant="warning" />
```

## Compound Components

Compound components expose a family of related sub-components that share implicit state via context. The parent owns the state; children read it without prop drilling.

```tsx
// Select: compound component pattern
import { createContext, useContext, useId, useRef, useState } from 'react';

interface SelectContextValue {
  value: string;
  onChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerId: string;
  listboxId: string;
}

const SelectContext = createContext<SelectContextValue | null>(null);

function useSelectContext() {
  const ctx = useContext(SelectContext);
  if (!ctx) throw new Error('Select sub-components must be used inside <Select>');
  return ctx;
}

// Root — owns state
function Select({
  value,
  defaultValue = '',
  onChange,
  children,
}: {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  children: React.ReactNode;
}) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const id = useId();

  const controlled = value !== undefined;
  const currentValue = controlled ? value : internalValue;

  function handleChange(newValue: string) {
    if (!controlled) setInternalValue(newValue);
    onChange?.(newValue);
    setOpen(false);
  }

  return (
    <SelectContext.Provider value={{
      value: currentValue,
      onChange: handleChange,
      open,
      setOpen,
      triggerId: `${id}-trigger`,
      listboxId: `${id}-listbox`,
    }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
}

// Trigger — opens/closes the dropdown
function SelectTrigger({ children, placeholder = 'Select...' }: {
  children?: React.ReactNode;
  placeholder?: string;
}) {
  const { value, open, setOpen, triggerId, listboxId } = useSelectContext();

  return (
    <button
      id={triggerId}
      role="combobox"
      aria-expanded={open}
      aria-controls={listboxId}
      className="flex h-9 w-full items-center justify-between rounded-md border px-3 py-2 text-sm"
      onClick={() => setOpen(!open)}
    >
      <span className={cn(!value && 'text-gray-400')}>
        {children || value || placeholder}
      </span>
      <ChevronDownIcon className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
    </button>
  );
}

// Content — the dropdown panel
function SelectContent({ children }: { children: React.ReactNode }) {
  const { open, listboxId, triggerId } = useSelectContext();
  if (!open) return null;

  return (
    <div
      id={listboxId}
      role="listbox"
      aria-labelledby={triggerId}
      className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg"
    >
      {children}
    </div>
  );
}

// Item — an individual option
function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = useSelectContext();
  const selected = ctx.value === value;

  return (
    <div
      role="option"
      aria-selected={selected}
      className={cn(
        'flex cursor-pointer items-center px-3 py-2 text-sm hover:bg-gray-100',
        selected && 'bg-blue-50 font-medium text-blue-700'
      )}
      onClick={() => ctx.onChange(value)}
    >
      {selected && <CheckIcon className="mr-2 h-4 w-4" />}
      {children}
    </div>
  );
}

// Attach sub-components
Select.Trigger = SelectTrigger;
Select.Content = SelectContent;
Select.Item = SelectItem;

// Usage — clean and discoverable via IDE autocomplete
<Select value={country} onChange={setCountry}>
  <Select.Trigger placeholder="Choose country" />
  <Select.Content>
    <Select.Item value="us">United States</Select.Item>
    <Select.Item value="uk">United Kingdom</Select.Item>
    <Select.Item value="ca">Canada</Select.Item>
  </Select.Content>
</Select>
```

## Render Props and Slots

### Render Props — Logic Without Coupling UI

```tsx
// Render prop: exposes internal state to caller
function Disclosure({
  children,
}: {
  children: (props: { open: boolean; toggle: () => void }) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return <>{children({ open, toggle: () => setOpen(o => !o) })}</>;
}

// Usage: caller fully controls the UI
<Disclosure>
  {({ open, toggle }) => (
    <div>
      <button onClick={toggle}>{open ? 'Hide' : 'Show'} details</button>
      {open && <div className="mt-4">The hidden content</div>}
    </div>
  )}
</Disclosure>
```

### Named Slots via Props

```tsx
// Named slot props — more explicit than arbitrary children
function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;   // slot: buttons, dropdowns
  breadcrumb?: React.ReactNode; // slot: breadcrumb trail
}) {
  return (
    <div className="border-b pb-6 mb-8">
      {breadcrumb && <div className="mb-2">{breadcrumb}</div>}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {description && <p className="mt-1 text-gray-500">{description}</p>}
        </div>
        {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

// Usage
<PageHeader
  title="Team Members"
  description="Manage your team and their permissions."
  breadcrumb={<Breadcrumb items={[{ label: 'Settings', href: '/settings' }, { label: 'Team' }]} />}
  actions={
    <>
      <Button variant="outline" size="sm">Export</Button>
      <Button size="sm">Invite member</Button>
    </>
  }
/>
```

## Controlled vs Uncontrolled

Components should support both patterns. The rule: if `value` is passed, the component is controlled; otherwise it manages its own state.

```tsx
// Pattern: useControllableState hook
function useControllableState<T>({
  value: controlledValue,
  defaultValue,
  onChange,
}: {
  value?: T;
  defaultValue: T;
  onChange?: (value: T) => void;
}): [T, (value: T) => void] {
  const [internalValue, setInternalValue] = useState<T>(defaultValue);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  const setValue = useCallback((newValue: T) => {
    if (!isControlled) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  }, [isControlled, onChange]);

  return [value, setValue];
}

// Usage in a Tabs component
function Tabs({
  value,
  defaultValue,
  onValueChange,
  children,
}: TabsProps) {
  const [activeTab, setActiveTab] = useControllableState({
    value,
    defaultValue: defaultValue ?? '',
    onChange: onValueChange,
  });

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </TabsContext.Provider>
  );
}

// Uncontrolled (fire and forget)
<Tabs defaultValue="overview">
  <Tabs.List>...</Tabs.List>
  <Tabs.Content value="overview">...</Tabs.Content>
</Tabs>

// Controlled (synchronized with external state)
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <Tabs.List>...</Tabs.List>
</Tabs>
```

## Polymorphic Components — The `as` Prop

Allows changing the rendered HTML element while keeping component styles. Essential for semantic HTML and accessibility.

```tsx
type AsProp<C extends React.ElementType> = {
  as?: C;
};

type PropsToOmit<C extends React.ElementType, P> = keyof (AsProp<C> & P);

type PolymorphicComponentProps<
  C extends React.ElementType,
  Props = {}
> = React.PropsWithChildren<Props & AsProp<C>> &
  Omit<React.ComponentPropsWithoutRef<C>, PropsToOmit<C, Props>>;

// Generic Text component
type TextProps<C extends React.ElementType> = PolymorphicComponentProps<
  C,
  {
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    weight?: 'normal' | 'medium' | 'semibold' | 'bold';
    color?: 'primary' | 'secondary' | 'disabled' | 'danger';
    truncate?: boolean;
  }
>;

function Text<C extends React.ElementType = 'p'>({
  as,
  size = 'md',
  weight = 'normal',
  color = 'primary',
  truncate,
  className,
  children,
  ...rest
}: TextProps<C>) {
  const Component = as ?? 'p';

  return (
    <Component
      className={cn(
        textSizeMap[size],
        textWeightMap[weight],
        textColorMap[color],
        truncate && 'truncate',
        className
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}

// Usage — renders different elements, same styles
<Text as="h1" size="xl" weight="bold">Page Title</Text>
<Text as="label" htmlFor="email" size="sm" weight="medium">Email</Text>
<Text as="span" color="secondary" truncate>Long overflowing text...</Text>
<Text as="p">Default paragraph</Text>
```

## Headless UI Pattern

Headless components separate behavior (accessibility, keyboard, state) from visual presentation. The consumer provides all styling.

```tsx
// Headless: Tooltip (behavior only, no styles)
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

// Styled wrapper on top of headless primitive
function Tooltip({
  content,
  children,
  side = 'top',
  delayDuration = 300,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  delayDuration?: number;
}) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={5}
            className="z-50 max-w-xs rounded-md bg-gray-900 px-3 py-1.5 text-xs text-white shadow-md animate-in fade-in-0 zoom-in-95"
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-gray-900" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
```

## Default Props and Required vs Optional

```tsx
// Rules:
// 1. Props with sensible defaults → optional with default
// 2. Props that meaningfully differ per use case → required
// 3. Avoid defaults that hide bugs (empty string, 0)

interface AlertProps {
  // Required: no sensible universal default
  title: string;
  // Optional: common default covers 80% of cases
  variant?: 'info' | 'success' | 'warning' | 'error';
  // Optional: not always needed
  description?: string;
  onClose?: () => void;
}

function Alert({
  title,
  variant = 'info',
  description,
  onClose,
}: AlertProps) {
  const { icon: Icon, classes } = alertConfig[variant];

  return (
    <div className={cn('rounded-lg p-4 flex gap-3', classes.container)} role="alert">
      <Icon className={cn('h-5 w-5 shrink-0', classes.icon)} />
      <div className="flex-1">
        <p className={cn('text-sm font-medium', classes.title)}>{title}</p>
        {description && (
          <p className={cn('mt-1 text-sm', classes.description)}>{description}</p>
        )}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500"
          aria-label="Dismiss"
        >
          <XIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
```

## API Consistency Guidelines

### 1. Consistent naming across components

```tsx
// Establish conventions and apply them everywhere
// Event handlers: always on + PastTense
onSelect, onClose, onSubmit, onChange, onDelete, onConfirm

// Boolean state: is/has prefix
isOpen, isLoading, isDisabled, hasError, isSelected

// Size scale: same values across all components
size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'

// Variant: primary, secondary, ghost, outline, danger
// NOT: default, basic, text, destructive (pick one system, stick to it)
```

### 2. Forwarding refs

```tsx
// Always forward refs so consumers can interact with the DOM node
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, error, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(inputVariants({ error: !!error }), className)}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
```

### 3. className passthrough for extensibility

```tsx
// Allow consumers to add classes for layout (margin, width, etc.)
// Never for overriding component internals (colors, padding, font)
function Badge({ variant, className, children }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)}>
      {children}
    </span>
  );
}

// Consumer usage: layout-only classes
<Badge variant="success" className="mt-2">Active</Badge>
```

### 4. Spreading native props last

```tsx
// Always spread HTML props AFTER component-specific classes/props
// This prevents consumer overrides of critical attributes
function Input({ className, error, ...props }: InputProps) {
  return (
    <input
      className={cn(baseClasses, error && errorClasses, className)}
      // aria-invalid added by component, but can be overridden if needed
      aria-invalid={error ? 'true' : undefined}
      {...props}  // consumer can override aria-invalid, add data attributes, etc.
    />
  );
}
```

### 5. Data attributes for styling hooks

```tsx
// Use data attributes to expose state for CSS/testing
function Accordion({ ...props }) {
  return (
    <div
      data-state={open ? 'open' : 'closed'}
      data-disabled={disabled ? '' : undefined}
      {...props}
    />
  );
}

// CSS hooks
[data-state="open"] > .accordion-content { display: block; }
[data-disabled] { opacity: 0.5; pointer-events: none; }
```
