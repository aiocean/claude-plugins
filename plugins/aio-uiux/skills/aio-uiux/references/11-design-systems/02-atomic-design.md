# Atomic Design

Brad Frost's Atomic Design methodology provides a mental model for building UI systems from the smallest indivisible pieces up to complete pages. It borrows from chemistry: matter is made of atoms, atoms form molecules, molecules form organisms.

## The Five Stages

```
Atoms → Molecules → Organisms → Templates → Pages
```

### Stage 1: Atoms

The smallest functional UI unit. Cannot be broken down further without losing meaning. Each atom maps to a single HTML element or a minimal wrapper.

**Examples:**
- Button
- Input
- Label
- Checkbox / Radio
- Icon
- Badge / Tag
- Avatar
- Spinner
- Divider
- Tooltip (the trigger wrapper)

```tsx
// Atom: Button
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  children,
  onClick,
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }))}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}

// Atom: Label
export function Label({ htmlFor, required, children }: LabelProps) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-gray-700">
      {children}
      {required && <span className="text-red-500 ml-1" aria-hidden>*</span>}
    </label>
  );
}

// Atom: Input
export function Input({ id, type = 'text', error, ...props }: InputProps) {
  return (
    <input
      id={id}
      type={type}
      className={cn(
        'block w-full rounded-md border px-3 py-2 text-sm',
        error ? 'border-red-500' : 'border-gray-300',
        'focus:outline-none focus:ring-2 focus:ring-blue-500'
      )}
      aria-invalid={error ? 'true' : undefined}
      {...props}
    />
  );
}
```

### Stage 2: Molecules

Groups of atoms bonded together. A molecule has a single, well-defined responsibility. The whole is more functional than its parts.

**Examples:**
- Search field (Input + Icon + Button)
- Form field (Label + Input + HelperText + ErrorMessage)
- Card header (Avatar + Name + Timestamp)
- Pagination control (Button + PageCount + Button)
- Stat card (Icon + Number + Label)
- Toast notification (Icon + Message + CloseButton)

```tsx
// Molecule: FormField
// Composes Label + Input + HelperText + ErrorMessage atoms
interface FormFieldProps {
  label: string;
  id: string;
  required?: boolean;
  helperText?: string;
  error?: string;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}

export function FormField({
  label,
  id,
  required,
  helperText,
  error,
  inputProps,
}: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <Input id={id} error={!!error} {...inputProps} />
      {error ? (
        <span className="text-xs text-red-600" role="alert">{error}</span>
      ) : helperText ? (
        <span className="text-xs text-gray-500">{helperText}</span>
      ) : null}
    </div>
  );
}

// Molecule: SearchInput
export function SearchInput({ onSearch, placeholder }: SearchInputProps) {
  const [value, setValue] = useState('');

  return (
    <div className="relative flex items-center">
      <SearchIcon className="absolute left-3 h-4 w-4 text-gray-400" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSearch(value)}
        placeholder={placeholder}
        className="pl-9 pr-4"
      />
      {value && (
        <button
          className="absolute right-3 text-gray-400 hover:text-gray-600"
          onClick={() => { setValue(''); onSearch(''); }}
        >
          <XIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// Molecule: UserCard (avatar + name + role)
export function UserCard({ user }: { user: User }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar src={user.avatarUrl} name={user.name} size="md" />
      <div>
        <p className="text-sm font-medium text-gray-900">{user.name}</p>
        <p className="text-xs text-gray-500">{user.role}</p>
      </div>
    </div>
  );
}
```

### Stage 3: Organisms

Complex UI components made of molecules (and atoms). Organisms form distinct sections of a UI. They are self-contained and reusable across multiple templates.

**Examples:**
- Navigation bar (Logo + NavLinks + SearchInput + UserMenu)
- Hero section (Headline + SubText + CTAButton + HeroImage)
- Product card (Image + Title + Price + Rating + AddToCart)
- Data table (Toolbar + Table + Pagination)
- Comment thread (CommentInput + CommentList)
- Sidebar (UserCard + NavMenu + Footer)

