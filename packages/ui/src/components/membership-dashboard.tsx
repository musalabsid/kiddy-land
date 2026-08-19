import * as React from "react";
import { LoaderCircle } from "lucide-react";
import { useMembers, useRegisterMember, useReissueMemberCode, useDeactivateMember, useReactivateMember, useMemberHistory, useSearchMembers, useSession } from "@kiddy-land/client/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { useLocale } from "@workspace/ui/lib/i18n";
import { FormField } from "@workspace/ui/components/form-field";

const memberSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().regex(/^08\d{8,}$/, "Phone must start with 08 and contain at least 10 digits"),
});
type MemberValues = z.infer<typeof memberSchema>;

export function MembershipDashboard() {
  const { t } = useLocale();
  const { session } = useSession();
  const isOwner = session?.user?.role === "Owner";
  const [selected, setSelected] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const members = useMembers();
  const searchResults = useSearchMembers(debouncedSearch);
  const history = useMemberHistory(selected, isOwner);
  const reissue = useReissueMemberCode();
  const deactivate = useDeactivateMember();
  const reactivate = useReactivateMember();
  const register = useRegisterMember();
  const form = useForm<MemberValues>({ resolver: zodResolver(memberSchema), defaultValues: { name: "", phone: "" } });

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const member = members.data?.find((value) => value.member.id === selected);
  const printCard = () => { if (!member) return; const params = new URLSearchParams({ name: member.child.name, code: member.member.code, phone: member.child.phone ?? "" }); window.open(`/member-card/print?${params.toString()}`, "_blank", "noopener,noreferrer"); };
  const visibleMembers = debouncedSearch ? searchResults.data ?? [] : members.data ?? [];
  const submit = form.handleSubmit((values) => register.mutate(values, { onSuccess: () => form.reset() }));

  return <Card>
    <CardHeader><CardTitle>{t("membership.title")}</CardTitle></CardHeader>
    <CardContent className="grid gap-4">
      <form className="grid gap-3 border-b pb-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]" onSubmit={submit} noValidate>
        <FormField label="Member name" required htmlFor="member-register-name" error={form.formState.errors.name?.message}>
          <input id="member-register-name" className="h-9 border border-input bg-background px-2 text-sm" {...form.register("name")} />
        </FormField>
        <FormField label="Phone number" required htmlFor="member-register-phone" error={form.formState.errors.phone?.message}>
          <input id="member-register-phone" className="h-9 border border-input bg-background px-2 text-sm" inputMode="numeric" type="tel" placeholder="08xxxxxxxxxx" {...form.register("phone")} />
        </FormField>
        <Button type="submit" className="self-end sm:col-span-2 lg:col-span-1" disabled={register.isPending}>
          {register.isPending && <LoaderCircle data-icon="inline-start" className="animate-spin" />}
          Register member
        </Button>
        <p className="text-xs text-muted-foreground sm:col-span-2">Phone must start with 08 and contain at least 10 digits. Phone numbers must be unique.</p>
        {register.isError && <p role="alert" className="text-sm text-destructive sm:col-span-2">{register.error.message}</p>}
      </form>

      <div className="relative">
        <FormField label={t("membership.lookup")} optional htmlFor="membership-search">
          <input id="membership-search" className="h-9 w-full border border-input bg-background px-2 text-sm" placeholder="Search by name or member code" value={search} onChange={(event) => setSearch(event.target.value)} />
        </FormField>
        {searchResults.isFetching && debouncedSearch && <LoaderCircle aria-label="Searching members" className="absolute right-2 bottom-2 size-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="grid gap-2">
        {visibleMembers.slice(0, 5).map((value) => <Button key={value.member.id} variant={selected === value.member.id ? "default" : "outline"} onClick={() => setSelected(value.member.id)}>{value.child.name} · {value.member.status} · {value.member.code}</Button>)}
        {debouncedSearch && searchResults.isSuccess && !visibleMembers.length && <p className="text-sm text-muted-foreground">No matching member.</p>}
      </div>
      {member ? <div className="grid gap-2 border p-3"><p><strong>{member.child.name}</strong> · {member.member.status} · {member.member.code}</p><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={printCard}>Print membership card</Button><Button size="sm" variant="outline" onClick={() => reissue.mutate({ id: member.member.id, reason: "Lost card" })}>{t("membership.reissue")}</Button>{isOwner && (member.member.status === "active" ? <Button size="sm" variant="outline" onClick={() => deactivate.mutate({ id: member.member.id, reason: "Owner deactivation" })}>{t("membership.deactivate")}</Button> : <Button size="sm" variant="outline" onClick={() => reactivate.mutate({ id: member.member.id, reason: "Owner reactivation" })}>{t("membership.reactivate")}</Button>)}</div></div> : null}
      {isOwner && selected ? <div className="grid gap-1 text-sm text-muted-foreground"><p>{t("membership.history")}: {history.data?.length ?? 0}</p>{history.isLoading ? <p>{t("membership.historyLoading")}</p> : null}{history.isError ? <p role="alert" className="text-destructive">{t("membership.historyError")}</p> : null}{history.data?.map((event) => <p key={event.id}>{event.type}{event.amount ? ` · IDR ${event.amount}` : ""}</p>)}</div> : null}
    </CardContent>
  </Card>;
}
