import * as Linking from 'expo-linking';

export function authRedirectUrl() {
  return Linking.createURL('auth/callback', { scheme: 'carpool' });
}
