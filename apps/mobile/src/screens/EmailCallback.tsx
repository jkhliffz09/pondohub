import React, { useEffect, useState } from 'react';
import { Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';
import { Button, T, Icon } from '../components/ui';
import { useStore } from '../lib/store';
import { c, font } from '../theme';

export function EmailCallback({ navigation }: { navigation: any }) {
  const { data } = useStore();
  const url = Linking.useURL();
  const [status, setStatus] = useState('Checking your confirmation link…');
  useEffect(() => {
    if (!url) return;
    let active = true;
    async function verify() {
      const parsed = new URL(url!);
      const params = new URLSearchParams(parsed.hash.slice(1));
      if (Platform.OS === 'web') window.history.replaceState(null, '', '/auth/confirmed');
      if (params.has('error') || parsed.searchParams.has('error')) {
        setStatus(
          'This confirmation link has expired or is invalid. Try signing in if you already confirmed your email.',
        );
        return;
      }
      const token = params.get('access_token');
      if (!token || !supabase) {
        setStatus(
          'If you confirmed your email, you can now sign in. Otherwise, open the confirmation link in your email.',
        );
        return;
      }
      try {
        const { data, error } = await supabase.auth.getUser(token);
        if (active)
          setStatus(
            !error && data.user?.email_confirmed_at
              ? 'Your email is confirmed. Sign in to continue to Pondo Hub.'
              : 'We could not verify this link. Try signing in, or request a new confirmation email.',
          );
      } catch {
        if (active)
          setStatus('Could not check your confirmation. Check your connection and try signing in.');
      }
    }
    void verify();
    return () => {
      active = false;
    };
  }, [url]);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 28, gap: 24 }}
      >
        <Icon name="mail-outline" size={48} />
        <T style={{ fontFamily: font.extra, fontSize: 28 }}>Email confirmation</T>
        <T style={{ lineHeight: 24 }}>
          {status}
        </T>
        {Platform.OS === 'web' && /Android/i.test(navigator.userAgent) && (
          <Button
            label="Open Pondo Hub"
            onPress={() => {
              window.location.href =
                'intent://#Intent;scheme=pondohub;package=com.pondohub.app;S.browser_fallback_url=https%3A%2F%2Fpondohub.vercel.app%2Flogin;end';
            }}
          />
        )}
        <Button
          label={Platform.OS === 'web' ? 'Continue on website' : 'Go to sign in'}
          onPress={() => navigation.navigate(data ? 'Tabs' : 'Login')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
