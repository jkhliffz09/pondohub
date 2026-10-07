import React, { useState } from 'react';
import { View, Share } from 'react-native';
import {
  peso,
  categoryTotals,
  cycleDates,
  manilaDate,
  categories,
  newestFirst,
  isPondoIn,
} from '@pondo/shared';
import { useStore } from '../lib/store';
import {
  Page,
  T,
  Row,
  Card,
  Icon,
  Button,
  Field,
  Chip,
  Section,
  Empty,
  ErrorText,
} from '../components/ui';
import { TransactionRow, Donut } from '../components/finance';
import { c, font } from '../theme';
export function History({ navigation }: { navigation: any }) {
  const { data } = useStore();
  const [search, setSearch] = useState(''),
    [filter, setFilter] = useState('all');
  if (!data) return null;
  const list = data.transactions
    .filter(
      (t) =>
        (filter === 'all' ||
          t.kind === filter ||
          (filter === 'savings' && t.kind === 'withdrawal')) &&
        `${t.description} ${t.channel} ${t.category}`.toLowerCase().includes(search.toLowerCase()),
    )
    .sort(newestFirst);
  const income = list.filter(isPondoIn).reduce((s, t) => s + t.amount_cents, 0),
    out = list.filter((t) => !isPondoIn(t)).reduce((s, t) => s + t.amount_cents, 0);
  const dates = [...new Set(list.map((t) => t.occurred_on))];
  return (
    <Page title="Your money story." subtitle="Every little in and out, all in one place." refresh>
      <T muted style={{ fontSize: 11 }}>
        Newest first · transaction date, then time recorded
      </T>
      <Field
        accessibilityLabel="Search transactions"
        placeholder="Search your transactions…"
        value={search}
        onChangeText={setSearch}
      />
      <Row style={{ flexWrap: 'wrap', gap: 7 }}>
        {[
          ['all', 'All'],
          ['income', 'Cash in'],
          ['expense', 'Expenses'],
          ['savings', 'Savings'],
        ].map(([key, title]) => (
          <Chip key={key} label={title} active={filter === key} onPress={() => setFilter(key)} />
        ))}
      </Row>
      <Row style={{ gap: 12 }}>
        {[
          ['Money in', income, c.green, c.mint, 'arrow-down-outline'],
          ['Money out', out, c.red, c.pink, 'arrow-up-outline'],
        ].map(([label, value, color, tint, icon]) => (
          <Card
            key={label as string}
            style={{
              flex: 1,
              padding: 16,
              gap: 7,
              backgroundColor: tint as string,
              borderWidth: 0,
            }}
          >
            <Row>
              <Icon name={icon as any} color={color as string} size={14} />
              <T style={{ fontSize: 10, color: color as string }}>{label as string}</T>
            </Row>
            <T
              style={{
                fontSize: 22,
                lineHeight: 30,
                fontFamily: font.extra,
                color: color as string,
                letterSpacing: -1,
              }}
            >
              {peso(value as number)}
            </T>
          </Card>
        ))}
      </Row>
      {dates.map((date) => (
        <View key={date} style={{ gap: 10 }}>
          <T muted style={{ fontFamily: font.semi, fontSize: 11 }}>
            {date === manilaDate()
              ? 'TODAY'
              : new Date(date + 'T00:00:00')
                  .toLocaleDateString('en-PH', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                  })
                  .toUpperCase()}
          </T>
          <Card style={{ paddingVertical: 2, gap: 0 }}>
            {list
              .filter((t) => t.occurred_on === date)
              .map((t, i) => (
                <View key={t.id} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
                  <TransactionRow
                    transaction={t}
                    onPress={() => navigation.navigate('Transaction', { id: t.id })}
                  />
                </View>
              ))}
          </Card>
        </View>
      ))}
      {!list.length && (
        <Empty
          icon="receipt-outline"
          title="Nothing here just yet."
          description={
            search
              ? 'Try a different search or clear your filters.'
              : 'Your next transaction is the start of your story.'
          }
          action="Reset filters"
          onPress={() => {
            setSearch('');
            setFilter('all');
          }}
        />
      )}
      <Button
        label="Record an expense"
        variant="secondary"
        icon="add"
        onPress={() => navigation.navigate('AddExpense')}
      />
    </Page>
  );
}
export function TransactionDetail({ route, navigation }: { route: any; navigation: any }) {
  const { data } = useStore();
  const t = data?.transactions.find((t) => t.id === route.params.id);
  return (
    <Page title="Transaction details" back>
      {t ? (
        <>
          <View style={{ alignItems: 'center', paddingVertical: 25, gap: 12 }}>
            <Icon
              name={
                t.kind === 'income'
                  ? 'arrow-down-circle-outline'
                  : t.kind === 'expense'
                    ? 'arrow-up-circle-outline'
                    : 'flag-outline'
              }
              size={52}
              color={t.kind === 'income' ? c.green : c.purple}
            />
            <T style={{ fontFamily: font.extra, fontSize: 37, lineHeight: 48 }}>
              {isPondoIn(t) ? '+' : '−'}
              {peso(t.amount_cents, true)}
            </T>
            <T style={{ fontFamily: font.semi, textAlign: 'center' }}>{t.description}</T>
          </View>
          <Card>
            {[
              [
                'Type',
                t.kind === 'income'
                  ? 'Cash in'
                  : t.kind === 'expense'
                    ? 'Expense'
                    : t.kind === 'withdrawal'
                      ? 'Savings withdrawal'
                      : 'Savings contribution',
              ],
              ['Category', categories.find((c) => c.id === t.category)?.name || 'Other'],
              ['Channel', t.channel],
              ['Date', t.occurred_on],
              [
                'Recorded',
                new Date(t.created_at).toLocaleString('en-PH', {
                  timeZone: 'Asia/Manila',
                }),
              ],
            ].map(([label, value]) => (
              <Row key={label} style={{ justifyContent: 'space-between' }}>
                <T muted style={{ fontSize: 12 }}>
                  {label}
                </T>
                <T style={{ fontSize: 12, fontFamily: font.semi }}>{value}</T>
              </Row>
            ))}
          </Card>
          {t.goal_id && (
            <Button
              label="View goal activities"
              variant="secondary"
              onPress={() => navigation.navigate('GoalDetail', { id: t.goal_id })}
            />
          )}
          <Row style={{ justifyContent: 'center' }}>
            <Icon name="lock-closed-outline" size={13} color={c.muted} />
            <T muted style={{ fontSize: 10 }}>
              Your transaction details are never shared with guardians.
            </T>
          </Row>
        </>
      ) : (
        <Empty title="Transaction not found" description="Refresh your history and try again." />
      )}
    </Page>
  );
}
export function Insights({ navigation }: { navigation: any }) {
  const { data } = useStore();
  const [period, setPeriod] = useState('week'),
    [error, setError] = useState<string | null>(null);
  if (!data) return null;
  const today = manilaDate();
  const start =
    period === 'week' ? cycleDates(data.profile.cycle_start_day).start : today.slice(0, 7) + '-01';
  const tx = data.transactions.filter((t) => t.occurred_on >= start && t.occurred_on <= today);
  const cats = categoryTotals(tx),
    total = cats.reduce((s, c) => s + c.cents, 0);
  const daily = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - (6 - i));
    const date = d.toISOString().slice(0, 10);
    return {
      date,
      label: d.toLocaleDateString('en-PH', {
        weekday: 'narrow',
        timeZone: 'UTC',
      }),
      value: data.transactions
        .filter((t) => t.kind === 'expense' && t.occurred_on === date)
        .reduce((s, t) => s + t.amount_cents, 0),
    };
  });
  const max = Math.max(...daily.map((d) => d.value), data.profile.daily_essential_cents, 100);
  async function share() {
    try {
      await Share.share({
        title: 'My Pondo Hub spending summary',
        message: `Pondo Hub · ${period === 'week' ? 'This week' : 'This month'}\n${start} – ${today}\nTotal spent: ${peso(total, true)}\n${cats.map((c) => `${c.name}: ${peso(c.cents, true)}`).join('\n')}\n\nA little more mindful, one peso at a time.`,
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Page title="Find your rhythm." subtitle="A clearer picture of where your pondo goes." refresh>
      <Row>
        <Chip label="This week" active={period === 'week'} onPress={() => setPeriod('week')} />
        <Chip label="This month" active={period === 'month'} onPress={() => setPeriod('month')} />
      </Row>
      <Card style={{ backgroundColor: c.mint, borderWidth: 0 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T
            style={{
              fontSize: 10,
              fontFamily: font.bold,
              color: c.green,
              letterSpacing: 1,
            }}
          >
            TOTAL SPENT · {period.toUpperCase()}
          </T>
          <Icon name="analytics-outline" size={20} />
        </Row>
        <T
          style={{
            fontFamily: font.extra,
            fontSize: 38,
            lineHeight: 48,
            color: c.green,
            letterSpacing: -1.5,
          }}
        >
          {peso(total, true)}
        </T>
        <T style={{ fontSize: 11, color: c.green }}>
          Noticing your habits is the first step to shaping them.
        </T>
      </Card>
      <Card>
        <Section title="Your last 7 days" />
        <T muted style={{ fontSize: 10 }}>
          A little perspective on your daily spending.
        </T>
        <View
          style={{
            height: 158,
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 12,
            paddingTop: 16,
          }}
        >
          {daily.map((d, i) => (
            <View key={d.date} style={{ flex: 1, alignItems: 'center', gap: 7 }}>
              <T muted style={{ fontSize: 8 }}>
                {d.value ? peso(d.value) : '—'}
              </T>
              <View
                style={{
                  height: Math.max(5, (d.value / max) * 102),
                  width: '100%',
                  maxWidth: 26,
                  backgroundColor: i === 6 ? c.green : '#BCDCCD',
                  borderRadius: 7,
                }}
              />
              <T muted style={{ fontSize: 10 }}>
                {d.label}
              </T>
            </View>
          ))}
        </View>
      </Card>
      <Section title="The little things add up" />
      <Card>
        <Donut transactions={tx} />
      </Card>
      {cats.map((cat) => (
        <Row key={cat.id} style={{ paddingHorizontal: 5, gap: 12 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              backgroundColor: cat.tint,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={cat.icon} size={18} color={cat.color} />
          </View>
          <View style={{ flex: 1 }}>
            <T style={{ fontSize: 12, fontFamily: font.semi }}>{cat.name}</T>
            <T muted style={{ fontSize: 10 }}>
              {Math.round((cat.cents / total) * 100)}% of your spending
            </T>
          </View>
          <T style={{ fontFamily: font.bold, fontSize: 13 }}>{peso(cat.cents)}</T>
        </Row>
      ))}
      {cats.length > 0 && (
        <Card style={{ backgroundColor: c.lavender, borderWidth: 0 }}>
          <Row>
            <Icon name="bulb-outline" color={c.purple} />
            <T style={{ fontFamily: font.bold, fontSize: 13, color: c.purple }}>
              One thing to notice
            </T>
          </Row>
          <T style={{ fontSize: 12, lineHeight: 21, color: '#79698E' }}>
            {cats[0].name} makes up {Math.round((cats[0].cents / total) * 100)}% of your spending. A
            small change here could leave more room for your next goal.
          </T>
        </Card>
      )}
      <ErrorText message={error} />
      <Button
        label="Share spending summary"
        icon="share-outline"
        variant="secondary"
        onPress={share}
      />
      <Button
        label="Manage parent sharing"
        icon="shield-checkmark-outline"
        variant="ghost"
        onPress={() => navigation.navigate('Sharing')}
      />
    </Page>
  );
}
