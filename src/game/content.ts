// Decision & event library. Content is data — the UI renders whatever the engine selects.
import type { Decision, LifeEvent, Life, Option, Effect } from "./types";
import { CITIES, CAREERS, cityCountry, moneyScale } from "./world";

const o = (label: string, hints: string[], outcome: string, effect: Effect): Option => ({ label, hints, outcome, effect });
const has = (l: Life, f: string) => l.flags.includes(f);
const partnered = (l: Life) => l.rels.some((r) => r.role === "partner" || r.role === "spouse");
const married = (l: Life) => l.rels.some((r) => r.role === "spouse");
const abroad = (l: Life) => CITIES[l.cityId].country !== CITIES[l.bornCity].country;
const rich = (l: Life, n: number) => l.money.cash + l.money.invest >= n * moneyScale(l.cityId);
// share of current cash, expressed in UK-priced units so applyEffect's scaling cancels out
const share = (l: Life, f: number) => Math.round((Math.max(0, l.money.cash) * f) / moneyScale(l.cityId));

export const foreignCities = (l: Life, n = 2) => {
  const here = CITIES[l.cityId].country;
  const pool = Object.values(CITIES).filter((c) => c.country !== here);
  return pool.sort(() => Math.random() - 0.5).slice(0, n);
};
const moveOpt = (cityId: string, label: string, hints: string[], outcome: string, extra: Effect = {}) =>
  o(label, hints, outcome, { move: cityId, ...extra });

