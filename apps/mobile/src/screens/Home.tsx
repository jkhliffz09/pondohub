import React from 'react';
import { View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { summarize, peso, newestFirst } from '@pondo/shared';
import { useStore } from '../lib/store';
import { c, font } from '../theme';
import { Page, T, Row, Icon, Card, Badge, Section, type IconName } from '../components/ui';
import { BalanceCard, Donut, TransactionRow } from '../components/finance';
export function Home() {
  const { data } = useStore();
  const nav = useNavigation<any>();
  if (!data) return null;
  const x = summarize(data);
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Manila',
      hour: 'numeric',
      hour12: false,
    }).format(new Date()),
  );
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return (
    <Page refresh>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ gap: 4 }}>
          <T muted style={{ fontSize: 12 }}>
            {greeting}, {data.profile.name.split(' ')[0]} <T>☀️</T>
          </T>
          <T
            style={{
              fontFamily: font.extra,
              fontSize: 26,
              lineHeight: 34,
              letterSpacing: -1,
            }}
          >
            Let’s make it count.
          </T>
        </View>
        <View style={{ padding: 9, borderRadius: 15, backgroundColor: c.mint }}>
          <Icon name="leaf-outline" size={20} />
        </View>
      </Row>
      <BalanceCard data={data} />
      <Card style={{ padding: 17, gap: 13 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row style={{ gap: 10 }}>
            <View
              style={{
                height: 38,
                width: 38,
                backgroundColor: c.mint,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="sunny-outline" size={22} />
            </View>
            <View>
              <T style={{ fontFamily: font.bold, fontSize: 13 }}>Today’s safe spend</T>
              <T muted style={{ fontSize: 10 }}>
                Keep a little room for tomorrow.
              </T>
            </View>
          </Row>
          <T
            style={{
              fontFamily: font.extra,
              fontSize: 25,
              color: c.green,
              letterSpacing: -1,
            }}
          >
            {peso(x.safeDaily)}
          </T>
        </Row>
        <Row
          style={{
            borderTopWidth: 1,
            borderColor: c.line,
            paddingTop: 11,
            justifyContent: 'space-between',
          }}
        >
          <T muted style={{ fontSize: 9 }}>
            {peso(x.safePool)} spendable ÷ {x.daysLeft} days left
          </T>
          <Badge
            label={
              x.health === 'comfortable'
                ? 'On a good pace'
                : x.health === 'watchful'
                  ? 'Take it gently'
                  : 'Time to rebudget'
            }
            tone={x.health === 'comfortable' ? 'green' : 'amber'}
          />
        </Row>
      </Card>
      <Section title="A little action goes a long way" />
      <Row style={{ gap: 12 }}>
        {[
          {
            title: 'Add expense',
            sub: 'Track your everyday',
            icon: 'arrow-up-outline',
            route: 'AddExpense',
            tint: c.pink,
            color: c.red,
          },
          {
            title: 'Cash in',
            sub: 'A fresh little boost',
            icon: 'arrow-down-outline',
            route: 'AddCashIn',
            tint: c.mint,
            color: c.green,
          },
        ].map((a) => (
          <Pressable
            key={a.title}
            accessibilityRole="button"
            accessibilityLabel={a.title}
            onPress={() => nav.navigate(a.route)}
            style={{
              flex: 1,
              borderRadius: 19,
              borderWidth: 1,
              borderColor: c.line,
              padding: 17,
              backgroundColor: 'white',
              gap: 16,
            }}
          >
            <Row style={{ justifyContent: 'space-between' }}>
              <View
                style={{
                  width: 39,
                  height: 39,
                  borderRadius: 13,
                  backgroundColor: a.tint,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={a.icon as IconName} size={21} color={a.color} />
              </View>
              <Icon name="arrow-up-right-box-outline" size={16} color="#B5BEB8" />
            </Row>
            <View style={{ gap: 2 }}>
              <T style={{ fontFamily: font.bold, fontSize: 13 }}>{a.title}</T>
              <T muted style={{ fontSize: 10 }}>
                {a.sub}
              </T>
            </View>
          </Pressable>
        ))}
      </Row>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Can I afford this?"
        onPress={() => nav.navigate('Afford')}
      >
        <LinearGradient
          colors={['#F0EBFA', '#EAE3F7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 20,
            padding: 19,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF80',
              width: 43,
              height: 43,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="sparkles-outline" color={c.purple} size={23} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <T style={{ fontFamily: font.bold, fontSize: 14, color: '#5B4994' }}>
              Can I afford this?
            </T>
            <T style={{ fontSize: 10, color: '#8D7BAF' }}>
              A small pause before your next purchase.
            </T>
          </View>
          <Icon name="arrow-forward" color={c.purple} size={19} />
        </LinearGradient>
      </Pressable>
      <Section
        title="Your week, at a glance"
        action="Insights"
        onPress={() => nav.navigate('Insights')}
      />
      <Card>
        <Donut transactions={data.transactions.filter((t) => t.occurred_on >= x.start)} />
      </Card>
      <Row style={{ paddingHorizontal: 5, alignItems: 'flex-start' }}>
        <Icon name="bulb-outline" color={c.amber} size={17} />
        <T muted style={{ fontSize: 10, lineHeight: 18, flex: 1 }}>
          A little baon wisdom: bringing your water bottle is a small habit your wallet will thank
          you for.
        </T>
      </Row>
      <Section title="Recent activity" action="See all" onPress={() => nav.navigate('History')} />
      <Card style={{ paddingVertical: 3, gap: 0 }}>
        {data.transactions.length ? (
          data.transactions
            .slice()
            .sort(newestFirst)
            .slice(0, 3)
            .map((t) => (
              <TransactionRow
                key={t.id}
                transaction={t}
                onPress={() => nav.navigate('Transaction', { id: t.id })}
              />
            ))
        ) : (
          <View style={{ paddingVertical: 20 }}>
            <T muted>No activity yet. Start with your first cash-in.</T>
          </View>
        )}
      </Card>
      <Pressable accessibilityRole="button" onPress={() => nav.navigate('Sharing')}>
        <Row style={{ justifyContent: 'center', gap: 6 }}>
          <Icon name="shield-checkmark-outline" color={c.muted} size={13} />
          <T muted style={{ fontSize: 10 }}>
            {data.links.length
              ? 'Guardian sharing. Manage savings visibility.'
              : 'Connect a guardian for budget support.'}
          </T>
        </Row>
      </Pressable>
    </Page>
  );
}
