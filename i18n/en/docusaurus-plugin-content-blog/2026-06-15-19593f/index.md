---
title: "An Introduction to How I Think About Options"
date: 2026-06-15
authors: [tonylaw]
description: "A practical, from-the-trenches explainer on options — Calls, Puts, the buyer-vs-seller business, the four numbers to read first, and why discipline beats strategy."
slug: 2026-06-15-19593f
---

After reading my posts and the tools I've built, a lot of friends don't quite understand some of the jargon — things like "the Long Gamma life," "collecting rent," or "options." Let me try to explain, the way I understand them.

Many people hear the word "options" and immediately think: gambling, blowing up an account, losing everything.

I don't think that's entirely their fault.

Because when most people first touch options, it isn't through "risk management" — it's through a screenshot of someone else getting rich.

That's dangerous.

Options are not lottery tickets.

They are contracts.

If you place a bet without even reading what the contract says, that's not investing — that's handing your money to the market for redistribution.

I've paid tuition too.

Back then I was selling naked calls on UVXY. I figured the structural decay plus Theta was collecting rent for me every day — making money was as easy as robbing a bank. In two or three months I was up 50%. Then I got too busy with work and forgot when Powell was speaking. The market started pricing in rate-cut expectations; VIX doubled in two days.

Two days. Three hundred thousand RMB. Blown up.

## 0 — What Is an Option, Really

An option, at its core, is a "contract of choice."

It grants you a right: on or before some future date, to buy or sell a stock at a pre-agreed price.

Note: a right, not an obligation.

You can exercise. You can also not exercise.

One U.S. equity option contract usually represents 100 shares of stock.

So when you see a premium of 1.5 on the option chain, the contract doesn't cost $1.50 — that's $1.50 per share.

One contract actually costs:

1.5 × 100 = $150.

This is where many newbies get it wrong on step one.

They think they're buying just a little, only to discover after the fill that they control 100 shares.

Options come in only two flavors:

| Type | Meaning | What the buyer gets | When it fits |
|------|---------|--------------------|--------------|
| Call | Bullish / Long | The right to buy shares at the strike price | You're bullish, want upside exposure |
| Put  | Bearish / Short | The right to sell shares at the strike price | You're bearish, or want to insure a holding |

A Call can be understood as a real-estate deposit.

You spot a house, you think it'll go up, but you don't want to buy the whole thing today. You put down a deposit, locking in the right to buy at today's price later. If it rises, you have a chance to profit; if it falls, the most you lose is the deposit.

A Put is more like insurance.

You own a stock, you worry it might crash — you buy a Put. If it really does fall, the Put offsets part of the loss.

So the original logic of options is simple:

It is not a casino chip.

It is a deposit.

It is insurance.

It is a tool for redistributing risk.

It's just that, in the hands of most people, it turns into something used to prove how lucky they are.

This is where the trouble starts.

## 1 — Buyer and Seller Are Two Completely Different Businesses

There are only two roles in the options market:

Buyer. And seller.

The buyer pays a premium and receives a right.
The seller collects a premium and takes on an obligation.

It's a short sentence, but very important.

| Role | What happens at the start | Max profit | Max loss | Essence |
|------|---------------------------|-----------|---------|---------|
| Buyer | Pays premium | Theoretically very large | Capped at the premium | Paying money for an opportunity |
| Seller | Collects premium | Capped at the premium | Can be very large | Taking money to bear an obligation |

The buyer is like someone buying insurance.

You spend money to buy a possibility; if you're wrong, the most you lose is the premium.

The seller is like the insurance company.

You collect the premium up front — but once a claim hits, you pay.

A lot of people love selling options because you collect money the moment you open the trade.

Cash hits the account immediately.

It flatters human nature.

People like certain pleasure and dislike future uncertainty.

But here's the thing: that premium you collected isn't a gift from the market.

It's the price of the risk you took on.

If you don't know exactly which disaster you're underwriting, you'll be paying that money back sooner or later.

## 2 — Reading the Option Chain: Start With Four Numbers

When a beginner opens an option chain, the wall of numbers is intimidating.

For the entry phase, four numbers are enough.

| Metric | What it means | How to think about it |
|--------|--------------|----------------------|
| DTE | Days to expiry | How long until expiration — drives time-decay speed |
| Strike | Strike price | The future price you'd buy or sell at |
| Delta | Directional sensitivity / approximate exercise probability | Delta 0.2 ≈ roughly 20% chance of being exercised |
| IV | Implied volatility | The market's expectation of future movement — higher IV, pricier premium |

There's another important Greek called Theta.

Theta represents how much time value decays per day.

For the buyer, Theta is the enemy. You can be right on direction but run out of time — and still lose money.

