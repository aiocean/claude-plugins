# Interaction Patterns Reference

## Pattern 1: Press-Down (Buttons, Action Elements)

Elements start elevated and "press down" on hover.

```css
.button {
  border: 2px solid #000;
  background: #FFD700;
  box-shadow: 4px 4px 0 #000;
  transition: all 100ms cubic-bezier(0.4, 0, 0.2, 1);
}

.button:hover {
  transform: translate(4px, 4px);
  box-shadow: none;
  background: #000;
  color: #fff;
}

.button:active {
  transform: translate(4px, 4px) scale(0.95);
}
```

**Tailwind**:
```html
<button class="border-2 border-black bg-yellow-300 shadow-[4px_4px_0_#000]
               transition-all duration-100
               hover:translate-x-1 hover:translate-y-1 hover:shadow-none
               hover:bg-black hover:text-white
               active:scale-95">
  Click Me
</button>
```

**Use for**: Action buttons, toolbar buttons, cards that perform actions

## Pattern 2: Elevate-Up (List Items, Navigation)

Elements start flat and "lift up" on hover.

```css
.list-item {
  border: 2px solid transparent;
  background: transparent;
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

.list-item:hover {
  box-shadow: 4px 4px 0 #000;
  transform: translate(-1px, -1px);
  border-color: #000;
}

.list-item--active {
  box-shadow: 6px 6px 0 #000;
  border: 3px solid #000;
  background: #FFD700;
}
```

**Use for**: List items, navigation menus, selection elements

## Timing Guidelines

```css
/* Buttons - snappy */
transition: all 100ms cubic-bezier(0.4, 0, 0.2, 1);

/* List items - smooth */
transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);

/* Cards - deliberate */
transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
```

## Pattern Selection

| Element Type | Pattern | Shadow Default | Hover Shadow |
|-------------|---------|----------------|--------------|
| Primary Button | Press-Down | 4-5px | none |
| Secondary Button | Press-Down | 0-2px | none |
| Clickable Card | Press-Down | 6-8px | reduces |
| Nav Link | Elevate-Up | 0px | appears |
| List Item | Elevate-Up | 0px | appears |
