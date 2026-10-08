import React from 'react';
import { View, Platform } from 'react-native';
import {
  NavigationContainer,
  DefaultTheme,
  type LinkingOptions,
  type ParamListBase,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';
import { StoreProvider, useStore } from './src/lib/store';
import { Icon, T, Button, Card } from './src/components/ui';
import { c, font } from './src/theme';
import { Splash, AuthScreen, ConfirmEmail } from './src/screens/Auth';
import { Landing } from './src/screens/Landing';
import { Home } from './src/screens/Home';
import { MoneyForm, Afford } from './src/screens/Money';
import { Savings, CreateGoal, Contribute, GoalDetail, Withdraw } from './src/screens/Savings';
import { History, Insights, TransactionDetail } from './src/screens/Activity';
import { Sharing, Invitation, Guardian, Pair, Alerts } from './src/screens/Family';
import { Profile, Settings } from './src/screens/Profile';
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
function Tabs() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 10);
  const { data } = useStore();
  const parent = data?.profile.role === 'parent';
  return (
    <Tab.Navigator
      key={parent ? 'parent' : 'student'}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopColor: c.line,
          paddingTop: 8,
          height: 62 + bottomPadding,
          paddingBottom: bottomPadding,
        },
        tabBarActiveTintColor: c.green,
        tabBarInactiveTintColor: '#A0AAA4',
        tabBarLabelStyle: { fontFamily: font.semi, fontSize: 9, marginTop: 3 },
        tabBarIcon: ({ color, focused }) => (
          <View
            style={{
              width: 45,
              height: 28,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: focused ? c.mint : 'transparent',
            }}
          >
            <Icon
              name={
                (
                  {
                    Home: focused ? 'home' : 'home-outline',
                    History: 'receipt-outline',
                    Savings: 'flag-outline',
                    Insights: 'bar-chart-outline',
                    Profile: 'person-circle-outline',
                    Alerts: 'notifications-outline',
                  } as any
                )[route.name]
              }
              color={color}
              size={21}
            />
          </View>
        ),
      })}
    >
      <Tab.Screen name="Home" component={parent ? Guardian : Home} />
      {parent ? (
        <Tab.Screen name="Alerts" component={Alerts} />
      ) : (
        <>
          <Tab.Screen name="History" component={History} />
          <Tab.Screen name="Savings" component={Savings} />
          <Tab.Screen name="Insights" component={Insights} />
        </>
      )}
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  );
}
function Navigation() {
  const store = useStore();
  if (store.loading) return <Splash />;
  if (store.error && !store.data)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.bg,
          padding: 25,
          justifyContent: 'center',
        }}
      >
        <Card>
          <Icon name="cloud-offline-outline" size={35} />
          <T style={{ fontFamily: font.bold, fontSize: 21 }}>Let’s get you connected.</T>
          <T>{store.error}</T>
          <Button label="Try again" onPress={() => void store.refresh()} />
          <Button label="Sign out" variant="ghost" onPress={() => void store.signOut()} />
          <Button
            label="Explore the demo"
            variant="secondary"
            onPress={() => void store.enterDemo()}
          />
        </Card>
      </View>
    );
  return (
    <NavigationContainer
      key={store.data ? 'member' : 'public'}
      linking={
        {
          prefixes: ['pondohub://'],
          config: {
            screens: store.data
              ? {
                  Tabs: {
                    path: 'app',
                    screens: {
                      Home: '',
                      History: 'history',
                      Savings: 'savings',
                      Insights: 'insights',
                      Profile: 'profile',
                      Alerts: 'alerts',
                    },
                  },
                }
              : {
                  Welcome: '',
                  Login: 'login',
                  Register: 'register',
                  ConfirmEmail: 'confirm-email',
                },
          },
        } as LinkingOptions<ParamListBase>
      }
      theme={{
        ...DefaultTheme,
        colors: { ...DefaultTheme.colors, background: c.bg, primary: c.green },
      }}
    >
      <Stack.Navigator
        initialRouteName={store.data ? 'Tabs' : 'Welcome'}
        screenOptions={({ route }) => ({
          headerShown: false,
          contentStyle: {
            backgroundColor: c.bg,
            width: '100%',
            alignSelf: 'center',
            maxWidth: Platform.OS === 'web' && route.name !== 'Welcome' ? 480 : undefined,
          },
          animation: 'slide_from_right',
        })}
      >
        {store.data ? (
          <>
            <Stack.Screen name="Tabs" component={Tabs} />
            <Stack.Screen name="AddExpense" component={MoneyForm} />
            <Stack.Screen name="AddCashIn" component={MoneyForm} />
            <Stack.Screen name="Afford" component={Afford} />
            <Stack.Screen name="CreateGoal" component={CreateGoal} />
            <Stack.Screen name="Contribute" component={Contribute} />
            <Stack.Screen name="GoalDetail" component={GoalDetail} />
            <Stack.Screen name="Withdraw" component={Withdraw} />
            <Stack.Screen name="Transaction" component={TransactionDetail} />
            <Stack.Screen name="Sharing" component={Sharing} />
            <Stack.Screen name="Invitation" component={Invitation} />
            <Stack.Screen name="Pair" component={Pair} />
            <Stack.Screen name="Settings" component={Settings} />
            <Stack.Screen name="Alerts" component={Alerts} />
          </>
        ) : (
          <>
            <Stack.Screen name="Welcome" component={Landing} />
            <Stack.Screen name="Register" component={AuthScreen} />
            <Stack.Screen name="ConfirmEmail" component={ConfirmEmail} />
            <Stack.Screen name="Login" component={AuthScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
export default function App() {
  const [loaded, error] = useFonts({
    Jakarta: PlusJakartaSans_400Regular,
    JakartaMedium: PlusJakartaSans_500Medium,
    JakartaSemi: PlusJakartaSans_600SemiBold,
    JakartaBold: PlusJakartaSans_700Bold,
    JakartaExtra: PlusJakartaSans_800ExtraBold,
  });
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View
        style={{
          flex: 1,
          backgroundColor: Platform.OS === 'web' ? '#E9EEE9' : c.bg,
          alignItems: 'center',
        }}
      >
        <View
          style={{
            flex: 1,
            width: '100%',

            boxShadow: Platform.OS === 'web' ? '0 0 70px rgba(24, 47, 42, .07)' : undefined,
          }}
        >
          {!loaded && !error ? (
            <Splash />
          ) : (
            <StoreProvider>
              <Navigation />
            </StoreProvider>
          )}
        </View>
      </View>
    </SafeAreaProvider>
  );
}
