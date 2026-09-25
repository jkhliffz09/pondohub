import React from 'react';
import {
  Text,
  View,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  type ViewStyle,
  type TextStyle,
  type TextInputProps,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { c, font } from '../theme';
import { useStore } from '../lib/store';
export type IconName = React.ComponentProps<typeof Ionicons>['name'];
export function Icon({
  name,
  size = 22,
  color = c.green,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <Ionicons name={name} size={size} color={color} />;
}
export function T({
  children,
  style,
  muted = false,
}: {
  children: React.ReactNode;
  style?: TextStyle | TextStyle[];
  muted?: boolean;
}) {
  return (
    <Text
      style={[
        {
          fontFamily: font.regular,
          color: muted ? c.muted : c.ink,
          fontSize: 14,
          lineHeight: 21,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Row({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10 }, style]}>{children}</View>
  );
}
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}
export function Badge({
  label,
  tone = 'green',
  icon,
}: {
  label: string;
  tone?: 'green' | 'purple' | 'amber' | 'red';
  icon?: IconName;
}) {
  const colors = {
    green: [c.mint, c.green],
    purple: [c.lavender, c.purple],
    amber: [c.amberTint, c.amber],
    red: [c.pink, c.red],
  }[tone];
  return (
    <Row
      style={{
        alignSelf: 'flex-start',
        backgroundColor: colors[0],
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        gap: 5,
      }}
    >
      {icon && <Icon name={icon} size={12} color={colors[1]} />}
      <T
        style={{
          fontSize: 10,
          fontFamily: font.bold,
          lineHeight: 14,
          color: colors[1],
        }}
      >
        {label}
      </T>
    </Row>
  );
}
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const color = variant === 'primary' ? 'white' : variant === 'danger' ? c.red : c.green;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.button,
        {
          backgroundColor:
            variant === 'primary'
              ? c.green
              : variant === 'secondary'
                ? c.mint
                : variant === 'danger'
                  ? c.pink
                  : 'transparent',
          opacity: disabled || loading ? 0.5 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <>
          {icon && <Icon name={icon} color={color} size={19} />}
          <T style={{ fontFamily: font.bold, color, fontSize: 14 }}>{label}</T>
        </>
      )}
    </Pressable>
  );
}
export function Field({
  label,
  hint,
  error,
  ...props
}: TextInputProps & { label?: string; hint?: string; error?: boolean }) {
  return (
    <View style={{ gap: 8 }}>
      {label && <T style={{ fontFamily: font.semi, fontSize: 12 }}>{label}</T>}
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#A0ABA5"
        {...props}
        style={[s.input, error && { borderColor: c.red }, props.style]}
      />
      {hint && (
        <T muted style={{ fontSize: 11 }}>
          {hint}
        </T>
      )}
    </View>
  );
}
export function Chip({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  icon?: IconName;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[s.chip, active && { backgroundColor: c.green, borderColor: c.green }]}
    >
      {icon && <Icon name={icon} size={15} color={active ? 'white' : c.muted} />}
      <T
        style={{
          fontFamily: font.semi,
          fontSize: 11,
          color: active ? 'white' : c.muted,
        }}
      >
        {label}
      </T>
    </Pressable>
  );
}
export function Section({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: 3 }}>
      <T style={{ fontSize: 17, fontFamily: font.bold }}>{title}</T>
      {action && (
        <Pressable accessibilityRole="button" onPress={onPress}>
          <T style={{ fontSize: 11, color: c.green, fontFamily: font.semi }}>{action} →</T>
        </Pressable>
      )}
    </Row>
  );
}
export function Progress({
  value,
  color = c.green,
  height = 6,
}: {
  value: number;
  color?: string;
  height?: number;
}) {
  return (
    <View
      style={{
        height,
        backgroundColor: c.line,
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          height: '100%',
          width: `${Math.max(0, Math.min(100, value))}%`,
          backgroundColor: color,
          borderRadius: 10,
        }}
      />
    </View>
  );
}
export function ErrorText({ message }: { message: string | null }) {
  return message ? (
    <View
      accessibilityRole="alert"
      style={{ padding: 13, backgroundColor: c.pink, borderRadius: 12 }}
    >
      <T style={{ color: c.red, fontSize: 12 }}>{message}</T>
    </View>
  ) : null;
}
export function Empty({
  icon = 'leaf-outline',
  title,
  description,
  action,
  onPress,
}: {
  icon?: IconName;
  title: string;
  description: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: 32, gap: 12 }}>
      <View style={s.iconBox}>
        <Icon name={icon} size={29} />
      </View>
      <T style={{ fontFamily: font.bold, fontSize: 17 }}>{title}</T>
      <T muted style={{ textAlign: 'center', fontSize: 12, maxWidth: 280 }}>
        {description}
      </T>
      {action && onPress && <Button label={action} onPress={onPress} variant="secondary" />}
    </Card>
  );
}
export function Page({
  children,
  title,
  subtitle,
  back = false,
  header = true,
  refresh = false,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  back?: boolean;
  header?: boolean;
  refresh?: boolean;
}) {
  const nav = useNavigation<any>();
  const store = useStore();
  const [refreshing, setRefreshing] = React.useState(false);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {header && (
          <View style={s.header}>
            {back ? (
              <Row>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                  onPress={() => nav.goBack()}
                  style={s.headerButton}
                >
                  <Icon name="arrow-back" color={c.ink} />
                </Pressable>
                <T style={{ fontFamily: font.bold, fontSize: 16 }}>{title}</T>
              </Row>
            ) : (
              <Row>
                <View style={s.logo}>
                  <Icon name="wallet" size={22} color="white" />
                </View>
                <View>
                  <T
                    style={{
                      fontFamily: font.extra,
                      fontSize: 18,
                      letterSpacing: -0.7,
                    }}
                  >
                    Pondo Hub<T style={{ color: c.green, fontSize: 22 }}>•</T>
                  </T>
                  <T muted style={{ fontSize: 9, lineHeight: 13, letterSpacing: 1.4 }}>
                    YOUR CAMPUS COMPANION
                  </T>
                </View>
              </Row>
            )}
            {!back && (
              <Row>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Notifications"
                  onPress={() => nav.navigate('Alerts')}
                  style={s.headerButton}
                >
                  <Icon name="notifications-outline" color={c.ink} size={21} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Profile"
                  onPress={() => nav.navigate('Tabs', { screen: 'Profile' })}
                  style={s.avatar}
                >
                  <T
                    style={{
                      fontFamily: font.bold,
                      fontSize: 12,
                      color: c.green,
                    }}
                  >
                    {store.data?.profile.name
                      .split(' ')
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join('') || 'PH'}
                  </T>
                </Pressable>
              </Row>
            )}
          </View>
        )}
        {store.demo && header && (
          <View style={s.demo}>
            <T style={{ fontSize: 10, color: c.purple, lineHeight: 16 }}>
              DEMO · Sample data stored on this device
            </T>
          </View>
        )}
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            refresh ? (
              <RefreshControl
                refreshing={refreshing}
                tintColor={c.green}
                onRefresh={async () => {
                  setRefreshing(true);
                  await store.refresh();
                  setRefreshing(false);
                }}
              />
            ) : undefined
          }
        >
          {title && !back && (
            <View style={{ gap: 4 }}>
              <T
                style={{
                  fontFamily: font.extra,
                  fontSize: 27,
                  lineHeight: 35,
                  letterSpacing: -1,
                }}
              >
                {title}
              </T>
              {subtitle && (
                <T muted style={{ fontSize: 12 }}>
                  {subtitle}
                </T>
              )}
            </View>
          )}
          {store.error && <ErrorText message={store.error} />}
          {children}
          <View style={{ height: 16 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export const s = StyleSheet.create({
  card: {
    backgroundColor: c.card,
    borderRadius: 21,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EDF0ED',
    gap: 14,
  },
  button: {
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 13,
    paddingHorizontal: 15,
    paddingVertical: 15,
    fontFamily: font.medium,
    fontSize: 14,
    color: c.ink,
    minHeight: 51,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: 'white',
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },
  iconBox: {
    height: 45,
    width: 45,
    borderRadius: 14,
    backgroundColor: c.mint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    height: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 23,
    backgroundColor: c.bg,
  },
  headerButton: {
    height: 38,
    width: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 13,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: c.line,
  },
  avatar: {
    height: 36,
    width: 36,
    borderRadius: 18,
    backgroundColor: '#DDEDE4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 37,
    height: 39,
    borderRadius: 12,
    backgroundColor: c.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 23,
    paddingTop: 13,
    paddingBottom: 24,
    gap: 21,
  },
  demo: {
    paddingVertical: 3,
    alignItems: 'center',
    backgroundColor: c.lavender,
  },
});
