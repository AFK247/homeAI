<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Always use the form factory

Build EVERY form with the form factory in `src/components/form` (`FormFactory` + `FieldFactory`, barrel: `@/components/form`) — never hand-roll `useState`-per-field controlled inputs or a raw `<form>`. One Zod schema drives validation (client + server); cross-field rules (e.g. confirm-password match) go in the schema via `.refine()` so errors render inline. Custom chrome (social buttons, mode toggles, links, submit) renders as siblings inside `FormFactory`. Field types live in `FieldMapper` — add a type there rather than dropping to a bare input. `type: "password"` fields automatically get the reveal/hide toggle (via `PasswordInput`).
