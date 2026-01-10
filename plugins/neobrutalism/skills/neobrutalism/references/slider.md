# Slider Component

Neo-brutalism slider with hard borders, offset shadows, and tactile press interaction.

## Key Characteristics

- **Track**: White background with 2px black border, no rounded corners
- **Thumb**: Primary color fill, 2px black border, hard offset shadow
- **Interaction**: Thumb "presses down" on hover (translates to shadow position)
- **No blur**: All shadows are hard offset (0 blur radius)

## Structure

```
SliderRoot
├── SliderTrack (container with border)
│   └── SliderRange (filled portion)
└── SliderThumb (draggable handle)
```

## Styling Classes

### Track
```
bg-background border-2 border-black h-2
```
- White/background fill
- Hard 2px black border
- No border-radius (sharp corners)

### Range (filled portion)
```
bg-primary
```
- Uses primary theme color for filled area

### Thumb
```
bg-primary border-2 border-black shadow-[2px_2px_0_#000]
hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none
```
- Primary color fill
- Hard black border
- 2px offset shadow (no blur)
- On hover: moves down-right 2px, shadow disappears (pressed effect)

## Interactive States

| State | Transform | Shadow |
|-------|-----------|--------|
| Default | none | 2px 2px 0 #000 |
| Hover | translate(2px, 2px) | none |
| Disabled | none | 2px 2px 0 #000 (50% opacity) |

## Design Principles

1. **Elevated by default**: Shadow creates illusion of height
2. **Press to interact**: Hover removes elevation (pressed down)
3. **Fast feedback**: 100ms transitions for responsive feel
4. **High contrast**: Black borders on all elements
