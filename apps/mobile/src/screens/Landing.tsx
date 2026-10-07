import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Icon, T, Row, type IconName } from '../components/ui';
import { c, font } from '../theme';
import { useStore } from '../lib/store';
import { apiUrl } from '../lib/supabase';

const features: { icon: IconName; title: string; body: string; color: string }[] = [
  {
    icon: 'wallet-outline',
    title: 'Know where your baon goes.',
    body: 'Log your cash-in and everyday expenses. See what’s left before your next purchase.',
    color: c.mint,
  },
  {
    icon: 'flag-outline',
    title: 'Give your goals a head start.',
    body: 'A new laptop. Your next adventure. Set a target and save a little at a time.',
    color: c.lavender,
  },
  {
    icon: 'people-outline',
    title: 'A little support, on your terms.',
    body: 'Invite a parent or guardian and choose which money summaries you share.',
    color: c.amberTint,
  },
];

export function Landing({ navigation }: { navigation: any }) {
  const { data, enterDemo } = useStore();
  const wide = useWindowDimensions().width >= 800;
  const scroll = useRef<ScrollView>(null);
  const positions = useRef({ features: 0, download: 0 });
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [download, setDownload] = useState<{
    loading: boolean;
    url: string | null;
    failed: boolean;
  }>({ loading: true, url: null, failed: false });
  const [error, setError] = useState('');
  const loadDownload = async () => {
    setDownload({ loading: true, url: null, failed: false });
    try {
      const response = await fetch(`${apiUrl}/api/downloads/android`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error('Download unavailable');
      const result = await response.json();
      const url =
        result.available && typeof result.url === 'string' && result.url.startsWith('https://')
          ? result.url
          : null;
      setDownload({ loading: false, url, failed: false });
    } catch {
      setDownload({ loading: false, url: null, failed: true });
    }
  };
  useEffect(() => {
    void loadDownload();
  }, []);
  const go = (section: 'home' | 'features' | 'download') => {
    setMenu(false);
    scroll.current?.scrollTo({
      y: section === 'home' ? 0 : positions.current[section],
      animated: true,
    });
  };
  const login = () => {
    setMenu(false);
    navigation.navigate(data ? 'Tabs' : 'Login');
  };
  const downloadApk = async () => {
    if (!download.url) return;
    setError('');
    try {
      await Linking.openURL(download.url);
    } catch {
      setError('The download could not open. Please try again.');
    }
  };
  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <View style={[s.nav, { paddingHorizontal: wide ? 40 : 22 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pondo Hub home"
            onPress={() => go('home')}
          >
            <Row>
              <View style={s.logo}>
                <Icon name="wallet" color="white" size={22} />
              </View>
              <T style={s.brand}>
                pondo hub<T style={{ color: c.green }}>.</T>
              </T>
            </Row>
          </Pressable>
          {wide ? (
            <Row style={{ gap: 30 }}>
              {(['home', 'features', 'download'] as const).map((item) => (
                <Pressable key={item} accessibilityRole="button" onPress={() => go(item)}>
                  <T style={s.navText}>{item[0].toUpperCase() + item.slice(1)}</T>
                </Pressable>
              ))}
              <Button
                label={data ? 'Open dashboard' : 'Log in'}
                onPress={login}
                style={{ paddingHorizontal: 25 }}
              />
            </Row>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={menu ? 'Close menu' : 'Open menu'}
              accessibilityState={{ expanded: menu }}
              onPress={() => setMenu(!menu)}
              style={s.menuButton}
            >
              <Icon name={menu ? 'close' : 'menu'} size={26} color={c.ink} />
            </Pressable>
          )}
        </View>
        {!wide && menu && (
          <View style={s.mobileMenu}>
            {(['home', 'features', 'download'] as const).map((item) => (
              <Pressable
                key={item}
                accessibilityRole="button"
                onPress={() => go(item)}
                style={{ paddingVertical: 12 }}
              >
                <T style={s.navText}>{item[0].toUpperCase() + item.slice(1)}</T>
              </Pressable>
            ))}
            <Button label={data ? 'Open dashboard' : 'Log in'} onPress={login} />
          </View>
        )}
      </View>
      <ScrollView ref={scroll} contentContainerStyle={{ paddingBottom: 25 }}>
        <View
          style={[
            s.container,
            s.hero,
            {
              flexDirection: wide ? 'row' : 'column',
              paddingHorizontal: wide ? 40 : 24,
              paddingTop: wide ? 80 : 36,
            },
          ]}
        >
          <View style={{ flex: 1, gap: 24 }}>
            <Row style={s.pill}>
              <View style={s.dot} />
              <T style={s.eyebrow}>A LITTLE PLAN. A LOT OF POSSIBILITY.</T>
            </Row>
            <T
              style={{
                fontFamily: font.extra,
                fontSize: wide ? 64 : 43,
                lineHeight: wide ? 75 : 52,
                letterSpacing: -2.4,
              }}
            >
              Big dreams.{'\n'}Small habits.{'\n'}
              <T
                style={{
                  fontFamily: font.extra,
                  fontSize: wide ? 64 : 43,
                  lineHeight: wide ? 75 : 52,
                  color: c.green,
                }}
              >
                Your pondo.
              </T>
            </T>
            <T style={{ color: '#5B7168', fontSize: 16, lineHeight: 27, maxWidth: 445 }}>
              Make your baon last, build your savings, and feel a little more ready for tomorrow.
              Your money journey starts here.
            </T>
            <View
              style={{
                flexDirection: wide ? 'row' : 'column',
                gap: 12,
                alignItems: wide ? 'center' : 'stretch',
              }}
            >
              <Button
                label={data ? 'Open my dashboard' : 'Get started'}
                icon="arrow-forward"
                onPress={() => navigation.navigate(data ? 'Tabs' : 'Register')}
                style={{ paddingHorizontal: 26 }}
              />
              <Button
                label="Download APK"
                icon="logo-android"
                variant="secondary"
                onPress={() => go('download')}
                style={{ paddingHorizontal: 22 }}
              />
            </View>
            <Row style={{ gap: 8 }}>
              <Icon name="checkmark-circle" size={17} />
              <T muted style={{ fontSize: 12 }}>
                For students. With room for family.
              </T>
            </Row>
          </View>
          <View style={[s.art, { width: wide ? 425 : '100%', marginTop: wide ? 0 : 16 }]}>
            <View style={s.orbit} />
            <View style={s.preview}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T style={{ fontFamily: font.bold }}>A little progress, every day.</T>
                <Icon name="sunny-outline" color={c.amber} />
              </Row>
              <LinearGradient colors={['#108661', '#07563F']} style={s.wallet}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T style={{ color: '#CCE5D9', fontSize: 11 }}>YOUR AVAILABLE PONDO</T>
                  <Icon name="wallet-outline" color="#D8F1A0" />
                </Row>
                <T
                  style={{
                    fontFamily: font.extra,
                    fontSize: 39,
                    lineHeight: 55,
                    color: 'white',
                    marginTop: 15,
                  }}
                >
                  ₱1,250.00
                </T>
                <Row style={{ marginTop: 16, justifyContent: 'space-between' }}>
                  <T style={{ color: '#D2E8DF', fontSize: 11 }}>One peso at a time.</T>
                  <Icon name="sparkles" color={c.lime} size={18} />
                </Row>
              </LinearGradient>
              <Row style={{ gap: 12 }}>
                <View style={[s.mini, { backgroundColor: c.lavender }]}>
                  <Icon name="flag-outline" color={c.purple} />
                  <T style={s.smallLabel}>Saved for your goals</T>
                  <T style={s.smallAmount}>₱300.00</T>
                </View>
                <View style={[s.mini, { backgroundColor: c.mint }]}>
                  <Icon name="leaf-outline" />
                  <T style={s.smallLabel}>A mindful money habit</T>
                  <T style={s.smallAmount}>You’ve got this.</T>
                </View>
              </Row>
              <Row style={{ justifyContent: 'space-between', paddingTop: 3 }}>
                <T muted style={{ fontSize: 10 }}>
                  ILLUSTRATIVE PREVIEW
                </T>
                <Icon name="heart" color={c.red} size={15} />
              </Row>
            </View>
            <View style={s.sticker}>
              <Icon name="checkmark-circle" />
              <T style={{ fontFamily: font.bold, fontSize: 12 }}>Little wins add up.</T>
            </View>
          </View>
        </View>
        <View
          onLayout={(e) => {
            positions.current.features = e.nativeEvent.layout.y;
          }}
          style={[s.container, s.section, { paddingHorizontal: wide ? 40 : 24 }]}
        >
          <T style={s.eyebrow}>MORE CLARITY. LESS GUESSWORK.</T>
          <T style={[s.sectionTitle, { fontSize: wide ? 34 : 28 }]}>Make space for what matters.</T>
          <View style={{ flexDirection: wide ? 'row' : 'column', gap: 18, marginTop: 16 }}>
            {features.map((f) => (
              <View key={f.title} style={s.feature}>
                <View style={[s.featureIcon, { backgroundColor: f.color }]}>
                  <Icon name={f.icon} size={26} />
                </View>
                <T style={{ fontFamily: font.bold, fontSize: 18, lineHeight: 27 }}>{f.title}</T>
                <T muted style={{ lineHeight: 24 }}>
                  {f.body}
                </T>
              </View>
            ))}
          </View>
          <Button
            label="Take a look around — try the demo"
            variant="ghost"
            loading={busy}
            onPress={async () => {
              setBusy(true);
              setError('');
              try {
                await enterDemo();
              } catch {
                setError('The demo could not open. Please try again.');
              } finally {
                setBusy(false);
              }
            }}
            style={{ alignSelf: 'center', marginTop: 18 }}
          />
        </View>
        <View
          onLayout={(e) => {
            positions.current.download = e.nativeEvent.layout.y;
          }}
          style={[s.container, { paddingHorizontal: wide ? 40 : 24, paddingVertical: 30 }]}
        >
          <View
            style={[
              s.download,
              { flexDirection: wide ? 'row' : 'column', padding: wide ? 44 : 26 },
            ]}
          >
            <View style={{ flex: 1, gap: 15 }}>
              <Row>
                <Icon name="logo-android" color={c.lime} />
                <T
                  style={{ color: c.lime, fontFamily: font.bold, fontSize: 11, letterSpacing: 1.5 }}
                >
                  TAKE YOUR PONDO WITH YOU
                </T>
              </Row>
              <T
                style={{
                  fontFamily: font.extra,
                  fontSize: wide ? 34 : 28,
                  lineHeight: 42,
                  color: 'white',
                }}
              >
                Good habits. Now pocket-sized.
              </T>
              <T style={{ color: '#D0E5DB', lineHeight: 24, maxWidth: 500 }}>
                Use Pondo Hub in your browser or install the Android app. The same account keeps
                your money story together.
              </T>
              <T style={{ color: '#D0E5DB', fontSize: 12 }}>
                On iPhone? Use the web app while the iOS release is in preparation.
              </T>
            </View>
            <View style={{ width: wide ? 260 : '100%', gap: 12, justifyContent: 'center' }}>
              <Button
                label="Download Android APK"
                icon="download-outline"
                variant="secondary"
                disabled={!download.url}
                loading={download.loading}
                onPress={() => void downloadApk()}
              />
              <T style={{ color: '#D0E5DB', fontSize: 12, textAlign: 'center', lineHeight: 20 }}>
                {download.loading
                  ? 'Checking the Android release…'
                  : download.url
                    ? 'Android installer · Open the downloaded file to install.'
                    : download.failed
                      ? 'Unable to check the download. Please retry.'
                      : 'The Android installer is being prepared. Use the web app in the meantime.'}
              </T>
              {download.failed && (
                <Button
                  label="Check download again"
                  variant="secondary"
                  onPress={() => void loadDownload()}
                />
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Continue in browser or app"
                onPress={login}
                style={{ padding: 10 }}
              >
                <T style={{ color: 'white', textAlign: 'center', fontFamily: font.semi }}>
                  Continue with Pondo Hub →
                </T>
              </Pressable>
            </View>
          </View>
        </View>
        {!!error && <T style={{ color: c.red, textAlign: 'center', padding: 20 }}>{error}</T>}
        <View style={[s.container, s.footer, { flexDirection: wide ? 'row' : 'column' }]}>
          <T style={{ fontFamily: font.bold }}>pondo hub.</T>
          <T muted style={{ fontSize: 12 }}>
            Made for your everyday. Built for your next chapter.
          </T>
          <Pressable accessibilityRole="button" onPress={login}>
            <T style={{ color: c.green, fontFamily: font.semi }}>Log in →</T>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FBFCF8' },
  header: { backgroundColor: '#FBFCF8', borderBottomWidth: 1, borderColor: '#E7ECE2' },
  nav: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    minHeight: 88,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  logo: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: c.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brand: { fontFamily: font.extra, fontSize: 23, lineHeight: 30, letterSpacing: -1 },
  navText: { fontFamily: font.semi, fontSize: 13 },
  menuButton: { padding: 10 },
  mobileMenu: { paddingHorizontal: 24, paddingBottom: 20 },
  container: { width: '100%', maxWidth: 1200, alignSelf: 'center' },
  hero: { gap: 42, alignItems: 'center', paddingBottom: 55 },
  pill: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#EFF4E8',
    borderRadius: 20,
    gap: 7,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.green },
  eyebrow: { color: c.green, fontFamily: font.bold, fontSize: 10, letterSpacing: 1.2 },
  art: { minHeight: 410, justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 25 },
  orbit: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 200,
    backgroundColor: '#EDF1DF',
  },
  preview: {
    backgroundColor: 'white',
    borderRadius: 28,
    padding: 22,
    gap: 18,
    borderWidth: 1,
    borderColor: '#DFE8D9',
    transform: [{ rotate: '-3deg' }],
    boxShadow: '0 18px 40px rgba(15,65,41,.10)',
  },
  wallet: { borderRadius: 20, padding: 22 },
  mini: { flex: 1, padding: 13, borderRadius: 16, gap: 7 },
  smallLabel: { fontSize: 10, lineHeight: 15, color: '#5C6F64' },
  smallAmount: { fontFamily: font.bold, fontSize: 15 },
  sticker: {
    position: 'absolute',
    bottom: 0,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'white',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.line,
  },
  section: { paddingTop: 45, paddingBottom: 20, gap: 12 },
  sectionTitle: { fontFamily: font.extra, lineHeight: 43, letterSpacing: -1 },
  feature: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E7ECE2',
    borderRadius: 22,
    padding: 25,
    gap: 16,
  },
  featureIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  download: { borderRadius: 28, backgroundColor: '#0B513D', gap: 32 },
  footer: {
    paddingHorizontal: 30,
    paddingVertical: 30,
    gap: 18,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
