import React, { useState, useEffect } from 'react';
import { View, Switch, Share, Pressable, AppState } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  type Permissions,
  type GuardianSnapshot,
  peso,
  categories,
  defaultPermissions,
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
  Section,
  Badge,
  Empty,
  ErrorText,
  Progress,
  type IconName,
} from '../components/ui';
import { GoalCard } from '../components/finance';
import { c, font } from '../theme';
const options: [keyof Permissions, string, string, IconName][] = [
  [
    'share_goals',
    'Savings / goals (safe keeping)',
    'Let your guardian see your active goals and saved balances.',
    'flag-outline',
  ],
];
export function Sharing({ navigation }: { navigation: any }) {
  const { data, updatePermissions, revokeLink } = useStore();
  const [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState<string | null>(null);
  if (!data) return null;
  async function toggle(id: string, key: keyof Permissions, value: boolean) {
    const link = data!.links.find((l) => l.id === id)!;
    setBusy(true);
    setError(null);
    try {
      await updatePermissions(id, {
        share_balance: true,
        share_categories: true,
        share_goals: link.share_goals,
        share_health: true,
        [key]: value,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page title="Guardian sharing" subtitle="A clear picture, with support from your family." back>
      <Card style={{ backgroundColor: c.mint, borderWidth: 0 }}>
        <Row>
          <Icon name="shield-checkmark-outline" size={27} />
          <T style={{ fontFamily: font.bold, fontSize: 15 }}>A shared view of your pondo.</T>
        </Row>
        <T style={{ fontSize: 12, lineHeight: 21, color: '#55816D' }}>
          Connected guardians always see your available balance, spending category totals, and
          budget rhythm. Only savings and goals are optional. Guardians cannot edit records or move
          money.
        </T>
      </Card>
      {data.links.map((link) => (
        <View key={link.id} style={{ gap: 17 }}>
          <Section title="Connected guardian" />
          <Card>
            <Row>
              <View
                style={{
                  width: 43,
                  height: 43,
                  borderRadius: 22,
                  backgroundColor: c.pink,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="heart-outline" color={c.red} />
              </View>
              <View style={{ flex: 1 }}>
                <T style={{ fontFamily: font.bold }}>
                  {link.parent_name || 'Connected parent / guardian'}
                </T>
                <T muted style={{ fontSize: 10 }}>
                  Linked {new Date(link.created_at).toLocaleDateString('en-PH')}
                </T>
              </View>
              <Badge label="Read-only" />
            </Row>
          </Card>
          <Section title="Savings visibility" />
          <Card>
            {options.map(([key, title, description, icon], i) => (
              <Row
                key={key}
                style={{
                  alignItems: 'center',
                  paddingTop: i ? 16 : 0,
                  borderTopWidth: i ? 1 : 0,
                  borderColor: c.line,
                }}
              >
                <Icon name={icon} size={20} />
                <View style={{ flex: 1, gap: 3 }}>
                  <T style={{ fontFamily: font.semi, fontSize: 12 }}>{title}</T>
                  <T muted style={{ fontSize: 10, lineHeight: 17 }}>
                    {description}
                  </T>
                </View>
                <Switch
                  accessibilityLabel={`Share ${title.toLowerCase()}`}
                  disabled={busy}
                  value={link[key]}
                  onValueChange={(value) => toggle(link.id, key, value)}
                  trackColor={{ false: '#DCE3DF', true: '#2E9475' }}
                  thumbColor="white"
                />
              </Row>
            ))}
          </Card>
          <T muted style={{ fontSize: 10, textAlign: 'center' }}>
            Changes are saved immediately.
          </T>
          {confirm === link.id ? (
            <Card>
              <T>Disconnect this guardian? Their access will end immediately.</T>
              <Button
                label="Yes, disconnect"
                variant="danger"
                onPress={async () => {
                  try {
                    await revokeLink(link.id);
                    setConfirm(null);
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              />
              <Button label="Keep connected" variant="ghost" onPress={() => setConfirm(null)} />
            </Card>
          ) : (
            <Button
              label="Disconnect guardian"
              variant="ghost"
              onPress={() => setConfirm(link.id)}
            />
          )}
        </View>
      ))}
      {!data.links.length && (
        <Empty
          icon="people-outline"
          title="Your circle of support."
          description="Invite a guardian to see your balance, spending totals, and budget rhythm. Savings visibility is optional."
        />
      )}
      <Card style={{ backgroundColor: c.lavender, borderWidth: 0 }}>
        <Row>
          <Icon name="lock-closed-outline" color={c.purple} />
          <View style={{ flex: 1, gap: 4 }}>
            <T style={{ fontFamily: font.bold, fontSize: 12, color: c.purple }}>
              The details stay yours.
            </T>
            <T style={{ fontSize: 11, color: '#8B7B9E', lineHeight: 19 }}>
              Individual purchases, merchant names, notes, and timestamps are always private.
            </T>
          </View>
        </Row>
      </Card>
      <ErrorText message={error} />
      <Button
        label="Invite a parent or guardian"
        icon="person-add-outline"
        onPress={() => navigation.navigate('Invitation')}
      />
    </Page>
  );
}
export function Invitation() {
  const { createInvitation, demo } = useStore();
  const [invite, setInvite] = useState<{
      code: string;
      expires_at: string;
    } | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [copied, setCopied] = useState(false);
  async function create() {
    setBusy(true);
    setError(null);
    try {
      setInvite(await createInvitation());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page title="Invite your support crew" back>
      <View style={{ alignItems: 'center', paddingVertical: 18, gap: 16 }}>
        <View
          style={{
            width: 75,
            height: 75,
            borderRadius: 27,
            backgroundColor: c.mint,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="people-outline" size={35} />
        </View>
        <T
          style={{
            fontFamily: font.extra,
            fontSize: 26,
            lineHeight: 35,
            textAlign: 'center',
          }}
        >
          Better with someone{'\n'}in your corner.
        </T>
        <T muted style={{ textAlign: 'center', fontSize: 12, lineHeight: 22 }}>
          Invite a parent, guardian, or sponsor to see your balance, spending totals, and budget
          rhythm. Only savings visibility is optional.
        </T>
      </View>
      {invite ? (
        <Card
          style={{
            alignItems: 'center',
            backgroundColor: c.mint,
            borderWidth: 0,
            paddingVertical: 27,
          }}
        >
          <T
            style={{
              fontSize: 10,
              letterSpacing: 1.5,
              color: c.green,
              fontFamily: font.bold,
            }}
          >
            YOUR FAMILY PAIRING CODE
          </T>
          <T
            style={{
              fontSize: 17,
              fontFamily: font.extra,
              color: c.green,
              textAlign: 'center',
            }}
          >
            {invite.code}
          </T>
          <T muted style={{ fontSize: 10, textAlign: 'center' }}>
            {demo
              ? 'Demo code · does not connect real accounts'
              : `Expires ${new Date(invite.expires_at).toLocaleString('en-PH')} · One-time use`}
          </T>
          <Button
            label={copied ? 'Copied!' : 'Copy code'}
            icon="copy-outline"
            variant="secondary"
            onPress={async () => {
              try {
                await Clipboard.setStringAsync(invite.code);
                setCopied(true);
              } catch {
                setError('Could not copy. Select the code to share it manually.');
              }
            }}
          />
        </Card>
      ) : (
        <Button
          label="Generate a pairing code"
          loading={busy}
          onPress={create}
          icon="key-outline"
        />
      )}
      <Card>
        <Section title="A simple hello" />
        {[
          ['1', 'Ask your guardian to create a parent account.'],
          ['2', 'They tap “Connect a student” on their home screen.'],
          [
            '3',
            'They enter your code to see budget summaries. You can change savings visibility or disconnect.',
          ],
        ].map(([num, text]) => (
          <Row key={num} style={{ alignItems: 'flex-start' }}>
            <View
              style={{
                width: 25,
                height: 25,
                borderRadius: 9,
                backgroundColor: c.mint,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <T style={{ fontFamily: font.bold, fontSize: 11, color: c.green }}>{num}</T>
            </View>
            <T muted style={{ flex: 1, fontSize: 12, lineHeight: 21 }}>
              {text}
            </T>
          </Row>
        ))}
      </Card>
      <ErrorText message={error} />
      {invite && (
        <Button
          label="Share invitation"
          icon="share-outline"
          onPress={async () => {
            try {
              await Share.share({
                message: `Join me on Pondo Hub! Create a parent account, tap Connect a student, and enter ${invite.code}. This code expires in 24 hours. My detailed transactions stay private.`,
              });
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        />
      )}
      <T muted style={{ fontSize: 10, textAlign: 'center' }}>
        Parents can encourage your journey. Your money stays yours.
      </T>
    </Page>
  );
}
function GuardianCard({ snapshot: g }: { snapshot: GuardianSnapshot }) {
  return (
    <View style={{ gap: 19 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View>
          <T style={{ fontFamily: font.extra, fontSize: 23, lineHeight: 32 }}>{g.student_name}</T>
          <T muted style={{ fontSize: 11 }}>
            {g.school || 'Building good money habits'}
          </T>
        </View>
        <Badge label="Read-only" icon="shield-checkmark-outline" />
      </Row>
      {g.balance ? (
        <Card style={{ backgroundColor: c.mint, borderWidth: 0 }}>
          <T
            style={{
              fontSize: 10,
              fontFamily: font.bold,
              letterSpacing: 1,
              color: c.green,
            }}
          >
            AVAILABLE PONDO
          </T>
          <T
            style={{
              fontFamily: font.extra,
              fontSize: 37,
              lineHeight: 48,
              color: c.green,
            }}
          >
            {peso(g.balance.available_cents, true)}
          </T>
          <Row style={{ justifyContent: 'space-between' }}>
            <T style={{ fontSize: 12, color: c.green }}>Safe daily pace</T>
            <T style={{ fontFamily: font.bold, color: c.green }}>
              {peso(g.balance.daily_cents)} / day
            </T>
          </Row>
        </Card>
      ) : (
        <Card>
          <Row>
            <Icon name="lock-closed-outline" color={c.muted} />
            <T muted style={{ fontSize: 12 }}>
              Balance is kept private.
            </T>
          </Row>
        </Card>
      )}
      {g.health && (
        <Badge
          label={
            g.health === 'comfortable'
              ? 'A comfortable rhythm'
              : g.health === 'watchful'
                ? 'A little encouragement helps'
                : 'Room for a supportive check-in'
          }
          tone={g.health === 'comfortable' ? 'green' : 'amber'}
          icon="leaf-outline"
        />
      )}
      {g.categories !== null && (
        <Card>
          <Section title="The bigger picture" />
          {g.categories.length ? (
            g.categories.map((cat) => (
              <Row key={cat.category} style={{ justifyContent: 'space-between' }}>
                <T style={{ fontSize: 12 }}>
                  {categories.find((c) => c.id === cat.category)?.name || cat.category}
                </T>
                <T style={{ fontFamily: font.bold, fontSize: 12 }}>{peso(cat.cents)}</T>
              </Row>
            ))
          ) : (
            <T muted style={{ fontSize: 12 }}>
              No expenses recorded this week.
            </T>
          )}
          <T muted style={{ fontSize: 10 }}>
            Weekly category totals. Purchase details stay private.
          </T>
        </Card>
      )}
      {g.goals !== null && (
        <>
          <Section title="Dreams in the making" />
          {g.goals.length ? (
            g.goals.map((goal) => <GoalCard key={goal.id} goal={goal} transactions={[]} />)
          ) : (
            <T muted style={{ fontSize: 12 }}>
              Their next goal is still taking shape.
            </T>
          )}
        </>
      )}
    </View>
  );
}
export function Guardian({ navigation }: { navigation: any }) {
  const { guardian, refresh, demo } = useStore();
  useEffect(() => {
    if (demo) return;
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') void refresh();
    }, 30000);
    return () => clearInterval(timer);
  }, [refresh, demo]);
  return (
    <Page
      title="In their corner."
      subtitle="Encourage the habits. Celebrate the little wins."
      refresh
    >
      <Badge label="PARENT & GUARDIAN VIEW" icon="heart-outline" />
      {guardian.length ? (
        guardian.map((g) => <GuardianCard key={g.link_id} snapshot={g} />)
      ) : (
        <Empty
          icon="people-outline"
          title="Your circle starts here."
          description="Ask your student for a pairing code to see their balance, spending totals, and budget rhythm."
          action="Connect a student"
          onPress={() => navigation.navigate('Pair')}
        />
      )}
      <Card style={{ backgroundColor: c.lavender, borderWidth: 0 }}>
        <Row>
          <Icon name="shield-checkmark-outline" color={c.purple} />
          <T style={{ fontSize: 12, color: c.purple, flex: 1, lineHeight: 20 }}>
            A space for support, never supervision. Students control their sharing permissions.
          </T>
        </Row>
      </Card>
      {guardian.length > 0 && (
        <Button
          label="Connect another student"
          variant="secondary"
          icon="person-add-outline"
          onPress={() => navigation.navigate('Pair')}
        />
      )}
    </Page>
  );
}
export function Pair({ navigation }: { navigation: any }) {
  const { acceptInvitation } = useStore();
  const [code, setCode] = useState(''),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  return (
    <Page title="Connect a student" back>
      <Card>
        <Icon name="key-outline" size={36} />
        <T style={{ fontFamily: font.extra, fontSize: 24, lineHeight: 32 }}>
          An invitation to encourage.
        </T>
        <T muted style={{ fontSize: 12 }}>
          Enter the pairing code your student shared with you. Invitations last 24 hours and can be
          used once.
        </T>
        <Field
          label="Pairing code"
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          placeholder="PONDO-…"
        />
        <ErrorText message={error} />
        <Button
          label="Connect with my student"
          loading={busy}
          onPress={async () => {
            setBusy(true);
            setError(null);
            try {
              await acceptInvitation(code.trim().toUpperCase());
              navigation.goBack();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        />
      </Card>
    </Page>
  );
}
export function Alerts() {
  const { data, guardian } = useStore();
  const parent = data?.profile.role === 'parent';
  return (
    <Page
      title={parent ? 'Little wins & check-ins.' : 'Your gentle reminders.'}
      subtitle="A little encouragement goes a long way."
      refresh
    >
      {parent ? (
        <>
          {guardian.length ? (
            guardian.map((g) => (
              <View key={g.link_id} style={{ gap: 15 }}>
                <Section title={g.student_name} />
                {g.health && (
                  <Card
                    style={{
                      backgroundColor: g.health === 'comfortable' ? c.mint : c.amberTint,
                      borderWidth: 0,
                    }}
                  >
                    <Row>
                      <Icon name="leaf-outline" />
                      <T style={{ fontFamily: font.bold, fontSize: 14 }}>
                        {g.health === 'comfortable'
                          ? 'A comfortable week.'
                          : 'A kind check-in could help.'}
                      </T>
                    </Row>
                    <T muted style={{ fontSize: 12, lineHeight: 21 }}>
                      {g.health === 'comfortable'
                        ? 'Their recorded pondo is supporting their daily essentials. Celebrate their consistency.'
                        : 'Their recorded daily pace is tight. Ask how their week is going and whether they need support.'}
                    </T>
                    <Badge label="Current budget status" />
                  </Card>
                )}
                {g.goals
                  ?.filter((goal) => (goal.saved_cents || 0) > 0)
                  .map((goal) => (
                    <Card key={goal.id}>
                      <Row>
                        <Icon name="flag-outline" color={c.purple} />
                        <T style={{ fontFamily: font.bold, fontSize: 14 }}>{goal.name}</T>
                      </Row>
                      <T muted style={{ fontSize: 12 }}>
                        {Math.round(((goal.saved_cents || 0) / goal.target_cents) * 100)}% of the
                        way. Every little step is worth noticing.
                      </T>
                      <Progress
                        value={((goal.saved_cents || 0) / goal.target_cents) * 100}
                        color={c.purple}
                      />
                    </Card>
                  ))}
                {!g.health && !g.goals && (
                  <Empty
                    title="Quiet, by choice."
                    description="Your student is keeping these updates private."
                  />
                )}
              </View>
            ))
          ) : (
            <Empty
              title="Your updates will grow here."
              description="Connect with your student to see their budget updates and shared savings milestones."
            />
          )}
        </>
      ) : (
        <>
          <Card style={{ backgroundColor: c.mint, borderWidth: 0 }}>
            <Row>
              <Icon name="leaf-outline" />
              <T style={{ fontFamily: font.bold }}>Small steps are still steps.</T>
            </Row>
            <T muted style={{ fontSize: 12 }}>
              Log today’s spending and give tomorrow’s you a clearer picture. You don’t have to get
              it perfect.
            </T>
          </Card>
          <Card>
            <Row>
              <Icon name="shield-checkmark-outline" />
              <T style={{ fontFamily: font.bold }}>You’re in control.</T>
            </Row>
            <T muted style={{ fontSize: 12 }}>
              Review your parent sharing settings any time. Your detailed transactions always stay
              private.
            </T>
          </Card>
        </>
      )}
      <T muted style={{ fontSize: 10, textAlign: 'center' }}>
        In-app updates based on current records. No push notifications are sent.
      </T>
    </Page>
  );
}