export const DECISIONS: Decision[] = [
  // ——— CHILDHOOD
  { id: "first_friend", minAge: 5, maxAge: 7, title: "The new kid", prompt: "A quiet child sits alone at lunch on your first week of school.", options: () => [
    o("Share your lunch", ["A new friendship", "Less time with your group"], "You split your food. By Friday you are inseparable.", { stats: { social: 6, relationships: 6, confidence: 3 }, rel: { role: "friend", delta: 25, memory: "Shared lunch on the first week of school" } }),
    o("Stay with your own group", ["Safe and familiar"], "You stay where you are comfortable. The kid finds other friends.", { stats: { social: 2 } }),
    o("Tell the teacher", ["Seen as responsible", "Maybe seen as a snitch"], "The teacher seats you together. It is awkward, then it isn't.", { stats: { reputation: 3, social: 2 }, rel: { role: "friend", delta: 12 } }),
  ]},
  { id: "hobby", minAge: 5, maxAge: 9, title: "After school", prompt: "Your parents ask what you want to do after school.", options: () => [
    o("Football", ["Health", "Team friendships"], "You live on the pitch. Your knees are always muddy.", { stats: { health: 8, social: 5 }, flag: "sporty" }),
    o("Music lessons", ["Discipline", "A lifelong skill", "Costs money"], "Scales, every evening. Something starts to stick.", { stats: { education: 3, confidence: 3 }, cash: -300, flag: "musical" }),
    o("Drawing", ["Creativity", "Quiet hours"], "Your notebooks fill with other worlds.", { stats: { happiness: 5 }, flag: "artistic" }),
    o("Books, endless books", ["Education", "Fewer friends"], "You read under the covers with a torch.", { stats: { education: 8, social: -3 }, flag: "reader" }),
  ]},
  { id: "sibling_fight", minAge: 7, maxAge: 11, when: (l) => l.family.siblings > 0, title: "Broken toy", prompt: "Your sibling broke something you loved and is denying it.", options: () => [
    o("Forgive them", ["Closer bond"], "You let it go. They remember that.", { rel: { role: "sibling", delta: 15, memory: "You forgave them as a child" }, stats: { family: 4 } }),
    o("Tell your parents", ["Justice", "Resentment"], "They are punished. The house is cold for a week.", { rel: { role: "sibling", delta: -10 }, stats: { family: -2 } }),
    o("Get even", ["Satisfaction", "Escalation"], "You break something of theirs. It becomes a long war.", { rel: { role: "sibling", delta: -20, memory: "The childhood feud" }, stats: { family: -5, confidence: 2 } }),
  ]},
  { id: "bully", minAge: 8, maxAge: 11, title: "The playground", prompt: "An older kid has started taking your things every day.", options: () => [
    o("Stand up to them", ["Confidence", "Could get hurt"], "", { risk: { chance: 0.55, boost: "confidence", win: { text: "They back off. Others saw it.", stats: { confidence: 10, reputation: 5 } }, lose: { text: "You get a black eye. But they never bother you again.", stats: { health: -4, confidence: 4 } } } }),
    o("Tell an adult", ["Safer", "Slower"], "It takes weeks, but it stops.", { stats: { stress: -3, confidence: -2 } }),
    o("Avoid them", ["No conflict", "Living smaller"], "You learn every alternative route home.", { stats: { stress: 5, confidence: -5 } }),
  ]},
  { id: "exam_prep", minAge: 10, maxAge: 12, title: "Entrance exams", prompt: "Big exams are coming that decide which secondary school you go to.", options: (l) => [
    o("Study every evening", ["Better school", "Less play"], "Your results surprise everyone.", { stats: { education: 10, happiness: -3, stress: 4 } }),
    o("Keep playing", ["Happier childhood", "Fewer doors"], "You do fine. Not great. You had a good summer.", { stats: { happiness: 6, education: 2 } }),
    ...(l.family.tier !== "low" && l.family.tier !== "lowermiddle" ? [o("Your parents hire a tutor", ["Big advantage", "Pressure"], "The tutor is strict. It works.", { stats: { education: 14, stress: 6 }, cash: -1500 })] : []),
  ]},
  // ——— TEENAGE
  { id: "secondary", minAge: 11, maxAge: 13, title: "Secondary school", prompt: "There are three schools you could go to.", options: (l) => [
    o("The local school", ["Friends nearby", "Mixed standards"], "You walk to school with the same kids from your street.", { stats: { social: 5, education: 3 } }),
    o("The academic school across town", ["Better education", "Long commute"], "You get up at six. The teachers expect a lot.", { stats: { education: 9, stress: 5, social: -2 } }),
    ...(rich(l, 10000) ? [o("Boarding school", ["Elite network", "Distance from family"], "You learn to be alone, and to be impressive.", { stats: { education: 12, reputation: 6, family: -8 }, cash: -8000, flag: "boarding" })] : []),
  ]},
  { id: "teen_job", minAge: 14, maxAge: 16, title: "Weekends", prompt: "A shop owner nearby needs weekend help.", options: () => [
    o("Take the job", ["Your own money", "Less study"], "Your first pay packet feels enormous.", { cash: 1200, stats: { confidence: 5, education: -2 }, flag: "worked_young" }),
    o("Focus on school", ["Grades"], "You keep the weekends for books.", { stats: { education: 5 } }),
    o("Volunteer instead", ["Reputation", "No money"], "You help at a community centre. People start to know your name.", { stats: { reputation: 6, happiness: 3 } }),
  ]},
  { id: "party", minAge: 14, maxAge: 17, title: "The party", prompt: "Everyone is going to a party on a school night. Your parents said no.", options: () => [
    o("Sneak out", ["Social status", "Getting caught"], "", { risk: { chance: 0.6, win: { text: "The best night of your teenage years.", stats: { social: 8, happiness: 5 } }, lose: { text: "Caught climbing back in. Grounded for a month.", stats: { family: -8, social: 3 } } } }),
    o("Stay home", ["Trust at home", "Missing out"], "You hear about it for weeks.", { stats: { family: 4, social: -3 } }),
    o("Ask again, honestly", ["Maybe a compromise"], "They let you go until eleven. You make it home on time.", { stats: { family: 5, social: 3 } }),
  ]},
  { id: "first_love", minAge: 15, maxAge: 17, title: "First love", prompt: "Someone in your year keeps finding reasons to talk to you.", options: () => [
    o("Ask them out", ["Romance", "Heartbreak"], "", { risk: { chance: 0.6, boost: "confidence", win: { text: "Six months of notes and long phone calls. Then it ends, gently.", stats: { happiness: 6, relationships: 6, confidence: 4 } }, lose: { text: "They say no. You survive it.", stats: { confidence: -4 } } } }),
    o("Wait and see", ["Nothing lost"], "The moment passes.", { stats: {} }),
    o("Focus on your grades", ["Education"], "You keep your head down.", { stats: { education: 4, relationships: -2 } }),
  ]},
  { id: "subjects", minAge: 15, maxAge: 17, title: "Choosing subjects", prompt: "You must choose which subjects to specialise in.", options: () => [
    o("Sciences", ["Medicine, engineering", "Hard work"], "Long nights with equations.", { stats: { education: 6 }, flag: "science" }),
    o("Humanities", ["Law, teaching"], "You learn to argue.", { stats: { education: 5 }, flag: "humanities" }),
    o("Arts", ["Creative careers", "Less security"], "You feel like yourself.", { stats: { happiness: 6, education: 3 }, flag: "arts" }),
    o("Business & economics", ["Finance, entrepreneurship"], "You start reading markets for fun.", { stats: { education: 5 }, flag: "business_minded" }),
  ]},
  { id: "parent_expect", minAge: 16, maxAge: 17, title: "Their plan for you", prompt: "Your parents have strong opinions about what you should become.", options: () => [
    o("Follow their path", ["Family harmony", "Maybe regret"], "They are proud. You are not sure.", { stats: { family: 10, happiness: -4 } }),
    o("Choose your own path", ["Freedom", "Conflict at home"], "There is shouting. Then a long silence.", { stats: { family: -8, confidence: 8, happiness: 4 }, rel: { role: "parent", delta: -12, memory: "You defied their plan" } }),
    o("Find a compromise", ["Balance"], "Nobody gets exactly what they wanted.", { stats: { family: 3, confidence: 2 } }),
  ]},
  // ——— 18
  { id: "uni_failed", minAge: 18, maxAge: 18, major: true, when: (l) => l.stats.education < 62, title: "Results day", prompt: "Your university application has been unsuccessful.", options: () => [
    o("Retake your exams", ["Delayed entry", "Better university", "Cost & pressure"], "A hard year. The second time, you get in.", { stats: { education: 10, stress: 8 }, cash: -1500, flag: "uni", log: "Retook exams, then university" }),
    o("Attend another university", ["Start immediately", "Different opportunities"], "It isn't your first choice. It becomes yours.", { stats: { education: 7, social: 4 }, flag: "uni", log: "Started university" }),
    o("Start working", ["Immediate income", "Less formal education"], "You start at the bottom and learn fast.", { career: "retail", stats: { confidence: 4 }, log: "Started working at 18" }),
    o("Start a business", ["Financial risk", "Independence"], "", { career: "entrepreneur", flag: "business", log: "Started a business at 18", risk: { chance: 0.35, boost: "confidence", win: { text: "It takes off. People start ordering from you.", cash: 6000, stats: { confidence: 12 } }, lose: { text: "It fails within a year. You learn more than any classroom taught you.", debt: 3000, stats: { confidence: 3, stress: 8 } } } }),
    o("Do something completely different", ["Unknown"], "You join a touring crew and see the country from the back of a van.", { career: "musician", stats: { happiness: 8, social: 6 }, log: "Left to follow music" }),
  ]},
  { id: "uni_choice", minAge: 18, maxAge: 18, major: true, when: (l) => l.stats.education >= 62, title: "Offers", prompt: "You have university offers — and one from abroad.", options: (l) => {
    const [c] = foreignCities(l, 1);
    return [
      o("Study locally", ["Near family", "Cheaper"], "You stay close to home and come back for Sunday lunch.", { flag: "uni", stats: { education: 8, family: 4 }, log: "Started university" }),
      moveOpt(c.id, `Study in ${c.name}`, ["New country", "Expensive", "Distance from home"], `You land in ${c.name} with two suitcases.`, { flag: "uni", stats: { education: 12, confidence: 6, family: -6 }, debt: 15000, log: `Moved to ${c.name} for university` }),
      o("Take an apprenticeship", ["Earn while learning", "Practical path"], "You learn a trade from people who've done it for decades.", { career: "engineer", stats: { education: 4, confidence: 4 }, log: "Began an apprenticeship" }),
      o("Start working", ["Money now"], "You skip the lectures and start earning.", { career: "auto", log: "Started working at 18" }),
    ];
  }},
  { id: "course", minAge: 18, maxAge: 19, when: (l) => has(l, "uni"), title: "Your degree", prompt: "You need to commit to a degree.", options: (l) => [
    ...(l.stats.education >= 75 ? [o("Medicine", ["Long training", "Respected career"], "Seven years, but you know it's yours.", { flag: "deg_medicine", stats: { stress: 8, education: 8 } })] : []),
    o("Law", ["Prestige", "Pressure"], "Your reading list could crush a car.", { flag: "deg_law", stats: { education: 7 } }),
    o("Computer science", ["Strong job market"], "You build things at 3am.", { flag: "deg_cs", stats: { education: 7 } }),
    o("Engineering", ["Stable career"], "Bridges, circuits, problem sets.", { flag: "deg_eng", stats: { education: 7 } }),
    o("Arts or music", ["Fulfilment", "Uncertain pay"], "You are happier than your friends. Poorer, too.", { flag: "deg_arts", stats: { happiness: 6, education: 4 } }),
    o("Business", ["Finance or your own company"], "Spreadsheets and big talk.", { flag: "deg_business", stats: { education: 6 } }),
  ]},
  { id: "student_money", minAge: 19, maxAge: 21, when: (l) => has(l, "uni"), title: "Paying for it", prompt: "Money is running out halfway through university.", options: (l) => [
    o("Take a student loan", ["Debt", "Time to study"], "The number on the statement is large and abstract.", { debt: 12000, stats: { education: 4 } }),
    o("Work part-time", ["Less debt", "Tired"], "You work bar shifts and study on the bus.", { cash: 3000, stats: { stress: 7, education: -2, confidence: 3 } }),
    ...(l.family.tier !== "low" ? [o("Ask your family", ["No debt", "Owing them"], "They help. They mention it sometimes.", { stats: { family: -2 }, cash: 4000 })] : []),
  ]},
  { id: "dropout", minAge: 19, maxAge: 21, when: (l) => has(l, "uni") && l.stats.stress > 55, title: "Breaking point", prompt: "You are exhausted. You're thinking of leaving university.", options: () => [
    o("Push through", ["A degree", "Health cost"], "You graduate grey-faced and proud.", { stats: { education: 6, health: -5, stress: 5 } }),
    o("Drop out", ["Freedom", "Fewer options"], "You leave. It feels like failure, then like relief.", { unflag: "uni", stats: { stress: -15, education: -6, happiness: 4 }, career: "auto", log: "Dropped out of university" }),
    o("Take a year off", ["Recovery", "Delay"], "You come back slower and wiser.", { stats: { stress: -12, health: 4 } }),
  ]},
  { id: "gap_travel", minAge: 20, maxAge: 24, title: "The world", prompt: "A friend is going travelling for a year and wants you to come.", options: () => [
    o("Go", ["Adventure", "Delay career", "Spend savings"], "Night buses, strange beaches, a story for every dinner.", { cash: -4000, stats: { happiness: 10, confidence: 8, career: -4 }, flag: "adventurer", rel: { role: "friend", delta: 15, memory: "The year travelling together" } }),
    o("Stay and save", ["Money", "Momentum"], "You watch their photos from your desk.", { cash: 3000, stats: { career: 4 } }),
    o("Volunteer abroad briefly", ["Purpose", "Reputation"], "Three months teaching in a small town changes how you see things.", { cash: -1000, stats: { reputation: 6, happiness: 6 }, flag: "adventurer" }),
  ]},
  { id: "first_job", minAge: 21, maxAge: 23, when: (l) => !l.careerId || l.careerId === "retail", title: "First real job", prompt: "Offers arrive. Each one is a different life.", options: (l) => {
    const pref: Record<string, string> = { deg_medicine: "doctor", deg_law: "lawyer", deg_cs: "developer", deg_eng: "engineer", deg_arts: "artist", deg_business: "finance" };
    const fromDeg = Object.keys(pref).filter((f) => has(l, f)).map((f) => pref[f]);
    const pool = Object.values(CAREERS).filter((c) => c.minEdu <= l.stats.education + 5 && c.id !== "entrepreneur").map((c) => c.id);
    const picks = Array.from(new Set([...fromDeg, ...pool.sort(() => Math.random() - 0.5)])).slice(0, 4);
    return picks.map((id) => {
      const c = CAREERS[id];
      return o(c.name, [c.base > 45000 ? "Higher pay" : "Modest pay", c.stress > 65 ? "High pressure" : "Manageable hours", c.satisfaction > 70 ? "Meaningful work" : "A living"], `You start as a ${c.name.toLowerCase()}.`, { career: id, log: `First job: ${c.name}` });
    });
  }},
  { id: "first_home", minAge: 21, maxAge: 25, when: (l) => l.housing === "family", title: "Leaving home", prompt: "You could move out — or stay a little longer.", options: () => [
    o("Stay with family", ["Save money", "Less independence"], "Your mum still does your laundry. You save hard.", { stats: { family: 4, confidence: -2 } }),
    o("Rent a shared room", ["Cheap", "Housemates"], "Five people, one bathroom, a lot of noodles.", { housing: "shared", stats: { social: 5, confidence: 4 } }),
    o("Rent a studio", ["Privacy", "Expensive"], "It's tiny, but every inch is yours.", { housing: "studio", stats: { confidence: 6, happiness: 3 } }),
  ]},
  // ——— YOUNG ADULT
  { id: "job_abroad", minAge: 23, maxAge: 32, major: true, when: (l) => !!l.careerId, title: "An offer abroad", prompt: "Your company has offered you a position overseas.", options: (l) => {
    const [a, b] = foreignCities(l, 2);
    return [
      moveOpt(a.id, `Move to ${a.name}`, ["Career growth", "Distance from family", "New culture"], `You arrive in ${a.name}. Everything is unfamiliar.`, { careerLevel: 2, stats: { career: 8, family: -8, confidence: 5 }, housing: "studio", log: `Moved to ${a.name}` }),
      moveOpt(b.id, `Move to ${b.name}`, ["Career growth", "Distance from family"], `You arrive in ${b.name} with a work visa and a nervous stomach.`, { careerLevel: 2, stats: { career: 8, family: -8, confidence: 5 }, housing: "studio", log: `Moved to ${b.name}` }),
      o(`Stay in ${CITIES[l.cityId].name}`, ["Roots", "Slower career"], "You turn it down. Your friends say you're mad. Your mother says you're wise.", { stats: { family: 6, career: -3 } }),
    ];
  }},
  { id: "meet_partner", minAge: 22, maxAge: 34, when: (l) => !partnered(l), title: "Someone", prompt: "You meet someone at a friend's birthday. It feels different.", options: () => [
    o("Pursue it seriously", ["Love", "Vulnerability"], "", { risk: { chance: 0.7, boost: "relationships", win: { text: "Within a year, they are your person.", partner: "add", stats: { happiness: 10, relationships: 10 } }, lose: { text: "It burns bright and ends badly.", stats: { happiness: -5, relationships: 3 } } } }),
    o("Keep it casual", ["Freedom"], "Fun, but you both know it won't last.", { stats: { happiness: 3 } }),
    o("Focus on your career", ["Career", "Loneliness"], "You work late instead.", { stats: { career: 5, relationships: -5 } }),
  ]},
  { id: "marry", minAge: 25, maxAge: 40, major: true, when: (l) => partnered(l) && !married(l), title: "Forever?", prompt: "You've been together a few years. The question hangs in the air.", options: () => [
    o("Propose", ["Commitment", "Wedding costs"], "They say yes before you finish the sentence.", { partner: "marry", cash: -6000, stats: { happiness: 10, relationships: 8 }, log: "Married" }),
    o("Wait a little longer", ["Time", "Their patience"], "They say they understand.", { rel: { role: "partner", delta: -8 } }),
    o("End it", ["Freedom", "Heartbreak"], "You both cry. It is the right thing, probably.", { partner: "leave", stats: { happiness: -10, relationships: -5 }, log: "Ended a long relationship" }),
  ]},
  { id: "start_business", minAge: 25, maxAge: 42, major: true, when: (l) => !has(l, "business"), title: "The idea", prompt: "You have an idea you can't stop thinking about.", options: () => [
    o("Quit and start the business", ["Potential wealth", "Potential failure", "Stress"], "", { career: "entrepreneur", flag: "business", log: "Started a business", risk: { chance: 0.45, boost: "confidence", win: { text: "It works. Customers come. You hire your first employee.", cash: 30000, stats: { confidence: 10, career: 12, stress: 8 } }, lose: { text: "It fails after two years. The debt follows you.", debt: 20000, stats: { stress: 15, confidence: -6 } } } }),
    o("Start it on the side", ["Lower risk", "Exhausting"], "Evenings and weekends. Slowly, it grows.", { cash: 5000, stats: { stress: 8, career: 3 }, flag: "side_hustle" }),
    o("Let it go", ["Stability"], "Years later you see someone else build it.", { stats: { happiness: -2 } }),
  ]},
  { id: "promotion", minAge: 26, maxAge: 45, when: (l) => !!l.careerId && l.careerId !== "entrepreneur", title: "Promotion", prompt: "You're offered a senior role. More money, much longer hours.", options: () => [
    o("Accept", ["Higher income", "Less free time"], "The title changes. So do your weekends.", { careerLevel: 2, stats: { career: 8, stress: 10, relationships: -5 } }),
    o("Decline", ["Balance", "Stalled career"], "You leave at six. Every day.", { stats: { happiness: 4, career: -3 } }),
    o("Negotiate flexibility", ["Maybe both"], "", { risk: { chance: 0.5, boost: "confidence", win: { text: "They agree. You get the role and your evenings.", careerLevel: 2, stats: { career: 6, happiness: 4 } }, lose: { text: "They give the role to someone else.", stats: { career: -2, confidence: -3 } } } }),
  ]},
  { id: "masters", minAge: 24, maxAge: 34, when: (l) => l.stats.education > 50, title: "Back to study", prompt: "A master's programme accepts you.", options: () => [
    o("Enrol", ["Better prospects", "Cost"], "You become a student again, older and hungrier.", { cash: -10000, stats: { education: 12, career: 4 } }),
    o("Keep working", ["Income"], "Experience is an education too.", { stats: { career: 3 } }),
  ]},
  { id: "buy_home", minAge: 28, maxAge: 45, when: (l) => rich(l, 15000) && !has(l, "homeowner"), title: "A place of your own", prompt: "You've saved enough for a deposit.", options: () => [
    o("Buy a home", ["Mortgage", "Stability", "Less flexibility"], "You get the keys. It smells of someone else's paint.", { flag: "homeowner", cash: -15000, property: 120000, debt: 100000, housing: "house", stats: { happiness: 6, stress: 4 }, log: "Bought a home" }),
    o("Keep renting", ["Flexibility"], "You stay light on your feet.", { stats: {} }),
    o("Invest the money instead", ["Growth", "Risk"], "You put it in the markets and try not to look.", { cash: -12000, invest: 12000 }),
  ]},
  { id: "children", minAge: 27, maxAge: 42, major: true, when: (l) => partnered(l) && l.children === 0, title: "Children", prompt: "You and your partner talk, late at night, about children.", options: () => [
    o("Have a child", ["Fulfilment", "Cost", "Less sleep"], "A child arrives and rearranges your universe.", { child: 1, stats: { happiness: 8, stress: 10, family: 10 }, log: "First child born" }),
    o("Wait a few years", ["Freedom now"], "You agree to revisit it.", { stats: {} }),
    o("Choose not to", ["Freedom", "Different legacy"], "You decide your life will be full in other ways.", { flag: "childfree", stats: { happiness: 2 } }),
    o("Adopt", ["A child who needs you"], "The paperwork takes two years. The love takes two seconds.", { child: 1, cash: -5000, stats: { happiness: 9, family: 10, reputation: 4 }, log: "Adopted a child" }),
  ]},
  { id: "second_child", minAge: 30, maxAge: 44, when: (l) => l.children === 1 && partnered(l), title: "Another?", prompt: "Your first child is growing. Do you want another?", options: () => [
    o("Yes", ["Bigger family", "More cost"], "The house gets louder.", { child: 1, stats: { family: 6, stress: 6 }, log: "Another child born" }),
    o("One is enough", ["Focus"], "Three of you, close and complete.", { stats: { happiness: 2 } }),
  ]},
  { id: "parents_call", minAge: 28, maxAge: 45, major: true, when: (l) => abroad(l), title: "Come home", prompt: "Your parents call. They are getting older and want you to return.", options: (l) => [
    o(`Return to ${CITIES[l.bornCity].name}`, ["Family", "Restart career"], "You fly home. The streets look smaller.", { move: l.bornCity, stats: { family: 12, career: -6 }, rel: { role: "parent", delta: 20, memory: "You came home for them" }, log: `Returned to ${CITIES[l.bornCity].name}` }),
    o("Send money and stay", ["Career", "Guilt"], "You send money every month. It never feels like enough.", { cash: -4000, stats: { family: -3, stress: 4 } }),
    o("Visit more often", ["Compromise", "Flights"], "Twice a year, you go home.", { cash: -2500, stats: { family: 5 } }),
  ]},
  { id: "friend_business", minAge: 26, maxAge: 40, when: (l) => l.rels.some((r) => r.role === "friend" && r.strength > 50), title: "A friend's proposal", prompt: "Your oldest friend wants you as a business partner.", options: () => [
    o("Go in together", ["Shared dream", "Risk to friendship"], "", { flag: "business", risk: { chance: 0.5, win: { text: "You build something real together.", cash: 20000, rel: { role: "friend", delta: 15, memory: "Built a company together" }, stats: { career: 8 } }, lose: { text: "Money ruins it. You stop speaking.", cash: -8000, rel: { role: "friend", delta: -50, memory: "The business that ended the friendship" } } } }),
    o("Invest a little, stay out", ["Support", "Distance"], "You back them, quietly.", { cash: -3000, invest: 3000, rel: { role: "friend", delta: 5 } }),
    o("Say no", ["Protect the friendship"], "They are disappointed, but they understand.", { rel: { role: "friend", delta: -5 } }),
  ]},
  { id: "burnout", minAge: 28, maxAge: 55, when: (l) => l.stats.stress > 65, title: "Running on empty", prompt: "You can't sleep. Your doctor says this pace isn't sustainable.", options: () => [
    o("Take a sabbatical", ["Recovery", "Lost income"], "Three months off. You remember who you were.", { stats: { stress: -25, health: 8, career: -4 }, cash: -5000 }),
    o("Push through", ["Career", "Health"], "You keep going. Something gives.", { stats: { health: -12, stress: 6 } }),
    o("Change careers entirely", ["Fresh start", "Pay cut"], "You retrain as a teacher. It's harder and better.", { career: "teacher", careerLevel: -3, stats: { stress: -15, happiness: 8 }, log: "Changed career to teaching" }),
  ]},
  { id: "partner_abroad", minAge: 28, maxAge: 45, major: true, when: (l) => partnered(l), title: "Their opportunity", prompt: "Your partner has been offered a job in another country.", options: (l) => {
    const [c] = foreignCities(l, 1);
    return [
      moveOpt(c.id, `Move with them to ${c.name}`, ["Relationship", "Your career resets"], `You follow them to ${c.name}.`, { rel: { role: "spouse", delta: 15, memory: `Moved to ${c.name} together` }, careerLevel: -1, stats: { relationships: 8 }, log: `Moved to ${c.name} with partner` }),
      o("Try long distance", ["Both careers", "Strain"], "", { risk: { chance: 0.45, boost: "relationships", win: { text: "Two years of video calls. Then they come back.", stats: { relationships: 4 } }, lose: { text: "The distance wins.", partner: "leave", stats: { happiness: -10 }, log: "Relationship ended over distance" } } }),
      o("Ask them to stay", ["Your life intact", "Their resentment"], "They stay. Sometimes they look at you differently.", { rel: { role: "spouse", delta: -15 }, stats: { relationships: -5 } }),
    ];
  }},
  { id: "invest", minAge: 27, maxAge: 60, when: (l) => l.money.cash > 15000, title: "Idle money", prompt: "You have savings sitting in the bank.", options: (l) => [
    o("Index funds", ["Steady growth"], "Boring, sensible.", { cash: -share(l, 0.5), invest: share(l, 0.5) }),
    o("A high-risk bet", ["Big win", "Big loss"], "", { risk: { chance: 0.35, win: { text: "It multiplies. You try to stay humble.", cash: share(l, 1.5), stats: { confidence: 5 } }, lose: { text: "It collapses. Most of it is gone.", cash: -share(l, 0.6), stats: { stress: 10 } } } }),
    o("Keep it as cash", ["Security"], "You sleep fine.", { stats: { stress: -2 } }),
  ]},
  { id: "career_change", minAge: 32, maxAge: 48, when: (l) => !!l.careerId && (CAREERS[l.careerId]?.satisfaction ?? 50) < 60, title: "Is this it?", prompt: "You're good at your job. You don't love it.", options: () => [
    o("Retrain as a nurse", ["Meaning", "Pay cut"], "Night shifts, real gratitude.", { career: "nurse", careerLevel: -2, stats: { happiness: 6 }, log: "Retrained as a nurse" }),
    o("Learn to code", ["Good pay", "Steep learning"], "You build your first app at 36.", { career: "developer", careerLevel: -2, stats: { education: 6 }, log: "Became a software developer" }),
    o("Open a restaurant", ["Passion", "Long hours"], "", { career: "chef", flag: "business", risk: { chance: 0.4, win: { text: "There's a queue on Saturdays.", cash: 15000, stats: { happiness: 10 } }, lose: { text: "It closes after 18 months.", debt: 15000, stats: { stress: 12 } } }, log: "Opened a restaurant" }),
    o("Stay", ["Security"], "You find meaning outside work instead.", { stats: { happiness: -2 } }),
  ]},
  // ——— MID LIFE
  { id: "marriage_strain", minAge: 35, maxAge: 55, when: (l) => married(l) && l.stats.relationships < 60, title: "Distance", prompt: "You and your spouse barely talk anymore.", options: () => [
    o("Go to counselling", ["Repair", "Hard conversations"], "", { risk: { chance: 0.6, boost: "relationships", win: { text: "Slowly, you find each other again.", rel: { role: "spouse", delta: 20 }, stats: { relationships: 12 } }, lose: { text: "It helps you both realise it's over.", partner: "leave", stats: { happiness: -8 }, log: "Divorced" } } }),
    o("Separate", ["Freedom", "Grief", "Cost"], "The house is quiet now.", { partner: "leave", cash: -10000, stats: { happiness: -10, stress: 5 }, log: "Divorced" }),
    o("Ignore it", ["Avoid conflict"], "Years pass in parallel.", { stats: { happiness: -6, relationships: -8 } }),
  ]},
  { id: "kids_school", minAge: 36, maxAge: 52, when: (l) => l.children > 0, title: "Your child's school", prompt: "It's time to choose a school for your children.", options: (l) => [
    o("Local state school", ["Community", "Free"], "They walk to school with neighbours' kids.", { stats: { family: 3 } }),
    ...(rich(l, 20000) ? [o("Private school", ["Advantage", "Expensive"], "The fees are brutal. The facilities are not.", { cash: -20000, stats: { family: 2, stress: 4 } })] : []),
    o("Move for better schools", ["Better schools", "Moving costs"], "You move to a quieter neighbourhood.", { cash: -5000, stats: { family: 5, social: -3 } }),
  ]},
  { id: "parent_ill", minAge: 38, maxAge: 58, when: (l) => l.rels.some((r) => r.role === "parent"), title: "The phone call", prompt: "One of your parents is seriously ill.", options: () => [
    o("Become their carer", ["Closeness", "Career cost"], "You hold their hand through the hardest months.", { rel: { role: "parent", delta: 25, memory: "You cared for them at the end" }, stats: { family: 10, career: -8, stress: 10 } }),
    o("Pay for professional care", ["Quality care", "Expensive"], "You visit on weekends.", { cash: -15000, stats: { family: 3 } }),
    o("Visit when you can", ["Your life continues", "Regret"], "You are on a plane when the second call comes.", { stats: { family: -6, happiness: -6 } }),
  ]},
  { id: "midlife", minAge: 42, maxAge: 54, title: "Halfway", prompt: "You wake up one morning and realise you're halfway through.", options: () => [
    o("Reinvent yourself", ["Excitement", "Instability"], "You take up something you'd always been afraid of.", { stats: { happiness: 8, confidence: 6, stress: 4 } }),
    o("Stay steady", ["Stability"], "You realise you are content.", { stats: { stress: -4 } }),
    o("Take a big trip", ["Adventure", "Cost"], "A month away. You come back lighter.", { cash: -6000, stats: { happiness: 8 }, flag: "adventurer" }),
  ]},
  { id: "expand_business", minAge: 34, maxAge: 58, when: (l) => has(l, "business") && l.careerId === "entrepreneur", title: "Growth", prompt: "Your business could expand into a new market.", options: () => [
    o("Expand aggressively", ["Wealth", "Collapse"], "", { risk: { chance: 0.5, boost: "career", win: { text: "It works. You're on the front of a trade magazine.", cash: 120000, stats: { reputation: 10, stress: 8 }, log: "Business expanded" }, lose: { text: "Overstretched, the business fails.", debt: 60000, stats: { stress: 15, confidence: -8 }, log: "Business failed" } } }),
    o("Sell the business", ["A payout", "Losing your baby"], "You sign. A strange emptiness, and a large number.", { cash: 90000, career: "auto", unflag: "business", log: "Sold the business" }),
    o("Keep it steady", ["Sustainable"], "It stays small and yours.", { cash: 10000 }),
  ]},
  { id: "return_home", minAge: 40, maxAge: 58, major: true, when: (l) => abroad(l), title: "Where is home?", prompt: "You've lived away for years. You're wondering where you belong.", options: (l) => [
    o(`Go back to ${CITIES[l.bornCity].name}`, ["Roots", "Start again"], "Home has changed. So have you.", { move: l.bornCity, stats: { family: 8, happiness: 4 }, log: `Moved back to ${CITIES[l.bornCity].name}` }),
    o("Stay where you are", ["The life you built"], "This is home now.", { stats: { confidence: 3 } }),
  ]},
  { id: "mentor", minAge: 40, maxAge: 62, title: "A young person", prompt: "A young colleague reminds you of yourself and asks for help.", options: () => [
    o("Mentor them", ["Purpose", "Time"], "Years later, they thank you in a speech.", { stats: { reputation: 8, happiness: 5 }, rel: { role: "colleague", delta: 30, memory: "You mentored them" } }),
    o("You're too busy", ["Focus"], "They figure it out alone.", { stats: { career: 2 } }),
  ]},
  { id: "health_check", minAge: 44, maxAge: 58, title: "The results", prompt: "Your blood pressure is high. Your doctor wants changes.", options: () => [
    o("Overhaul your lifestyle", ["Health", "Discipline"], "You start walking every morning.", { stats: { health: 14, happiness: 3 } }),
    o("Ignore it", ["Nothing changes"], "You feel fine. For now.", { stats: { health: -10 } }),
  ]},
  { id: "reconcile", minAge: 40, maxAge: 70, when: (l) => l.rels.some((r) => r.strength < 30 && r.role !== "child"), title: "Unfinished", prompt: "You think about someone you stopped speaking to.", options: (l) => {
    const p = l.rels.filter((r) => r.strength < 30 && r.role !== "child")[0];
    return [
      o(`Reach out to ${p.name}`, ["Healing", "Rejection"], "", { risk: { chance: 0.6, boost: "relationships", win: { text: `${p.name} answers. You talk for three hours.`, rel: { role: p.role, delta: 40, memory: "Reconciled after years of silence" }, stats: { happiness: 8 } }, lose: { text: `${p.name} doesn't reply.`, stats: { happiness: -3 } } } }),
      o("Leave it in the past", ["Peace"], "Some doors stay closed.", { stats: {} }),
    ];
  }},
  { id: "second_home", minAge: 45, maxAge: 62, when: (l) => rich(l, 150000), title: "A second home", prompt: "You could afford a place somewhere warm.", options: () => [
    o("Buy it", ["Joy", "Expense"], "Summers by the sea.", { cash: -120000, property: 120000, stats: { happiness: 6 } }),
    o("Keep the money working", ["Wealth"], "You rent holidays instead.", { invest: 0 }),
  ]},
  // ——— LATER
  { id: "retire", minAge: 55, maxAge: 66, when: (l) => !has(l, "retired"), title: "Retirement", prompt: "You could stop working.", options: (l) => [
    o("Retire now", ["Freedom", "Lower income"], "Your first Monday off feels illegal.", { flag: "retired", stats: { stress: -20, happiness: 6 }, log: "Retired" }),
    o("Keep working", ["Income", "Purpose"], "You aren't ready.", { stats: { career: 3 } }),
    o("Go part-time", ["Balance"], "Three days a week.", { careerLevel: -1, stats: { stress: -8, happiness: 3 } }),
  ].filter(() => !!l)},
  { id: "grandkids", minAge: 56, maxAge: 75, when: (l) => l.children > 0, title: "Grandchildren", prompt: "Your child is expecting. They live in another city.", options: () => [
    o("Move closer to them", ["Family", "Leave friends"], "You become the grandparent who does school pickups.", { stats: { family: 12, social: -4 }, rel: { role: "child", delta: 15, memory: "You moved close for the grandchildren" }, log: "First grandchild" }),
    o("Visit often", ["Balance"], "Every holiday, you're there.", { stats: { family: 6 }, log: "First grandchild" }),
    o("Stay put", ["Your life"], "You see them on screens.", { stats: { family: -3 } }),
  ]},
  { id: "downsize", minAge: 60, maxAge: 75, when: (l) => has(l, "homeowner"), title: "Too many rooms", prompt: "The house feels too big now.", options: () => [
    o("Downsize", ["Release money", "Leave memories"], "You give away forty years of things.", { cash: 60000, property: -60000, stats: { happiness: -2 } }),
    o("Stay", ["Memories"], "Every room has a story.", { stats: { happiness: 2 } }),
  ]},
  { id: "retire_abroad", minAge: 62, maxAge: 72, major: true, title: "Somewhere else", prompt: "Friends are retiring abroad. They invite you to join them.", options: (l) => {
    const [c] = foreignCities(l, 1);
    return [
      moveOpt(c.id, `Retire to ${c.name}`, ["Adventure", "Distance from family"], `You spend your last chapter in ${c.name}.`, { stats: { happiness: 6, family: -6 }, log: `Retired to ${c.name}` }),
      o("Stay where you are", ["Familiar"], "You stay among your people.", { stats: { family: 4 } }),
    ];
  }},
  { id: "legacy", minAge: 66, maxAge: 82, when: (l) => rich(l, 30000), title: "What you leave", prompt: "You're thinking about what happens to your money.", options: (l) => [
    o("Give to a cause", ["Legacy", "Less for family"], "A scholarship carries your name.", { cash: -share(l, 0.3), stats: { reputation: 12, happiness: 6 } }),
    o("Leave it to family", ["Their security"], "You write the will carefully.", { stats: { family: 5 } }),
    o("Spend it living", ["Joy now"], "First class, finally.", { cash: -share(l, 0.3), stats: { happiness: 10 } }),
  ]},
  { id: "memoir", minAge: 68, maxAge: 85, title: "Evenings", prompt: "You have time now. How do you spend it?", options: () => [
    o("Write down your life", ["Reflection"], "Your grandchildren will read it.", { stats: { happiness: 6 } }),
    o("Reconnect with old friends", ["Company"], "Long lunches. Old jokes.", { stats: { social: 10, happiness: 6 }, rel: { role: "friend", delta: 20, memory: "Long lunches in old age" } }),
    o("A quiet life", ["Peace"], "Gardens and radio.", { stats: { stress: -8, health: 3 } }),
  ]},
  { id: "last_trip", minAge: 72, maxAge: 90, title: "One more journey", prompt: "You have one big journey left in you.", options: (l) => [
    o(`Return to ${CITIES[l.bornCity].name}`, ["Closure"], "You stand outside the house you were born in.", { stats: { happiness: 10, family: 5 }, log: `Visited ${CITIES[l.bornCity].name} one last time` }),
    o("See somewhere new", ["Wonder"], "Even now, the world is surprising.", { cash: -5000, stats: { happiness: 8 } }),
    o("Stay home", ["Rest"], "Home is enough.", { stats: { health: 2 } }),
  ]},
];