```tsx
// Organism: NavigationBar
export function NavigationBar() {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <nav className="h-16 border-b bg-white px-6 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <Logo />
        <NavLinks
          links={mainNavLinks}
          activeHref={location.pathname}
        />
      </div>

      <div className="flex items-center gap-4">
        <SearchInput onSearch={handleSearch} placeholder="Search..." />
        <NotificationBell count={unreadCount} />
        <UserMenu user={user} />
      </div>
    </nav>
  );
}

// Organism: ProductCard
export function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();

  return (
    <article className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="aspect-square overflow-hidden">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-full w-full object-cover transition-transform hover:scale-105"
        />
      </div>

      <div className="p-4 flex flex-col gap-3">
        <div>
          <h3 className="font-semibold text-gray-900 line-clamp-2">{product.name}</h3>
          <p className="text-sm text-gray-500">{product.category}</p>
        </div>

        <div className="flex items-center justify-between">
          <PriceDisplay price={product.price} originalPrice={product.originalPrice} />
          <StarRating rating={product.rating} count={product.reviewCount} />
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => addToCart(product.id)}
          disabled={product.stock === 0}
        >
          {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
        </Button>
      </div>
    </article>
  );
}

// Organism: DataTable
export function DataTable<T>({ data, columns, onSort, onFilter }: DataTableProps<T>) {
  return (
    <div className="flex flex-col gap-4">
      <TableToolbar onFilter={onFilter} />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <TableHeader columns={columns} onSort={onSort} />
          <TableBody data={data} columns={columns} />
        </table>
      </div>
      <TablePagination />
    </div>
  );
}
```

### Stage 4: Templates

Page-level wireframes. Templates define layout and placement without real content — they use placeholder data. Templates make the design's skeleton visible.

```tsx
// Template: DashboardLayout
export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationBar />

      <div className="flex">
        <Sidebar className="w-64 shrink-0" />

        <main className="flex-1 px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}

// Template: SettingsLayout (two-column)
export function SettingsLayout({
  sidebar,
  content,
}: {
  sidebar: React.ReactNode;
  content: React.ReactNode;
}) {
  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">Settings</h1>
        <div className="grid grid-cols-[200px_1fr] gap-8">
          <nav className="space-y-1">{sidebar}</nav>
          <div>{content}</div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Template: AuthLayout (centered card)
export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo size="lg" />
          <h1 className="mt-6 text-2xl font-bold">{title}</h1>
          {subtitle && <p className="mt-2 text-gray-500">{subtitle}</p>}
        </div>
        <div className="bg-white rounded-2xl shadow-sm border p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
```

### Stage 5: Pages

Specific instances of templates with real content. Pages are where you test whether the design system holds up with actual data: long names, missing images, edge-case content.

```tsx
// Page: UserProfilePage
export function UserProfilePage() {
  const { userId } = useParams();
  const { data: user, isLoading } = useUser(userId);

  if (isLoading) return <DashboardLayout><ProfileSkeleton /></DashboardLayout>;
  if (!user) return <DashboardLayout><NotFoundState /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        <ProfileHero user={user} />
        <ProfileStats stats={user.stats} />
        <RecentActivity userId={user.id} />
      </div>
    </DashboardLayout>
  );
}
```

## Folder Structure

```
src/
├── components/
│   ├── atoms/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx
│   │   │   └── index.ts
│   │   ├── Input/
│   │   ├── Label/
│   │   ├── Badge/
│   │   ├── Avatar/
│   │   ├── Icon/
│   │   └── Spinner/
│   │
│   ├── molecules/
│   │   ├── FormField/
│   │   ├── SearchInput/
│   │   ├── UserCard/
│   │   ├── StatCard/
│   │   └── Pagination/
│   │
│   ├── organisms/
│   │   ├── NavigationBar/
│   │   ├── Sidebar/
│   │   ├── ProductCard/
│   │   ├── DataTable/
│   │   └── CommentThread/
│   │
│   ├── templates/
│   │   ├── DashboardLayout/
│   │   ├── AuthLayout/
│   │   └── SettingsLayout/
│   │
│   └── pages/          # OR: /src/pages/ (Next.js / file-based routing)
│       ├── Dashboard/
│       ├── Profile/
│       └── Settings/
│
└── design-system/
    ├── tokens.css
    └── global.css
```

