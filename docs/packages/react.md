# React Bindings

Official React hooks for Sthira.

## API Reference

### `useStore(store, selector?, equalityFn?)`

Subscribes to a store and returns its state.

- **store**: The Sthira store instance.
- **selector** (optional): Function to select a slice of state.
- **equalityFn** (optional): Custom equality check (shallow by default).

```tsx
const count = useStore(counterStore, (s) => s.count);
```

### `useSelector(store, selector)`

Alias for `useStore` with a required selector.

### `Provider`

Optional context provider if you need to inject stores (dependency injection pattern), though importing stores directly is more common.
