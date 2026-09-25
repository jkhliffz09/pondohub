import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { peso, summarize, toCents } from '@pondo/shared';
import { useStore } from '../lib/store';
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
import { c, font } from '../theme';
export function Profile({ navigation }: { navigation: any }) {
  const { data, demo, signOut, changeDemoRole, enterDemo, refresh } = useStore();
  const [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(false);
  if (!data) return null;
  const parent = data.profile.role === 'parent';
  async function logout() {
    try {
      setBusy(true);
      await signOut();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page title="A little about you." subtitle="Your pondo, your preferences." refresh>
      <Card style={{ alignItems: 'center', paddingVertical: 28, gap: 12 }}>
        <View
          style={{
            width: 73,
            height: 73,
            borderRadius: 26,
            backgroundColor: c.mint,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <T style={{ fontFamily: font.extra, fontSize: 25, color: c.green }}>
            {data.profile.name
              .split(' ')
              .slice(0, 2)
              .map((n) => n[0])
              .join('')}
          </T>
        </View>
        <T style={{ fontFamily: font.extra, fontSize: 22, lineHeight: 30 }}>{data.profile.name}</T>
        <T muted style={{ fontSize: 11, textAlign: 'center' }}>
          {data.profile.school || 'Your next chapter starts here'}
        </T>
        <Badge
          label={parent ? 'Parent / Guardian' : 'Student'}
          icon={parent ? 'heart-outline' : 'school-outline'}
        />
        {!parent && (
          <Row
            style={{
              borderTopWidth: 1,
              borderColor: c.line,
              paddingTop: 16,
              marginTop: 4,
              width: '100%',
              justifyContent: 'space-around',
            }}
          >
            <View style={{ alignItems: 'center' }}>
              <T style={{ fontFamily: font.bold, fontSize: 18 }}>
                {peso(summarize(data).reserved)}
              </T>
              <T muted style={{ fontSize: 10 }}>
                set aside for goals
              </T>
            </View>
            <View style={{ alignItems: 'center' }}>
              <T style={{ fontFamily: font.bold, fontSize: 18 }}>{data.goals.length}</T>
              <T muted style={{ fontSize: 10 }}>
                dreams in progress
              </T>
            </View>
          </Row>
        )}
      </Card>
      <Section title="Make yourself at home" />
      <Card style={{ paddingVertical: 4, gap: 0 }}>
        {[
          {
            icon: 'person-outline',
            title: 'Personal & budget details',
            sub: parent
              ? 'Your name and profile'
              : `${peso(data.profile.weekly_budget_cents)} weekly plan`,
            route: 'Settings',
          },
          ...(parent
            ? [
                {
                  icon: 'person-add-outline',
                  title: 'Connect a student',
                  sub: 'Build a circle of support',
                  route: 'Pair',
                },
              ]
            : [
                {
                  icon: 'shield-checkmark-outline',
                  title: 'Family & privacy',
                  sub: 'Share on your terms',
                  route: 'Sharing',
                },
              ]),
          {
            icon: 'notifications-outline',
            title: 'Gentle reminders',
            sub: 'Check-ins and little wins',
            route: 'Alerts',
          },
        ].map((item, i) => (
          <Pressable
            key={item.title}
            accessibilityRole="button"
            accessibilityLabel={item.title}
            onPress={() => navigation.navigate(item.route)}
            style={{
              paddingVertical: 18,
              borderTopWidth: i ? 1 : 0,
              borderTopColor: c.line,
              flexDirection: 'row',
              gap: 13,
              alignItems: 'center',
            }}
          >
            <Icon name={item.icon as IconName} size={22} />
            <View style={{ flex: 1, gap: 2 }}>
              <T style={{ fontFamily: font.semi, fontSize: 12 }}>{item.title}</T>
              <T muted style={{ fontSize: 10 }}>
                {item.sub}
              </T>
            </View>
            <Icon name="chevron-forward" size={16} color={c.muted} />
          </Pressable>
        ))}
      </Card>
      <Card style={{ backgroundColor: c.lavender, borderWidth: 0 }}>
        <Row>
          <Icon name="lock-closed-outline" color={c.purple} />
          <T style={{ fontFamily: font.bold, fontSize: 12, color: c.purple }}>
            A ledger. A little peace of mind.
          </T>
        </Row>
        <T style={{ fontSize: 11, color: '#8A7A9E', lineHeight: 20 }}>
          Pondo Hub records the money you tell it about. It never connects to your bank account,
          holds funds, or makes transfers.
        </T>
      </Card>
      {demo && (
        <Button
          label={parent ? 'Preview student view' : 'Preview parent view'}
          icon="swap-horizontal-outline"
          variant="secondary"
          onPress={changeDemoRole}
        />
      )}
      {demo && (
        <Button
          label="Reset demo data"
          variant="ghost"
          icon="refresh-outline"
          onPress={() => void enterDemo(true)}
        />
      )}
      <ErrorText message={error} />
      {confirm ? (
        <Card>
          <T style={{ fontSize: 12 }}>
            Ready to sign out? Your saved records will be here when you return.
          </T>
          <Button label="Yes, sign out" loading={busy} variant="danger" onPress={logout} />
          <Button label="Stay here" variant="ghost" onPress={() => setConfirm(false)} />
        </Card>
      ) : (
        <Button
          label={demo ? 'Leave demo' : 'Sign out'}
          variant="ghost"
          icon="log-out-outline"
          onPress={() => setConfirm(true)}
        />
      )}
      <T muted style={{ textAlign: 'center', fontSize: 10 }}>
        Pondo Hub · 1.0.0{'\n'}Made for your next chapter.
      </T>
    </Page>
  );
}
export function Settings({ navigation }: { navigation: any }) {
  const { data, updateProfile } = useStore();
  const [name, setName] = useState(data?.profile.name || ''),
    [school, setSchool] = useState(data?.profile.school || ''),
    [budget, setBudget] = useState(String((data?.profile.weekly_budget_cents || 0) / 100)),
    [essential, setEssential] = useState(String((data?.profile.daily_essential_cents || 0) / 100)),
    [day, setDay] = useState(data?.profile.cycle_start_day ?? 1),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  async function save() {
    try {
      setError(null);
      if (!name.trim()) throw new Error('Please enter your name.');
      const update = {
        name: name.trim(),
        school: school.trim(),
        ...(data?.profile.role === 'student'
          ? {
              weekly_budget_cents: toCents(budget),
              daily_essential_cents: essential === '0' ? 0 : toCents(essential),
              cycle_start_day: day,
            }
          : {}),
      };
      setBusy(true);
      await updateProfile(update);
      navigation.goBack();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page title="Your preferences" back>
      <Field label="Full name" value={name} onChangeText={setName} maxLength={100} />
      <Field
        label="School / University"
        value={school}
        onChangeText={setSchool}
        maxLength={200}
        placeholder="Your school, if you’d like to add it"
      />
      {data?.profile.role === 'student' && (
        <>
          <Section title="Your weekly rhythm" />
          <Field
            label="Weekly budget (₱)"
            value={budget}
            onChangeText={setBudget}
            keyboardType="decimal-pad"
            hint="Your spending plan. This does not add money to your ledger."
          />
          <Field
            label="Daily essentials (₱)"
            value={essential}
            onChangeText={setEssential}
            keyboardType="decimal-pad"
            hint="Your comfortable minimum for food, transport, and necessities."
          />
          <T style={{ fontFamily: font.semi, fontSize: 12 }}>My budget week starts on</T>
          <Row style={{ flexWrap: 'wrap', gap: 8 }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
              <Pressable
                key={d}
                accessibilityRole="button"
                accessibilityLabel={d}
                onPress={() => setDay(i)}
                style={{
                  padding: 11,
                  borderRadius: 12,
                  backgroundColor: day === i ? c.green : 'white',
                  borderWidth: 1,
                  borderColor: c.line,
                }}
              >
                <T style={{ fontSize: 12, color: day === i ? 'white' : c.ink }}>{d}</T>
              </Pressable>
            ))}
          </Row>
          <Card style={{ backgroundColor: c.mint, borderWidth: 0 }}>
            <T style={{ fontSize: 12, lineHeight: 21, color: c.green }}>
              Safe daily spend uses the smaller of your available pondo and your remaining weekly
              plan, divided by the days left in your week. Savings are already set aside.
            </T>
          </Card>
        </>
      )}
      <ErrorText message={error} />
      <Button label="Save my preferences" onPress={save} loading={busy} />
    </Page>
  );
}
