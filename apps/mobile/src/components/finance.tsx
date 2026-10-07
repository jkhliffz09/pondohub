import React from 'react';
import { View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import {
  type AppData,
  type Transaction,
  type Goal,
  categories,
  peso,
  summarize,
  goalSaved,
  categoryTotals,
} from '@pondo/shared';
import { T, Row, Icon, Card, Progress, Button, type IconName } from './ui';
import { c, font } from '../theme';
export function BalanceCard({ data }: { data: AppData }) {
  const x = summarize(data);
  const percent = Math.max(0, Math.min(100, (x.available / Math.max(x.income, 1)) * 100));
  return (
    <LinearGradient
      colors={['#128763', '#086046']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: 25, padding: 23, overflow: 'hidden', gap: 20 }}
    >
      <View
        style={{
          position: 'absolute',
          width: 180,
          height: 180,
          borderRadius: 100,
          borderWidth: 35,
          borderColor: '#FFFFFF07',
          right: -65,
          top: -40,
        }}
      />
      <Row style={{ justifyContent: 'space-between' }}>
        <Row style={{ gap: 7 }}>
          <Icon name="wallet-outline" size={17} color="#C3E8D8" />
          <T
            style={{
              fontSize: 10,
              fontFamily: font.semi,
              letterSpacing: 1.5,
              color: '#C3E8D8',
            }}
          >
            AVAILABLE PONDO
          </T>
        </Row>
        <View
          style={{
            paddingHorizontal: 9,
            paddingVertical: 4,
            borderRadius: 10,
            backgroundColor: '#FFFFFF16',
          }}
        >
          <T style={{ fontSize: 9, color: '#E0F2E8' }}>Weekly cycle ↻</T>
        </View>
      </Row>
      <View>
        <T
          style={{
            fontFamily: font.extra,
            fontSize: 43,
            lineHeight: 55,
            color: 'white',
            letterSpacing: -2,
          }}
        >
          {peso(x.available, true)}
        </T>
        <T style={{ fontSize: 11, color: '#BFE4D3' }}>A little peace of mind, in your pocket.</T>
      </View>
      <View style={{ gap: 7 }}>
        <View style={{ backgroundColor: '#FFFFFF24', height: 5, borderRadius: 5 }}>
          <View
            style={{
              height: 5,
              width: `${percent}%`,
              backgroundColor: '#CBEFA7',
              borderRadius: 5,
            }}
          />
        </View>
        <Row style={{ justifyContent: 'space-between' }}>
          <T style={{ fontSize: 9, color: '#C9E8D9' }}>
            {Math.round(percent)}% of recorded cash-in available
          </T>
          <T style={{ fontSize: 9, color: '#C9E8D9' }}>{x.daysLeft} days left</T>
        </Row>
      </View>
      <Row
        style={{
          borderTopWidth: 1,
          borderTopColor: '#FFFFFF20',
          paddingTop: 16,
          justifyContent: 'space-between',
        }}
      >
        {[
          ['Weekly plan', data.profile.weekly_budget_cents],
          ['In goals', x.reserved],
          ['Spent', x.weekSpent],
        ].map(([label, amount], i) => (
          <View
            key={label as string}
            style={{
              flex: 1,
              paddingLeft: i ? 17 : 0,
              borderLeftWidth: i ? 1 : 0,
              borderLeftColor: '#FFFFFF20',
              gap: 3,
            }}
          >
            <T style={{ fontSize: 9, color: '#BFE4D3' }}>{label as string}</T>
            <T
              style={{
                fontSize: 16,
                fontFamily: font.bold,
                color: i === 1 ? '#D8F1A0' : 'white',
              }}
            >
              {peso(amount as number)}
            </T>
          </View>
        ))}
      </Row>
    </LinearGradient>
  );
}
export function TransactionRow({
  transaction: t,
  onPress,
}: {
  transaction: Transaction;
  onPress?: () => void;
}) {
  const cat = categories.find((c) => c.id === t.category) || categories[7];
  const icon =
    t.kind === 'income' || t.kind === 'withdrawal'
      ? 'arrow-down-outline'
      : t.kind === 'savings'
        ? 'flag-outline'
        : cat.icon;
  const color =
    t.kind === 'income' || t.kind === 'withdrawal'
      ? c.green
      : t.kind === 'savings'
        ? c.purple
        : cat.color;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        gap: 12,
        paddingVertical: 13,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          width: 41,
          height: 41,
          borderRadius: 13,
          backgroundColor:
            t.kind === 'income' || t.kind === 'withdrawal'
              ? c.mint
              : t.kind === 'savings'
                ? c.lavender
                : cat.tint,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <T style={{ fontFamily: font.semi, fontSize: 12 }}>{t.description}</T>
        <T muted style={{ fontSize: 10, lineHeight: 16 }}>
          {t.channel} ·{' '}
          {t.kind === 'income'
            ? 'Cash in'
            : t.kind === 'savings'
              ? 'Savings'
              : t.kind === 'withdrawal'
                ? 'Returned from savings'
                : cat.name}
        </T>
      </View>
      <T
        style={{
          fontFamily: font.bold,
          fontSize: 12,
          color: t.kind === 'income' || t.kind === 'withdrawal' ? c.green : c.ink,
        }}
      >
        {t.kind === 'income' || t.kind === 'withdrawal' ? '+' : '−'}
        {peso(t.amount_cents)}
      </T>
    </Pressable>
  );
}
export function Donut({ transactions }: { transactions: Transaction[] }) {
  const cats = categoryTotals(transactions);
  const total = cats.reduce((s, c) => s + c.cents, 0);
  let offset = 0;
  return (
    <Row style={{ gap: 22 }}>
      <View
        style={{
          width: 124,
          height: 124,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Svg
          width={124}
          height={124}
          viewBox="0 0 124 124"
          style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
        >
          <Circle cx={62} cy={62} r={50} fill="none" stroke={c.line} strokeWidth={12} />
          {cats.map((cat) => {
            const length = (cat.cents / total) * 314.159;
            const start = offset;
            offset += length;
            return (
              <Circle
                key={cat.id}
                cx={62}
                cy={62}
                r={50}
                fill="none"
                stroke={cat.color}
                strokeWidth={12}
                strokeDasharray={`${Math.max(0, length - 3)} 314.159`}
                strokeDashoffset={-start}
                strokeLinecap="round"
              />
            );
          })}
        </Svg>
        <T muted style={{ fontSize: 9 }}>
          TOTAL SPENT
        </T>
        <T style={{ fontFamily: font.extra, fontSize: 19 }}>{peso(total)}</T>
      </View>
      <View style={{ flex: 1, gap: 10 }}>
        {cats.length ? (
          cats.slice(0, 4).map((cat) => (
            <Row key={cat.id} style={{ gap: 7 }}>
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: cat.color,
                }}
              />
              <T muted style={{ fontSize: 10, flex: 1 }}>
                {cat.name}
              </T>
              <T style={{ fontFamily: font.bold, fontSize: 10 }}>{peso(cat.cents)}</T>
            </Row>
          ))
        ) : (
          <T muted style={{ fontSize: 12 }}>
            Your spending story starts with your first expense.
          </T>
        )}
      </View>
    </Row>
  );
}
export function GoalCard({
  goal: g,
  transactions,
  onAdd,
  onPress,
}: {
  goal: Goal;
  transactions: Transaction[];
  onAdd?: () => void;
  onPress?: () => void;
}) {
  const saved = goalSaved(g, transactions),
    progress = Math.min(100, (saved / g.target_cents) * 100);
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `View ${g.name} activities` : undefined}
      onPress={onPress}
    >
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: c.lavender,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={g.icon as IconName} color={c.purple} size={24} />
            </View>
            <View style={{ maxWidth: 215 }}>
              <T style={{ fontFamily: font.bold, fontSize: 14 }}>{g.name}</T>
              <T muted style={{ fontSize: 10 }}>
                By{' '}
                {new Date(g.target_date + 'T00:00:00').toLocaleDateString('en-PH', {
                  month: 'short',
                  year: 'numeric',
                })}
              </T>
            </View>
          </Row>
          <T style={{ color: c.purple, fontSize: 11, fontFamily: font.bold }}>
            {Math.round(progress)}%
          </T>
        </Row>
        <Progress value={progress} color={c.purple} />
        <Row style={{ justifyContent: 'space-between' }}>
          <T style={{ fontFamily: font.bold, fontSize: 15 }}>
            {peso(saved)}{' '}
            <T muted style={{ fontSize: 10 }}>
              of {peso(g.target_cents)}
            </T>
          </T>
          <T muted style={{ fontSize: 10 }}>
            {g.deleted_at
              ? 'Savings returned'
              : progress >= 100
                ? 'Goal reached! 🎉'
                : `${peso(g.target_cents - saved)} to go`}
          </T>
        </Row>
        {onAdd && progress < 100 && (
          <Button
            label="Add to this goal"
            icon="add"
            variant="secondary"
            onPress={onAdd}
            style={{ minHeight: 42, backgroundColor: c.lavender }}
          />
        )}
      </Card>
    </Pressable>
  );
}
