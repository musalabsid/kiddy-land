import * as React from "react";
import { usePublicProducts, usePublicTicket } from "@kiddy-land/client/react";
import { formatIdr } from "@kiddy-land/localization";
import { useLocale } from "@workspace/ui/lib/i18n";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";

export function PublicKiosk() {
  const { locale } = useLocale(); const [code, setCode] = React.useState(""); const [search, setSearch] = React.useState(""); const ticket = usePublicTicket(code.trim()); const products = usePublicProducts(search);
  return <main className="grid min-h-dvh gap-6 bg-background p-6 md:grid-cols-2"><Card><CardHeader><CardTitle>Ticket check</CardTitle></CardHeader><CardContent className="grid gap-3"><form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void ticket.refetch(); }}><input className="h-10 min-w-0 flex-1 border px-3 font-mono" aria-label="Ticket code" value={code} onChange={(event) => setCode(event.target.value)} /><Button type="submit" disabled={!code.trim() || ticket.isFetching}>Check</Button></form>{ticket.data && <p className={ticket.data.ok ? "text-primary" : "text-destructive"}>{ticket.data.message} · {ticket.data.remainingMinutes} minutes remaining</p>}{ticket.error && <p className="text-destructive">Unable to check ticket. Reconnect and try again.</p>}</CardContent></Card><Card><CardHeader><CardTitle>Product prices</CardTitle></CardHeader><CardContent className="grid gap-3"><input className="h-10 border px-3" aria-label="Search products" placeholder="Search" value={search} onChange={(event) => setSearch(event.target.value)} />{products.data?.map((product) => <div className="flex justify-between border-b py-2" key={product.id}><span>{product.name}</span><strong>{formatIdr(product.price, locale)}</strong></div>)}{products.isError && <p className="text-destructive">Unable to load prices. Reconnect and try again.</p>}</CardContent></Card></main>;
}
