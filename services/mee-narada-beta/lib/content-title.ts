/** Shared display text without loading the database client into reader-side widgets. */
export function titleOf(value:{headline_te?:string|null;headline_en?:string|null;title_te?:string|null;title_en?:string|null}){return value.headline_te||value.title_te||value.headline_en||value.title_en||'Untitled'}
