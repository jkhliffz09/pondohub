import React, { useState, useRef } from 'react';
import { View, Pressable } from 'react-native';
import { peso, goalSaved, toCents, manilaDate, summarize } from '@pondo/shared';
import { useStore, newId } from '../lib/store';
import {
  Page,
  T,
  Row,
  Card,
  Icon,
  Button,
  Field,
  Section,
  Badge,
  ErrorText,
  type IconName,
} from '../components/ui';
import { GoalCard } from '../components/finance';
import { c, font } from '../theme';
export function Savings({ navigation }: { navigation: any }) {
  const { data } = useStore();
  if (!data) return null;
  const total = data.goals.reduce((s, g) => s + goalSaved(g, data.transactions), 0);
  return (
    <Page
      title="Little steps. Big dreams."
      subtitle="Make a little room for your future self."
      refresh
    >
      <Card
        style={{
          backgroundColor: c.lavender,
          borderWidth: 0,
          padding: 24,
          gap: 15,
        }}
      >
        <Row style={{ justifyContent: 'space-between' }}>
          <Badge label="YOUR GOAL VAULT" tone="purple" icon="lock-closed-outline" />
          <Icon name="sparkles-outline" color={c.purple} size={27} />
        </Row>
        <View>
          <T
            style={{
              fontFamily: font.extra,
              fontSize: 38,
              lineHeight: 49,
              color: '#5B4794',
              letterSpacing: -1.5,
            }}
          >
            {peso(total, true)}
          </T>
          <T style={{ fontSize: 12, color: '#9181AB' }}>set aside for something that matters.</T>
        </View>
        <Row
          style={{
            borderTopWidth: 1,
            borderTopColor: '#DCD3EC',
            paddingTop: 13,
          }}
        >
          <Icon name="shield-checkmark-outline" size={14} color={c.purple} />
          <T style={{ fontSize: 10, color: c.purple, flex: 1 }}>
            Excluded from your everyday spendable pondo.
          </T>
        </Row>
      </Card>
      <Section
        title={`Your goals (${data.goals.length})`}
        action="New goal"
        onPress={() => navigation.navigate('CreateGoal')}
      />
      {data.goals.map((g) => (
        <GoalCard
          key={g.id}
          goal={g}
          transactions={data.transactions}
          onAdd={() => navigation.navigate('Contribute', { id: g.id })}
        />
      ))}
      {!data.goals.length && (
        <Card>
          <T muted>A laptop, concert tickets, or a rainy-day buffer. What are you saving for?</T>
        </Card>
      )}
      <Button
        label="Create a savings goal"
        icon="add-circle-outline"
        onPress={() => navigation.navigate('CreateGoal')}
      />
      <Row style={{ alignItems: 'flex-start', padding: 5 }}>
        <Icon name="bulb-outline" color={c.amber} size={18} />
        <T muted style={{ fontSize: 11, flex: 1, lineHeight: 19 }}>
          Small is still something. Setting aside ₱20 a day becomes ₱600 in a month.
        </T>
      </Row>
    </Page>
  );
}
const icons: [IconName, string][] = [
  ['laptop-outline', 'Tech'],
  ['school-outline', 'School'],
  ['airplane-outline', 'Travel'],
  ['ticket-outline', 'Experiences'],
  ['umbrella-outline', 'Emergency'],
  ['flag-outline', 'Something else'],
];
export function CreateGoal({ route, navigation }: { route: any; navigation: any }) {
  const { addGoal } = useStore();
  const [name, setName] = useState(route.params?.name || ''),
    [target, setTarget] = useState(route.params?.target || ''),
    [date, setDate] = useState(() => {
      const d = new Date();
      d.setMonth(d.getMonth() + 3);
      return manilaDate(d);
    }),
    [icon, setIcon] = useState<IconName>('laptop-outline'),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  const weeks = Math.max(1, Math.ceil((new Date(date).getTime() - Date.now()) / 604800000));
  async function save() {
    setError(null);
    try {
      if (!name.trim()) throw new Error('Give your goal a name.');
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        Number.isNaN(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date ||
        date < manilaDate()
      )
        throw new Error('Choose a valid target date from today onward.');
      const cents = toCents(target);
      setBusy(true);
      await addGoal({
        name: name.trim(),
        target_cents: cents,
        target_date: date,
        icon,
      });
      navigation.goBack();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page title="Create a goal" back>
      <View style={{ gap: 8 }}>
        <T style={{ fontFamily: font.extra, fontSize: 27, lineHeight: 36 }}>
          Dream it. Save for it.
        </T>
        <T muted style={{ fontSize: 12 }}>
          Turn a someday into a little-by-little plan.
        </T>
      </View>
      <Field
        label="What are you saving for?"
        placeholder="My first laptop"
        value={name}
        onChangeText={setName}
        maxLength={100}
      />
      <Section title="Give it a little personality" />
      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        {icons.map(([i, label]) => (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => setIcon(i)}
            style={{
              width: '30%',
              alignItems: 'center',
              padding: 15,
              gap: 9,
              borderRadius: 15,
              backgroundColor: icon === i ? c.lavender : 'white',
              borderWidth: 1.5,
              borderColor: icon === i ? c.purple : c.line,
            }}
          >
            <Icon name={i} color={c.purple} size={25} />
            <T style={{ fontSize: 9, fontFamily: font.semi }}>{label}</T>
          </Pressable>
        ))}
      </View>
      <Field
        label="Target amount (₱)"
        placeholder="15000"
        value={target}
        onChangeText={setTarget}
        keyboardType="decimal-pad"
      />
      <Field
        label="Target date"
        placeholder="YYYY-MM-DD"
        value={date}
        onChangeText={setDate}
        hint="YYYY-MM-DD"
      />
      {Number(target) > 0 && Number.isFinite(weeks) && (
        <Card style={{ backgroundColor: c.mint, borderWidth: 0 }}>
          <Row>
            <Icon name="sparkles-outline" />
            <T style={{ fontFamily: font.bold, fontSize: 13 }}>Your little-by-little plan</T>
          </Row>
          <T
            style={{
              fontFamily: font.extra,
              fontSize: 27,
              lineHeight: 35,
              color: c.green,
            }}
          >
            {peso(Math.ceil((Number(target) * 100) / weeks))}
            <T muted style={{ fontSize: 13 }}>
              {' '}
              / week
            </T>
          </T>
          <T muted style={{ fontSize: 11 }}>
            Over {weeks} weeks. You can add money whenever you’re ready.
          </T>
        </Card>
      )}
      <ErrorText message={error} />
      <Button label="Create my goal" loading={busy} icon="flag-outline" onPress={save} />
      <T muted style={{ fontSize: 10, textAlign: 'center' }}>
        Creating a goal doesn’t move your money. Contributions reserve it in your ledger.
      </T>
    </Page>
  );
}
export function Contribute({ route, navigation }: { route: any; navigation: any }) {
  const { data, addTransaction } = useStore();
  const [amount, setAmount] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const id = useRef(newId());
  const goal = data?.goals.find((g) => g.id === route.params.id);
  if (!data || !goal)
    return (
      <Page title="Add to goal" back>
        <T>This goal could not be found.</T>
      </Page>
    );
  const remaining = goal.target_cents - goalSaved(goal, data.transactions);
  async function save() {
    try {
      setError(null);
      const cents = toCents(amount);
      if (cents > remaining) throw new Error('This is more than your remaining goal target.');
      setBusy(true);
      await addTransaction({
        id: id.current,
        kind: 'savings',
        amount_cents: cents,
        category: 'other',
        channel: 'Cash',
        description: `Saved for ${goal!.name}`,
        occurred_on: manilaDate(),
        goal_id: goal!.id,
      });
      navigation.goBack();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page title="A step closer" back>
      <GoalCard goal={goal} transactions={data.transactions} />
      <T muted>
        Every little bit counts. You have {peso(summarize(data).available)} available and{' '}
        {peso(remaining)} left to reach this goal.
      </T>
      <Field
        label="Amount to set aside (₱)"
        placeholder="100"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
      />
      <Card style={{ backgroundColor: c.mint }}>
        <Row>
          <Icon name="lock-closed-outline" />
          <T style={{ flex: 1, fontSize: 12 }}>
            This amount will be reserved for your goal and removed from spendable pondo.
          </T>
        </Row>
      </Card>
      <ErrorText message={error} />
      <Button label="Set this money aside" loading={busy} onPress={save} icon="checkmark" />
    </Page>
  );
}
