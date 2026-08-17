import * as React from "react";
import { useMemberByCode, useRegisterMember, useSearchMembers } from "@kiddy-land/client/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@workspace/ui/components/button";
import { FormField } from "@workspace/ui/components/form-field";

const registerSchema = z.object({
  name: z.string().trim().min(1, "Child name is required"),
  phone: z.string().trim().min(1, "Phone is required"),
});
type RegisterValues = z.infer<typeof registerSchema>;

export function MemberPicker({ onSelect }: { onSelect: (member: { id: string; childId: string; code: string; name: string; status: "active" | "deactivated" }) => void }) {
  const [code, setCode] = React.useState("");
  const [searchName, setSearchName] = React.useState("");
  const [searchPhone, setSearchPhone] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [registeredCode, setRegisteredCode] = React.useState("");
  const found = useMemberByCode(searching ? undefined : code);
  const matches = useSearchMembers(searching ? searchName : "", searching ? searchPhone : "");
  const register = useRegisterMember();
  const { register: registerField, handleSubmit, reset, formState: { errors } } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema), defaultValues: { name: "", phone: "" } });
  const select = (value: { member: { id: string; childId: string; code: string; status: "active" | "deactivated" }; child: { id: string; name: string } }) => { setRegisteredCode(value.member.code); onSelect({ id: value.member.id, childId: value.child.id, code: value.member.code, name: value.child.name, status: value.member.status }); };
  const submitRegister = handleSubmit((values) => { register.mutate({ name: values.name, phone: values.phone }, { onSuccess: (value) => { select(value); reset(); } }); });
  return <div className="grid gap-3 border p-3">
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
      <FormField label="Membership code" optional htmlFor="member-code" className="gap-1.5"><input id="member-code" className="h-9 min-w-0 border border-input bg-background px-2 text-sm" placeholder="Membership code" value={code} onChange={(e) => { setCode(e.target.value); setSearching(false); }} /></FormField>
      <Button className="!h-9 self-end" onClick={() => { const value = found.data; if (value) select(value); }}>Find</Button>
    </div>
    <form className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]" onSubmit={submitRegister} noValidate>
      <FormField label="Child name" required htmlFor="member-name" error={errors.name?.message} className="gap-1.5"><input id="member-name" className="h-9 min-w-0 border border-input bg-background px-2 text-sm" placeholder="Child name" aria-invalid={errors.name ? true : undefined} {...registerField("name")} /></FormField>
      <FormField label="Phone" required htmlFor="member-phone" error={errors.phone?.message} className="gap-1.5"><input id="member-phone" className="h-9 min-w-0 border border-input bg-background px-2 text-sm" placeholder="Phone" aria-invalid={errors.phone ? true : undefined} {...registerField("phone")} /></FormField>
      <Button className="!h-9 self-end" size="sm" variant="outline" type="button" onClick={() => { setSearching(true); void matches.refetch(); }}>{"Find by name/phone"}</Button>
      <Button className="!h-9 self-end" size="sm" variant="outline" type="submit">Register</Button>
    </form>
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <FormField label="Search by child name" optional htmlFor="member-search-name" className="gap-1.5"><input id="member-search-name" className="h-9 min-w-0 border border-input bg-background px-2 text-sm" placeholder="Child name" value={searchName} onChange={(e) => setSearchName(e.target.value)} /></FormField>
      <FormField label="Search by phone" optional htmlFor="member-search-phone" className="gap-1.5"><input id="member-search-phone" className="h-9 min-w-0 border border-input bg-background px-2 text-sm" placeholder="Phone" value={searchPhone} onChange={(e) => setSearchPhone(e.target.value)} /></FormField>
    </div>
    {registeredCode ? <p className="text-sm font-mono">Membership code: {registeredCode}</p> : null}
    {found.data ? <p className="text-sm">{found.data.child.name} · {found.data.member.status}</p> : null}
    {matches.data?.map((value) => <Button key={value.member.id} size="sm" variant="ghost" onClick={() => select(value)}>{value.child.name} · {value.member.status}</Button>)}
  </div>;
}
