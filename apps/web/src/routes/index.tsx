import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRightIcon,
  BookOpenIcon,
  Gamepad2Icon,
  PaletteIcon,
  RocketIcon,
  SparklesIcon,
} from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export const Route = createFileRoute("/")({ component: Home });

const features = [
  {
    icon: Gamepad2Icon,
    title: "Games",
    description: "Quick, silly games that make you smile.",
  },
  {
    icon: BookOpenIcon,
    title: "Stories",
    description: "Tiny tales for big imaginations.",
  },
  {
    icon: PaletteIcon,
    title: "Art",
    description: "Draw, color, and make a mess — digitally.",
  },
];

function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 p-8">
      <section className="flex max-w-2xl flex-col items-center gap-4 text-center">
        <Button variant="outline" size="sm">
          <RocketIcon data-icon="inline-start" />
          Kiddy Land is live
        </Button>
        <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">
          Play. Learn. <span className="text-primary">Grow.</span>
        </h1>
        <p className="text-base text-muted-foreground">
          A cozy corner of the internet built for curious kids — no noise, just
          fun.
        </p>
      </section>

      <Card size="sm" className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Start your adventure</CardTitle>
          <CardDescription>Pick something fun to do today</CardDescription>
          <CardAction>
            <Button variant="ghost" size="icon-sm" aria-label="Coming soon">
              <SparklesIcon />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="flex items-center gap-3 border border-border p-3"
            >
              <feature.icon className="size-5 shrink-0 text-primary" />
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium">{feature.title}</p>
                <p className="text-xs text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
        <CardFooter>
          <Button className="w-full">
            Start exploring
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
