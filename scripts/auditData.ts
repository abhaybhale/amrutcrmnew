import {
  INITIAL_USERS, INITIAL_ACCOUNTS, INITIAL_CONTACTS, INITIAL_LEADS,
  INITIAL_OPPORTUNITIES, INITIAL_QUOTES, INITIAL_ORDERS, INITIAL_VENDORS,
  INITIAL_WORKFLOWS
} from '../src/data/initialData';

const problems: string[] = [];
const collections = {
  users: INITIAL_USERS, accounts: INITIAL_ACCOUNTS, contacts: INITIAL_CONTACTS,
  leads: INITIAL_LEADS, opportunities: INITIAL_OPPORTUNITIES, quotes: INITIAL_QUOTES,
  orders: INITIAL_ORDERS, vendors: INITIAL_VENDORS, workflows: INITIAL_WORKFLOWS
};
const ids = Object.fromEntries(Object.entries(collections).map(([name, rows]) => [name, new Set(rows.map(row => row.id))]));
const check = (condition: boolean, message: string) => { if (!condition) problems.push(message); };
const ref = (collection: keyof typeof collections, id: string | undefined, from: string) => {
  if (id) check(ids[collection].has(id), `${from} references missing ${collection}/${id}`);
};

for (const [name, rows] of Object.entries(collections)) {
  check(ids[name].size === rows.length, `${name} contains duplicate IDs`);
}
for (const contact of INITIAL_CONTACTS) ref('accounts', contact.accountId, `contact/${contact.id}`);
for (const lead of INITIAL_LEADS) {
  ref('vendors', lead.vendorId, `lead/${lead.id}`);
  ref('users', lead.workingSalespersonId, `lead/${lead.id}`);
  ref('opportunities', lead.convertedOpportunityId, `lead/${lead.id}`);
}
for (const opp of INITIAL_OPPORTUNITIES) {
  ref('accounts', opp.accountId, `opportunity/${opp.id}`);
  ref('contacts', opp.primaryContactId, `opportunity/${opp.id}`);
  ref('vendors', opp.vendorId, `opportunity/${opp.id}`);
  ref('users', opp.ownerId, `opportunity/${opp.id}`);
  ref('leads', opp.sourceLeadId, `opportunity/${opp.id}`);
  check(Math.abs(opp.totalValue - opp.softwareValue - opp.servicesValue) < 1, `opportunity/${opp.id} total does not match components`);
}
for (const quote of INITIAL_QUOTES) {
  ref('opportunities', quote.opportunityId, `quote/${quote.id}`);
  ref('accounts', quote.accountId, `quote/${quote.id}`);
  ref('vendors', quote.vendorId, `quote/${quote.id}`);
  check(Math.abs(quote.grandTotal - quote.subtotal - quote.taxAmount) < 1, `quote/${quote.id} grand total does not match subtotal + tax`);
}
for (const order of INITIAL_ORDERS) {
  ref('opportunities', order.opportunityId, `order/${order.id}`);
  ref('accounts', order.accountId, `order/${order.id}`);
  ref('vendors', order.vendorId, `order/${order.id}`);
  check(Math.abs(order.totalAmount - order.softwareAmount - order.servicesAmount) < 1, `order/${order.id} total does not match components`);
}
for (const workflow of INITIAL_WORKFLOWS) {
  const states = new Set(workflow.allStates);
  check(states.has(workflow.startingState), `workflow/${workflow.id} start state is absent`);
  for (const state of workflow.endStates) check(states.has(state), `workflow/${workflow.id} end state ${state} is absent`);
  for (const transition of workflow.transitions) {
    check(states.has(transition.fromState), `workflow/${workflow.id} transition starts at missing state ${transition.fromState}`);
    check(states.has(transition.toState), `workflow/${workflow.id} transition ends at missing state ${transition.toState}`);
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Seed data and workflow references are consistent across 9 collections.');
}