export const EVENTS: LifeEvent[] = [
  { id: "parents_divorce", minAge: 4, maxAge: 14, once: true, title: "Parents separate", weight: (l) => (l.family.stability === "Unstable" ? 0.35 : 0.05), text: () => "Your parents separate. You split weekends between two homes.", effect: { stats: { family: -10, stress: 8 } } },
  { id: "school_award", minAge: 8, maxAge: 17, title: "School prize", weight: (l) => (l.stats.education > 65 ? 0.25 : 0.05), text: () => "You win a school prize. Your name goes on a board in the hall.", effect: { stats: { confidence: 6, reputation: 4 } } },
  { id: "scholarship", minAge: 16, maxAge: 18, once: true, title: "Scholarship", weight: (l) => (l.stats.education > 72 ? 0.35 : 0.03), text: () => "You are awarded a scholarship.", effect: { cash: 8000, stats: { education: 4, confidence: 6 } } },
  { id: "family_hardship", minAge: 6, maxAge: 18, once: true, title: "Hard times at home", weight: (l) => (l.family.tier === "low" || l.family.tier === "lowermiddle" ? 0.3 : 0.05), text: () => "A parent loses their job. Dinners get smaller for a while.", effect: { stats: { stress: 8, family: 3, confidence: -2 } } },
  { id: "pet", minAge: 5, maxAge: 40, once: true, title: "A dog", weight: () => 0.08, text: () => "A scruffy dog follows you home and stays for twelve years.", effect: { stats: { happiness: 6, health: 2 } } },
  { id: "pay_rise", minAge: 22, maxAge: 64, title: "Pay rise", weight: (l) => (l.careerId ? 0.25 + l.stats.career / 400 : 0), text: () => "You get a pay rise.", effect: { careerLevel: 1, stats: { career: 3 } } },
  { id: "redundancy", minAge: 25, maxAge: 62, title: "Made redundant", weight: (l) => (l.careerId && l.careerId !== "entrepreneur" && !l.flags.includes("retired") ? 0.08 : 0), text: () => "Your company restructures. Your role disappears.", effect: { careerLevel: -2, cash: -4000, stats: { stress: 12, confidence: -6 }, log: "Lost job" } },
  { id: "inheritance", minAge: 25, maxAge: 70, once: true, title: "Inheritance", weight: (l) => (l.family.tier === "wealthy" || l.family.tier === "ultra" ? 0.15 : 0.03), text: () => "A relative you barely knew leaves you money.", effect: { cash: 40000, log: "Unexpected inheritance" } },
  { id: "illness", minAge: 30, maxAge: 90, title: "Illness", weight: (l) => 0.04 + (100 - l.stats.health) / 500, text: () => "You spend weeks recovering from a serious illness.", effect: { stats: { health: -12, stress: 6 }, cash: -2000 } },
  { id: "accident", minAge: 16, maxAge: 70, once: true, title: "Accident", weight: () => 0.04, text: () => "A minor accident. A broken arm and a long summer.", effect: { stats: { health: -6 }, cash: -800 } },
  { id: "wedding_friend", minAge: 24, maxAge: 40, once: true, title: "Best friend's wedding", weight: (l) => (l.rels.some((r) => r.role === "friend" && r.strength > 50) ? 0.2 : 0), text: () => "You give a speech at your best friend's wedding. People laugh in the right places.", effect: { stats: { social: 5, happiness: 4 }, rel: { role: "friend", delta: 8, memory: "Gave the speech at their wedding" } } },
  { id: "sibling_loan", minAge: 25, maxAge: 60, once: true, title: "Your sibling needs help", weight: (l) => (l.family.siblings > 0 ? 0.12 : 0), text: () => "Your sibling is in trouble and asks to borrow money. You help.", effect: { cash: -5000, rel: { role: "sibling", delta: 15, memory: "You helped them when they needed it" } } },
  { id: "market_crash", minAge: 25, maxAge: 85, title: "Market crash", weight: (l) => (l.money.invest > 0 ? 0.08 : 0), text: () => "Markets crash. Your investments drop sharply.", effect: { stats: { stress: 8 } } },
  { id: "windfall", minAge: 28, maxAge: 65, title: "A big client", weight: (l) => (l.flags.includes("business") ? 0.2 : 0), text: () => "A huge client signs with your business.", effect: { cash: 25000, stats: { career: 6, confidence: 4 } } },
  { id: "unexpected_bill", minAge: 20, maxAge: 85, title: "Unexpected expense", weight: () => 0.12, text: () => "The boiler breaks, the car fails, the roof leaks — all in one month.", effect: { cash: -2500, stats: { stress: 4 } } },
  { id: "rent_rise", minAge: 21, maxAge: 60, title: "Rent increase", weight: (l) => (l.housing !== "family" && !l.flags.includes("homeowner") ? 0.12 : 0), text: () => "Your landlord raises the rent.", effect: { cash: -1500, stats: { stress: 4 } } },
  { id: "small_win", minAge: 18, maxAge: 85, once: true, title: "Lucky ticket", weight: () => 0.03, text: () => "A scratch card wins you a modest sum. You buy everyone dinner.", effect: { cash: 3000, stats: { happiness: 4 } } },
  { id: "reunion", minAge: 30, maxAge: 80, title: "Old friend", weight: (l) => (l.stats.social > 50 ? 0.12 : 0.04), text: () => "You bump into a childhood friend in an airport. You exchange numbers.", effect: { stats: { social: 4, happiness: 3 }, rel: { role: "friend", delta: 10, memory: "Met again by chance" } } },
  { id: "breakup", minAge: 20, maxAge: 60, title: "Breakup", weight: (l) => (partnered(l) && l.stats.relationships < 45 ? 0.2 : 0), text: () => "Your relationship ends. It had been ending for a while.", effect: { partner: "leave", stats: { happiness: -8 }, log: "Relationship ended" } },
  { id: "child_milestone", minAge: 30, maxAge: 65, title: "Proud moment", weight: (l) => (l.children > 0 ? 0.2 : 0), text: () => "Your child graduates. You cry more than you expected.", effect: { stats: { happiness: 8, family: 5 }, rel: { role: "child", delta: 8 } } },
  { id: "child_struggle", minAge: 32, maxAge: 60, title: "A hard year", weight: (l) => (l.children > 0 && l.stats.family < 50 ? 0.2 : 0.03), text: () => "Your child goes through a difficult year and pulls away from you.", effect: { stats: { stress: 8, family: -6 }, rel: { role: "child", delta: -10, memory: "The difficult year" } } },
  { id: "mentor_appears", minAge: 18, maxAge: 35, once: true, title: "A mentor", weight: (l) => (l.stats.reputation > 50 ? 0.2 : 0.06), text: () => "A senior figure takes an interest in your work and opens doors.", effect: { careerLevel: 1, stats: { career: 8, confidence: 5 } } },
  { id: "viral", minAge: 16, maxAge: 50, once: true, title: "Overnight attention", weight: (l) => (["artist", "musician", "chef"].includes(l.careerId ?? "") ? 0.2 : 0.02), text: () => "Something you made goes viral. Strangers know your name for a week.", effect: { stats: { reputation: 12, confidence: 6 }, cash: 4000 } },
  { id: "robbed", minAge: 16, maxAge: 80, once: true, title: "Robbed", weight: () => 0.04, text: () => "Your home is broken into. They take more than things.", effect: { cash: -1500, stats: { stress: 8, happiness: -3 } } },
  { id: "chance_meeting", minAge: 22, maxAge: 45, once: true, title: "A stranger", weight: (l) => (!partnered(l) ? 0.15 : 0), text: () => "You sit next to someone on a delayed train. You talk for four hours.", effect: { partner: "add", stats: { happiness: 8 }, log: "Met a partner by chance" } },
  { id: "health_scare", minAge: 60, maxAge: 95, title: "Health scare", weight: () => 0.15, text: () => "A night in hospital. You're alright — but it's a warning.", effect: { stats: { health: -10 } } },
  { id: "friend_loss", minAge: 55, maxAge: 95, once: true, title: "Losing a friend", weight: (l) => (l.rels.some((r) => r.role === "friend") ? 0.15 : 0), text: () => "An old friend dies. You speak at the funeral.", effect: { stats: { happiness: -8, social: -4 } } },
  { id: "parent_loss", minAge: 45, maxAge: 80, once: true, title: "Losing a parent", weight: () => 0.25, text: () => "One of your parents dies. The world tilts.", effect: { stats: { happiness: -10, family: 4 }, log: "Lost a parent" } },
  { id: "community", minAge: 30, maxAge: 85, title: "Community", weight: (l) => (l.stats.reputation > 55 ? 0.1 : 0.02), text: () => "Your neighbours ask you to lead a local project.", effect: { stats: { reputation: 6, social: 5 } } },
  { id: "travel_win", minAge: 20, maxAge: 70, once: true, title: "Travel opportunity", weight: () => 0.06, text: () => "Work sends you on a trip around the world. You come back changed.", effect: { stats: { happiness: 6, confidence: 4 }, flag: "adventurer" } },
  { id: "housing_crisis", minAge: 22, maxAge: 50, title: "Evicted", weight: (l) => (l.money.cash < 0 && l.housing !== "family" ? 0.25 : 0), text: () => "You fall behind on rent and have to move somewhere cheaper.", effect: { housing: "shared", stats: { stress: 10, happiness: -6 } } },
];

export const decisionById = (id: string) => DECISIONS.find((d) => d.id === id);
export { cityCountry };
