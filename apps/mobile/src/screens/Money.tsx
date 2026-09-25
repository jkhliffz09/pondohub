import React, { useState, useRef } from 'react';
import { View, Pressable, TextInput } from 'react-native';
import {
  categories,
  channels,
  peso,
  toCents,
  manilaDate,
  summarize,
  affordability,
} from '@pondo/shared';
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
  Badge,
  ErrorText,
} from '../components/ui';
import { useStore, newId } from '../lib/store';
import { c, font } from '../theme';
export function MoneyForm({ route, navigation }: { route: any; navigation: any }) {
  const income = route.name === 'AddCashIn';
  const { data, addTransaction } = useStore();
  const [amount, setAmount] = useState(''),
    [description, setDescription] = useState(''),
    [category, setCategory] = useState('food'),
    [channel, setChannel] = useState('Cash'),
    [date, setDate] = useState(manilaDate()),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false);
  const transactionId = useRef(newId());
  const submitting = useRef(false);
  if (!data) return null;
  const summary = summarize(data);
  async function save() {
    if (submitting.current) return;
    setError(null);
    try {
      const cents = toCents(amount);
      if (!description.trim())
        throw new Error('Add a short description so you can recognize this later.');
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        Number.isNaN(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date ||
        date > manilaDate()
      )
        throw new Error('Enter a valid date that is today or earlier.');
      if (!income && cents > summary.available)
        throw new Error(
          'This is more than your available pondo. Record any missing cash-in first.',
        );
      submitting.current = true;
      setBusy(true);
      await addTransaction({
        id: transactionId.current,
        kind: income ? 'income' : 'expense',
        amount_cents: cents,
        description: description.trim(),
        category: income ? 'other' : category,
        channel,
        occurred_on: date,
        goal_id: null,
      });
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  if (saved)
    return (
      <Page title={income ? 'Cash in' : 'Add expense'} back>
        <View style={{ alignItems: 'center', paddingVertical: 45, gap: 20 }}>
          <View
            style={{
              height: 85,
              width: 85,
              borderRadius: 43,
              backgroundColor: c.mint,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="checkmark" size={43} />
          </View>
          <T style={{ fontFamily: font.extra, fontSize: 27, lineHeight: 35 }}>
            {income ? 'A fresh boost.' : 'You’re all caught up.'}
          </T>
          <T muted>
            {peso(Number(amount) * 100, true)}{' '}
            {income ? 'added to your pondo.' : 'expense recorded.'}
          </T>
          <Card style={{ width: '100%', alignItems: 'center' }}>
            <T muted>Your available pondo</T>
            <T
              style={{
                fontFamily: font.extra,
                fontSize: 32,
                lineHeight: 43,
                color: c.green,
              }}
            >
              {peso(summarize(data).available, true)}
            </T>
          </Card>
          <Button
            label="Back to my pondo"
            onPress={() => navigation.goBack()}
            style={{ width: '100%' }}
          />
        </View>
      </Page>
    );
  return (
    <Page title={income ? 'Cash in' : 'Add expense'} back>
      <View style={{ gap: 7 }}>
        <Badge
          label={income ? 'A LITTLE MORE ROOM' : 'BUILD A MINDFUL HABIT'}
          icon={income ? 'sunny-outline' : 'leaf-outline'}
        />
        <T
          style={{
            fontFamily: font.extra,
            fontSize: 26,
            lineHeight: 35,
            letterSpacing: -1,
          }}
        >
          {income ? 'Give your pondo a boost.' : 'Where did your peso go?'}
        </T>
        <T muted style={{ fontSize: 12 }}>
          {income
            ? 'Record your allowance, a gift, or a little extra.'
            : 'The little things add up. Let’s keep track.'}
        </T>
      </View>
      <Card
        style={{
          alignItems: 'center',
          backgroundColor: income ? c.mint : c.lavender,
          borderWidth: 0,
          paddingVertical: 25,
          gap: 15,
        }}
      >
        <T
          style={{
            fontSize: 10,
            fontFamily: font.bold,
            letterSpacing: 1.5,
            color: income ? c.green : c.purple,
          }}
        >
          {income ? 'AMOUNT RECEIVED' : 'EXPENSE AMOUNT'}
        </T>
        <Row style={{ justifyContent: 'center', width: '100%' }}>
          <T
            style={{
              fontFamily: font.bold,
              fontSize: 31,
              lineHeight: 45,
              color: income ? c.green : c.purple,
            }}
          >
            ₱
          </T>
          <TextInput
            accessibilityLabel="Amount in pesos"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={income ? '#9CC8B6' : '#BAAFD4'}
            style={{
              fontFamily: font.extra,
              fontSize: 43,
              color: income ? c.green : c.purple,
              minWidth: 100,
              maxWidth: 230,
              textAlign: 'center',
              padding: 5,
            }}
          />
        </Row>
        <Row style={{ gap: 7, flexWrap: 'wrap', justifyContent: 'center' }}>
          {(income ? [200, 500, 1000, 2000] : [20, 50, 100, 200]).map((v) => (
            <Chip
              key={v}
              label={`+₱${v}`}
              onPress={() => setAmount(String(Number(amount || 0) + v))}
            />
          ))}
        </Row>
      </Card>
      <Field
        label={income ? 'What is this for?' : 'Description'}
        placeholder={income ? 'Weekly baon from Nanay' : 'Lunch at the campus canteen'}
        value={description}
        onChangeText={setDescription}
        maxLength={240}
      />
      {!income && (
        <>
          <Section title="Choose a category" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {categories.map((cat) => (
              <Pressable
                key={cat.id}
                accessibilityRole="button"
                accessibilityLabel={cat.name}
                accessibilityState={{ selected: category === cat.id }}
                onPress={() => setCategory(cat.id)}
                style={{
                  width: '48%',
                  padding: 14,
                  borderRadius: 15,
                  borderWidth: 1.5,
                  borderColor: category === cat.id ? c.green : c.line,
                  backgroundColor: category === cat.id ? c.mint : 'white',
                  gap: 10,
                }}
              >
                <Row style={{ justifyContent: 'space-between' }}>
                  <Icon name={cat.icon} color={cat.color} />
                  {category === cat.id && <Icon name="checkmark-circle" size={16} />}
                </Row>
                <T style={{ fontFamily: font.semi, fontSize: 11 }}>{cat.name}</T>
              </Pressable>
            ))}
          </View>
        </>
      )}
      <Section title={income ? 'Source of funds' : 'Paid with'} />
      <Row style={{ flexWrap: 'wrap', gap: 8 }}>
        {channels.map((ch) => (
          <Chip key={ch} label={ch} active={channel === ch} onPress={() => setChannel(ch)} />
        ))}
      </Row>
      <Field
        label="Date"
        value={date}
        onChangeText={setDate}
        placeholder="YYYY-MM-DD"
        hint="Philippine time · YYYY-MM-DD"
      />
      <ErrorText message={error} />
      <Button
        label={income ? 'Add to my pondo' : 'Save expense'}
        icon={income ? 'add-circle-outline' : 'checkmark-circle-outline'}
        loading={busy}
        onPress={save}
      />
      <Row style={{ alignItems: 'flex-start', paddingHorizontal: 10 }}>
        <Icon name="information-circle-outline" size={15} color={c.muted} />
        <T muted style={{ fontSize: 10, lineHeight: 17, flex: 1 }}>
          This is a personal money record. Pondo Hub does not hold or transfer your cash or e-wallet
          funds.
        </T>
      </Row>
    </Page>
  );
}
export function Afford({ navigation }: { navigation: any }) {
  const { data } = useStore();
  const [name, setName] = useState(''),
    [price, setPrice] = useState(''),
    [amount, setAmount] = useState<number | null>(null),
    [error, setError] = useState<string | null>(null);
  if (!data) return null;
  const result = amount ? affordability(data, amount) : null;
  const color = result?.status === 'safe' ? c.green : result?.status === 'wait' ? c.amber : c.red;
  return (
    <Page title="Can I afford this?" back>
      <View style={{ alignItems: 'center', paddingVertical: 13, gap: 14 }}>
        <View
          style={{
            height: 66,
            width: 66,
            borderRadius: 24,
            backgroundColor: c.lavender,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="sparkles-outline" size={32} color={c.purple} />
        </View>
        <T
          style={{
            fontFamily: font.extra,
            fontSize: 25,
            lineHeight: 34,
            letterSpacing: -0.7,
          }}
        >
          A little pause. A smarter yes.
        </T>
        <T muted style={{ fontSize: 12, textAlign: 'center' }}>
          Check how a purchase fits into your week.{'\n'}Your goals stay protected.
        </T>
      </View>
      <Card>
        <Field
          label="What’s caught your eye?"
          placeholder="Those sneakers, a milk tea…"
          value={name}
          onChangeText={setName}
        />
        <Field
          label="Price in pesos"
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={price}
          onChangeText={(v) => {
            setPrice(v);
            setAmount(null);
          }}
        />
        <Row style={{ gap: 6, flexWrap: 'wrap' }}>
          {[100, 250, 500, 1000].map((p) => (
            <Chip
              key={p}
              label={peso(p * 100)}
              onPress={() => {
                setPrice(String(p));
                setAmount(null);
              }}
            />
          ))}
        </Row>
        <ErrorText message={error} />
        <Button
          label="Check my budget"
          icon="sparkles-outline"
          onPress={() => {
            try {
              setAmount(toCents(price));
              setError(null);
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        />
      </Card>
      {result && (
        <Card
          style={{
            borderColor: color + '40',
            backgroundColor:
              result.status === 'safe' ? c.mint : result.status === 'wait' ? c.amberTint : c.pink,
          }}
        >
          <Row>
            <Icon
              name={result.status === 'safe' ? 'checkmark-circle-outline' : 'pause-circle-outline'}
              color={color}
              size={27}
            />
            <View>
              <T style={{ fontFamily: font.bold, color, fontSize: 18 }}>
                {result.status === 'safe'
                  ? 'Room for this little joy.'
                  : result.status === 'wait'
                    ? 'Maybe give it a little time.'
                    : 'Let’s save for it instead.'}
              </T>
              <T muted style={{ fontSize: 11 }}>
                {name || 'Your purchase'}
              </T>
            </View>
          </Row>
          {[
            ['Spendable pondo', result.available],
            ['This purchase', -(amount || 0)],
            ['After your purchase', result.remaining],
          ].map(([label, value], i) => (
            <Row
              key={label as string}
              style={{
                justifyContent: 'space-between',
                borderTopWidth: i === 2 ? 1 : 0,
                borderColor: color + '25',
                paddingTop: i === 2 ? 12 : 0,
              }}
            >
              <T style={{ fontSize: 12 }}>{label as string}</T>
              <T style={{ fontFamily: font.bold, fontSize: 14 }}>{peso(value as number, true)}</T>
            </Row>
          ))}
          <T style={{ fontSize: 12, lineHeight: 21, color }}>
            {result.status === 'over'
              ? 'This would spend more than you have available. Keep your savings safe and work toward it at your pace.'
              : `Your safe daily spend would be ${peso(result.dailyAfter)} for the next ${result.daysLeft} days. Your essential daily budget is ${peso(data.profile.daily_essential_cents)}.`}
          </T>
          <Button
            label="Make it a savings goal"
            variant="secondary"
            icon="flag-outline"
            onPress={() => navigation.navigate('CreateGoal', { name, target: price })}
          />
          {result.status === 'safe' && (
            <T style={{ fontSize: 10, color }}>
              Ready to buy? Record the expense after you make the purchase.
            </T>
          )}
        </Card>
      )}
      <T muted style={{ fontSize: 10, textAlign: 'center', lineHeight: 18 }}>
        A budget comparison based on your recorded money.{'\n'}No purchases or transfers happen
        here.
      </T>
    </Page>
  );
}
