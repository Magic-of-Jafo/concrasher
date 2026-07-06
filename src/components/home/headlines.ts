// Rotating hero messages. One is picked at random on the server for each page
// view (the homepage is force-dynamic, so every refresh can land a new one).
//
// Each message answers a specific objection a would-be first-timer has about
// attending a magic convention. The comment above each entry names the
// objection so future edits keep the answer aimed at something real.
// Voice: a knowledgeable friend who's been to a hundred conventions, not a
// hype machine. Inclusive of every age and skill level. No em dashes.

export interface HeroMessage {
  headline: string;
  sub: string;
}

export const HERO_MESSAGES: HeroMessage[] = [
  // "I could never actually go to one."
  {
    headline: 'Your first magic convention is closer than you think.',
    sub: "Live shows, lectures, and late-night jam sessions with people who love magic as much as you do. See what's happening near you, no account needed.",
  },
  // "I'm not good enough."
  {
    headline: "You don't have to be good. You have to be curious.",
    sub: 'Conventions are full of hobbyists, beginners, and fans. Nobody checks your double lift at the door.',
  },
  // "It's an industry event for working pros."
  {
    headline: 'This is not a trade show.',
    sub: 'Most of the room is amateurs with day jobs who love this stuff. The pros show up to hang out with them.',
  },
  // "I'd have to show up alone."
  {
    headline: "Show up alone. You won't stay that way.",
    sub: 'Lobby sessions run past midnight, and a deck of cards is all the introduction you need.',
  },
  // "It's not for people my age or my level."
  {
    headline: 'Any age. Any skill level. Same room.',
    sub: 'Teenagers session with headliners at these things. Retirees too. That mix is the whole point.',
  },
  // "I can learn everything online."
  {
    headline: "There's magic YouTube can't teach you.",
    sub: 'Seeing a move in person, asking the person who created it, then trying it that night in the lobby. That kind.',
  },
  // "It's too expensive."
  {
    headline: "A weekend of magic costs less than you'd guess.",
    sub: 'Plenty of conventions sell day passes, and the late-night sessions are free. Start small if you want.',
  },
  // "What would I even do there?"
  {
    headline: 'Shows, lectures, dealers, and a lobby that never sleeps.',
    sub: "Gala shows at night, workshops by day, and a dealers' room full of things you didn't know existed.",
  },
  // "I'd feel like an imposter."
  {
    headline: "If you've ever practiced a move at 2am, you belong here.",
    sub: 'That is the entire membership requirement. Everyone in the room started where you are.',
  },
  // "Live magic is a dying scene."
  {
    headline: 'Live magic is doing just fine. Come see.',
    sub: 'New conventions, new performers, packed gala shows. The listings below are the proof.',
  },
];

export function pickHeroMessage(): HeroMessage {
  return HERO_MESSAGES[Math.floor(Math.random() * HERO_MESSAGES.length)];
}
