import * as React from "react";
import { LoaderCircle, Search, X } from "lucide-react";
import { useSearchMembers } from "@kiddy-land/client/react";
import { Button } from "@workspace/ui/components/button";
import { FormField } from "@workspace/ui/components/form-field";

export type SelectedMember = {
  id: string;
  childId: string;
  code: string;
  name: string;
  phone?: string;
  status: "active" | "deactivated";
};

function maskPhone(phone?: string) {
  const value = phone ?? "";
  if (!value) return "No phone";
  return value.length > 6 ? `${value.slice(0, 3)}••••${value.slice(-3)}` : value;
}

export function MemberPicker({ onSelect }: { onSelect: (member?: SelectedMember) => void }) {
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [selected, setSelected] = React.useState<SelectedMember>();
  const matches = useSearchMembers(debouncedQuery);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 500);
    return () => clearTimeout(timer);
  }, [query]);

  const select = (value: NonNullable<typeof matches.data>[number]) => {
    const member = { id: value.member.id, childId: value.child.id, code: value.member.code, name: value.child.name, phone: value.child.phone, status: value.member.status } satisfies SelectedMember;
    setSelected(member);
    onSelect(member);
  };
  const clear = () => { setSelected(undefined); setQuery(""); setDebouncedQuery(""); onSelect(undefined); };

  if (selected) return <div className="flex items-center justify-between gap-3 border p-3">
    <div className="min-w-0"><p className="font-medium">{selected.name}</p><p className="truncate text-xs text-muted-foreground">{selected.code} · {maskPhone(selected.phone)}</p></div>
    <Button type="button" variant="ghost" size="sm" onClick={clear}><X data-icon="inline-start" />Change member</Button>
  </div>;

  return <div className="relative">
    <FormField label="Member code or name" optional htmlFor="member-search" className="gap-1.5">
      <span className="relative block"><Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input id="member-search" className="h-10 w-full border border-input bg-background pl-8 pr-3 text-sm" placeholder="Search member code or name" value={query} onChange={(event) => setQuery(event.target.value)} /></span>
    </FormField>
    {debouncedQuery && matches.isFetching ? <div className="absolute z-10 mt-1 w-full border bg-popover p-3 text-sm text-muted-foreground"><span className="inline-flex items-center gap-2"><LoaderCircle className="size-4 animate-spin" />Searching members…</span></div> : null}
    {debouncedQuery && !matches.isFetching && matches.data?.length ? <div className="absolute z-10 mt-1 w-full border bg-popover p-1 shadow-md">
      {matches.data.map((value) => <Button key={value.member.id} type="button" variant="ghost" className="h-auto w-full justify-start py-2 text-left" onClick={() => select(value)}><span className="min-w-0 truncate"><strong>{value.child.name}</strong><span className="ml-2 text-muted-foreground">{value.member.code} · {maskPhone(value.child.phone)}</span></span></Button>)}
    </div> : null}
    {debouncedQuery && matches.isSuccess && !matches.data?.length ? <p className="mt-1 text-xs text-muted-foreground">No matching member.</p> : null}
  </div>;
}