For the seller, Theta is a friend. As long as the market doesn't move violently, time collects rent for you every day.

But note: Theta is a friend, not a patron saint.

It will not protect you when the black swan arrives.

Before I blew up, I also thought Theta was invincible.

Later I learned that the small change Theta pays you each day might just be the disaster premium the market paid you in advance.

You collected the premium — you'd better be ready to underwrite the disaster.

## 3 — Ordinary People Should Learn Seller Logic First

I don't recommend newbies start by buying short-term options.

Short-term options require you to nail both direction and time simultaneously.

Right direction, wrong time — you still lose.

What's far more suitable for regular people to learn slowly is two seller strategies:

Covered Calls. And Cash-Secured Puts.

Covered Call first.

You already own 100 shares, then you sell one Call.

If the stock doesn't exceed the strike by expiry, you keep the premium.

If the stock does exceed the strike, you may end up selling your shares at the agreed price.

Its essence:

Trade a piece of future upside for a deterministic cash flow today.

I have many friends whose companies granted them lots of vested, freely tradable shares — very low cost basis, almost "free."

But they just hold them.

Watching them drop every day.

If they understood Covered Calls, those shares wouldn't just be numbers lying in the account — they could spin off a little cash flow every month.

Now Cash-Secured Puts.

You were going to buy a good stock anyway, you just think the price is expensive right now.

So you sell a Put at the level where you'd actually want to buy.

If the stock doesn't fall to your strike, you keep the premium.

If it does, you buy the stock at the price you were already willing to pay.

Its essence:

Get paid to wait to buy.

Neither of these strategies is a sure win.

But they share one thing in common:

You know what you'd do in the worst case.

The worst case for a Covered Call is the stock gets called away.

The worst case for a Cash-Secured Put is you take delivery with the cash you'd set aside.

This is completely different from a naked call.

A naked call has no protection, and the risk can be enormous.

My three hundred thousand RMB is the tuition fee carved under this line.

## 4 — My Discipline: Not Maximum Return — Survival First

If I had to give one simple parameter, I'd say:

Sellers — don't be greedy.

I prefer opportunities with Delta between 0.15 and 0.25.

That roughly corresponds to a 75%–85% probability of expiring worthless.

Too far — say Delta 0.05 — is very safe, but the premium is too thin to justify tying up capital.

Too close — Delta 0.3+ — looks juicy, but one leg down can wipe out several prior wins.

I also prefer expiry between one week and one month.

Too far out ties up capital long and Theta pays slowly.

Too close — especially 0DTE — Theta decays fast, but Gamma risk is brutal. A small move in the stock and your P&L can flip.

So I look for balance in the middle.

| Strategy | What you're earning | What I watch | Pre-condition |
|---------|---------------------|--------------|---------------|
| Covered Call | Time value / premium | Already own shares; pick a strike you'd be OK selling at | Accept that the stock may be called away |
| Cash-Secured Put | Time value / premium | Delta 0.15–0.25, 21 days to one month | Have cash; willing to take delivery at the strike |
| LEAPS Call | Direction + leverage | Six months+, higher Delta | Strong conviction on long-term direction |
| Short-term options | Quick directional bet | Extremely timing-dependent | Newbies — best not to |

One-line summary: sellers eat on time, buyers eat on direction. But on either side, position sizing is always more important than strategy.

## 5 — Why I Built Theta

My original intent was simple: when I run strategies myself, I want to quickly find the options I want — and see the risk and return clearly.

When you're making money, you get cocky.

When you're losing money, you want to double down — to prove you were right.

Willpower alone can't solve this over the long run.

So I don't want Theta to tell you "what to buy next."

I want it to help you see, before you place the order, a few things:

| Question | Why it matters |
|---------|---------------|
| What's the Delta on this option? | Know roughly the probability of exercise you're taking on |
| How many days to expiry? | Know whether you're earning Theta or gambling on Gamma |
| Any earnings or macro events? | Avoid naked risk into events |
| Annualized return | Does the premium justify the risk I'm taking? |
| Underlying overview | A multi-factor first-pass score on the underlying |

The system can't take risk for you.

But it can remind you where the risk is.

It lets you see, before you place the order, what you're actually selling, what you're taking on, what you're betting on.

That's why I built Theta.

Not to turn regular people into gamblers.

But to give regular people a chance to manage their assets and cash flow with thinking closer to professional investors and institutions.

So — concepts first.

Then discipline.

Only then, trading.

Making money always ranks after staying alive.

Hands-on practice can start with a paper-trading account.

---

*Disclaimer: This article is a personal study note and experience review. The stories, strategies, and tools mentioned do not constitute investment advice. Markets carry risk; trade with caution. Options involve leverage and can result in total loss of principal.*
