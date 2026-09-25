import React, { useState } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { T, Row, Icon, Button, Field, ErrorText, Card } from '../components/ui';
import { c, font } from '../theme';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import type { Role } from '@pondo/shared';
export function Splash() {
  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: c.green,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 22,
      }}
    >
      <View
        style={{
          width: 78,
          height: 78,
          borderRadius: 26,
          backgroundColor: '#FFFFFF20',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="wallet" size={40} color="white" />
      </View>
      <T
        style={{
          fontSize: 33,
          lineHeight: 42,
          fontFamily: font.extra,
          color: 'white',
        }}
      >
        Pondo Hub
      </T>
      <T style={{ color: '#B9DBCC' }}>Little habits. Bigger possibilities.</T>
      <ActivityIndicator color="#B9DBCC" />
    </SafeAreaView>
  );
}
export function Welcome({ navigation }: { navigation: any }) {
  const { enterDemo } = useStore();
  const [busy, setBusy] = useState(false);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 28, gap: 28 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row>
            <View style={a.logo}>
              <Icon name="wallet" color="white" />
            </View>
            <T style={{ fontFamily: font.extra, fontSize: 21 }}>Pondo Hub</T>
          </Row>
          <T muted style={{ fontSize: 11 }}>
            MADE FOR YOU 🇵🇭
          </T>
        </Row>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            gap: 27,
            paddingVertical: 15,
          }}
        >
          <View style={a.art}>
            <View style={a.orbit} />
            <LinearGradient colors={['#0D8E67', '#076047']} style={a.wallet}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Icon name="wallet-outline" color="#CAF1DD" />
                <T style={{ color: '#BBE4D0', fontSize: 10, letterSpacing: 1 }}>
                  YOUR NEXT CHAPTER
                </T>
              </Row>
              <T
                style={{
                  fontFamily: font.extra,
                  color: 'white',
                  fontSize: 40,
                  lineHeight: 53,
                  marginTop: 21,
                }}
              >
                ₱2,000<T style={{ color: '#B1DBC7', fontSize: 20 }}>.00</T>
              </T>
              <Row style={{ marginTop: 22, justifyContent: 'space-between' }}>
                <T style={{ color: '#D0EADF', fontSize: 11 }}>A little more mindful.</T>
                <Icon name="sparkles" color="#D8F1A0" />
              </Row>
            </LinearGradient>
            <View style={a.float}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 12,
                  backgroundColor: c.mint,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Icon name="checkmark" size={20} />
              </View>
              <View>
                <T style={{ fontSize: 11, fontFamily: font.bold }}>You've got this!</T>
                <T muted style={{ fontSize: 10 }}>
                  One peso at a time.
                </T>
              </View>
            </View>
          </View>
          <View style={{ gap: 13 }}>
            <T
              style={{
                textAlign: 'center',
                color: c.green,
                fontFamily: font.bold,
                fontSize: 10,
                letterSpacing: 2,
              }}
            >
              SMALL HABITS. BIG POSSIBILITIES.
            </T>
            <T
              style={{
                fontFamily: font.extra,
                fontSize: 35,
                lineHeight: 44,
                textAlign: 'center',
                letterSpacing: -1.6,
              }}
            >
              Your baon,{'\n'}with a little more{' '}
              <T
                style={{
                  fontFamily: font.extra,
                  fontSize: 35,
                  lineHeight: 44,
                  color: c.green,
                }}
              >
                plan.
              </T>
            </T>
            <T
              muted
              style={{
                textAlign: 'center',
                fontSize: 14,
                lineHeight: 23,
                paddingHorizontal: 6,
              }}
            >
              From your first class to your next big goal.{'\n'}Make every peso work for the life
              you're building.
            </T>
          </View>
          <Row style={{ justifyContent: 'center', gap: 25 }}>
            {[
              ['leaf-outline', 'Spend mindfully'],
              ['shield-checkmark-outline', 'Save safely'],
            ].map(([icon, text]) => (
              <Row key={text} style={{ gap: 5 }}>
                <Icon name={icon as any} size={15} />
                <T style={{ fontSize: 10, fontFamily: font.semi }}>{text}</T>
              </Row>
            ))}
          </Row>
        </View>
        <View style={{ gap: 12 }}>
          <Button
            label="Let's get started"
            icon="arrow-forward"
            onPress={() => navigation.navigate('Register')}
          />
          <Button
            label="I already have an account"
            variant="secondary"
            onPress={() => navigation.navigate('Login')}
          />
          <Button
            label="Explore the demo"
            variant="ghost"
            loading={busy}
            onPress={async () => {
              setBusy(true);
              try {
                await enterDemo();
              } finally {
                setBusy(false);
              }
            }}
          />
        </View>
        <T muted style={{ fontSize: 10, textAlign: 'center' }}>
          Your money stays yours. Always.
        </T>
      </ScrollView>
    </SafeAreaView>
  );
}
export function AuthScreen({ navigation, route }: { navigation: any; route: any }) {
  const login = route.name === 'Login';
  const [role, setRole] = useState<Role>('student'),
    [name, setName] = useState(''),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState(''),
    [visible, setVisible] = useState(false),
    [accepted, setAccepted] = useState(false),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  async function submit() {
    setError(null);
    setMessage('');
    if (!supabase) {
      setError(
        'Your Supabase project key is not configured yet. Go back and choose Explore the demo.',
      );
      return;
    }
    if (!email.trim() || password.length < 8) {
      setError('Enter your email and a password with at least 8 characters.');
      return;
    }
    if (!login && (!name.trim() || password !== confirm || !accepted)) {
      setError(
        !name.trim()
          ? 'Please enter your name.'
          : password !== confirm
            ? 'Your passwords do not match.'
            : 'Please acknowledge the privacy note.',
      );
      return;
    }
    setBusy(true);
    try {
      if (login) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim(), role } },
        });
        if (error) throw error;
        if (!data.session)
          setMessage('Check your email to confirm your account, then sign in here.');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 25, gap: 22 }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" color={c.ink} />
          </Pressable>
          <View style={{ gap: 10, marginTop: 8 }}>
            <T
              style={{
                fontSize: 10,
                letterSpacing: 1.7,
                color: c.green,
                fontFamily: font.bold,
              }}
            >
              YOUR PONDO JOURNEY
            </T>
            <T
              style={{
                fontFamily: font.extra,
                fontSize: 29,
                lineHeight: 38,
                letterSpacing: -1,
              }}
            >
              {login ? 'Welcome back.' : 'Good habits start here.'}
            </T>
            <T muted>
              {login
                ? 'A fresh day to make every peso count.'
                : 'Let’s make room for the things that matter.'}
            </T>
          </View>
          {!login && (
            <>
              <T style={{ fontFamily: font.semi, fontSize: 12 }}>I’m joining as a</T>
              <Row style={{ gap: 12 }}>
                {(['student', 'parent'] as const).map((r) => (
                  <Pressable
                    key={r}
                    accessibilityRole="button"
                    accessibilityLabel={r === 'student' ? 'Student' : 'Parent or guardian'}
                    onPress={() => setRole(r)}
                    style={[
                      a.role,
                      role === r && {
                        borderColor: c.green,
                        backgroundColor: c.mint,
                      },
                    ]}
                  >
                    <Icon
                      name={r === 'student' ? 'school-outline' : 'people-outline'}
                      size={27}
                      color={role === r ? c.green : c.muted}
                    />
                    <T
                      style={{
                        fontFamily: font.bold,
                        fontSize: 14,
                        marginTop: 8,
                      }}
                    >
                      {r === 'student' ? 'Student' : 'Parent / guardian'}
                    </T>
                    <T muted style={{ fontSize: 10, lineHeight: 16 }}>
                      {r === 'student' ? 'My money, my milestones.' : 'Encourage their journey.'}
                    </T>
                  </Pressable>
                ))}
              </Row>
              <Field
                label="Full name"
                value={name}
                onChangeText={setName}
                placeholder="Juan Dela Cruz"
                autoComplete="name"
              />
            </>
          )}
          <Field
            label="Email address"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <View style={{ gap: 8 }}>
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              secureTextEntry={!visible}
              autoComplete={login ? 'current-password' : 'new-password'}
            />
            <Pressable accessibilityRole="button" onPress={() => setVisible(!visible)}>
              <T style={{ color: c.green, fontSize: 11 }}>
                {visible ? 'Hide password' : 'Show password'}
              </T>
            </Pressable>
          </View>
          {!login && (
            <>
              <Field
                label="Confirm password"
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Re-enter your password"
                secureTextEntry={!visible}
              />
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: accepted }}
                onPress={() => setAccepted(!accepted)}
                style={{ flexDirection: 'row', gap: 10 }}
              >
                <Icon name={accepted ? 'checkbox' : 'square-outline'} size={23} />
                <T muted style={{ flex: 1, fontSize: 11, lineHeight: 18 }}>
                  I understand that Pondo Hub records my financial activity. It does not hold or
                  transfer money. Sharing with a guardian is optional and can be revoked.
                </T>
              </Pressable>
            </>
          )}
          <ErrorText message={error} />
          {!!message && (
            <Card style={{ backgroundColor: c.mint }}>
              <T style={{ color: c.green }}>{message}</T>
            </Card>
          )}
          <Button
            label={login ? 'Sign in' : 'Create account'}
            loading={busy}
            onPress={submit}
            icon="arrow-forward"
          />
          <Button
            label={login ? 'New here? Create an account' : 'Already registered? Sign in'}
            variant="ghost"
            onPress={() => navigation.replace(login ? 'Register' : 'Login')}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const a = StyleSheet.create({
  logo: {
    width: 36,
    height: 38,
    borderRadius: 12,
    backgroundColor: c.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  art: { height: 250, alignItems: 'center', justifyContent: 'center' },
  orbit: {
    position: 'absolute',
    width: 255,
    height: 255,
    borderRadius: 140,
    backgroundColor: '#E4EEE7',
    borderWidth: 20,
    borderColor: '#EFF3EC',
  },
  wallet: {
    width: 260,
    height: 171,
    borderRadius: 23,
    padding: 23,
    transform: [{ rotate: '-7deg' }],
    boxShadow: '0px 18px 40px rgba(8, 95, 70, .14)',
  },
  float: {
    position: 'absolute',
    bottom: 6,
    right: 0,
    backgroundColor: 'white',
    padding: 13,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    boxShadow: '0px 6px 24px rgba(0, 0, 0, .05)',
    transform: [{ rotate: '4deg' }],
  },
  role: {
    flex: 1,
    padding: 17,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: c.line,
    gap: 5,
    backgroundColor: 'white',
  },
});