## Benefits

**Shared vocabulary.** Designers and developers speak the same language. "This molecule needs a new atom" is clearer than "add a thing to that component."

**Consistency at scale.** Changing an atom (Button's border-radius) propagates everywhere automatically. No manual search-and-replace.

**Parallelism.** Teams can work on different levels simultaneously: design-system team on atoms/molecules, feature teams on organisms/templates/pages.

**Testability.** Atoms and molecules have clear, isolated behavior — easy to unit test. Organisms and templates suit integration tests.

## Pitfalls and How to Avoid Them

### Pitfall 1: Over-atomization
Splitting too aggressively. A `ButtonText` atom that's just a `<span>` adds no value.

**Rule:** An atom must be independently reusable in at least two different molecules.

### Pitfall 2: Organisms doing too much
An organism that fetches its own data, manages global state, and renders 200 lines becomes unmaintainable.

**Rule:** Organisms receive data via props or context. Data fetching belongs in pages or dedicated hooks.

### Pitfall 3: Skipping the molecule layer
Jumping from atoms directly to organisms creates monoliths. The form-field pattern (label + input + error) is a molecule reused in every form organism.

**Rule:** If you find yourself copy-pasting a 3-atom combination twice, extract it as a molecule.

### Pitfall 4: Templates with business logic
Templates define layout. They must not know about specific routes, user roles, or API calls.

**Rule:** Templates take `children` or named slots. Pages wire up the actual content.

### Pitfall 5: Strict hierarchy enforcement
Real UIs sometimes have organisms inside molecules or molecules inside atoms. Atomic Design is a mental model, not a hard rule.

**Rule:** Hierarchy is a guide. Pragmatic composition beats purity. Name things what they are, not what the taxonomy demands.

## Component Composition Patterns

### Slot Pattern (named children)

```tsx
// Card with named slots — organism-level composition
function Card({
  header,
  body,
  footer,
  className,
}: {
  header?: React.ReactNode;
  body: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border bg-white shadow-sm', className)}>
      {header && (
        <div className="px-6 py-4 border-b">{header}</div>
      )}
      <div className="px-6 py-4">{body}</div>
      {footer && (
        <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl">{footer}</div>
      )}
    </div>
  );
}

// Usage: assembles atoms/molecules into a specific card
<Card
  header={<UserCard user={author} />}
  body={<ArticleContent content={post.content} />}
  footer={<ActionBar likes={post.likes} comments={post.comments} />}
/>
```

### Compound Component Pattern

```tsx
// Table as a compound organism
function Table({ children, className }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full text-sm', className)}>{children}</table>
    </div>
  );
}

Table.Header = function TableHeader({ children }: { children: React.ReactNode }) {
  return <thead className="bg-gray-50 text-xs text-gray-500 uppercase">{children}</thead>;
};

Table.Body = function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-gray-200">{children}</tbody>;
};

Table.Row = function TableRow({ children, onClick }: TableRowProps) {
  return (
    <tr
      className={cn('hover:bg-gray-50', onClick && 'cursor-pointer')}
      onClick={onClick}
    >
      {children}
    </tr>
  );
};

Table.Cell = function TableCell({ children, align = 'left' }: TableCellProps) {
  return (
    <td className={cn('px-4 py-3', `text-${align}`)}>{children}</td>
  );
};

// Usage
<Table>
  <Table.Header>
    <Table.Row>
      <Table.Cell>Name</Table.Cell>
      <Table.Cell>Email</Table.Cell>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    {users.map(user => (
      <Table.Row key={user.id} onClick={() => navigate(`/users/${user.id}`)}>
        <Table.Cell>{user.name}</Table.Cell>
        <Table.Cell>{user.email}</Table.Cell>
      </Table.Row>
    ))}
  </Table.Body>
</Table>
```
