# Contributing to StockPulse India

## Coding Standards

### Commit Messages

Use semantic prefixes:

```
feat: add stock comparison feature
fix: handle null API response in chart
docs: update README setup instructions
chore: upgrade dependencies
test: add watchlist persistence tests
perf: memoize chart data transformation
```

### JavaScript / React

- Functional components with hooks only (no class components)
- Custom hooks for reusable logic (`use` prefix)
- Proper dependency arrays in `useEffect`
- Never mutate state directly — use spread operators
- `key` props on all mapped lists
- JSDoc comments on exported functions

### CSS

- CSS custom properties for all colors/spacing
- Mobile-first media queries
- No `!important` unless absolutely necessary
- BEM-like class naming: `.component-element`

### File Naming

- Components: `PascalCase.jsx`
- Hooks: `camelCase.js` with `use` prefix
- Utilities: `camelCase.js`
- Tests: `*.test.js` / `*.test.jsx`

## Development Workflow

1. Create a feature branch: `git checkout -b feat/my-feature`
2. Make changes with meaningful commits
3. Run tests: `cd client && npm test`
4. Open a Pull Request against `main`

## Testing

- Write tests for all utility functions
- Write component tests focusing on **user behavior**, not implementation
- Minimum 10 passing tests before merging
- Use `vitest` + `@testing-library/react`
