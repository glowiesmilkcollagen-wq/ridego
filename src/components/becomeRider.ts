import { Alert, Linking } from 'react-native';

export const RIDER_APPLY_EMAIL = 'ridegopabiliapp@gmail.com';

/** The "Become a RideGo rider" pop-up, with a button that starts an email application. */
export function showBecomeRider() {
  Alert.alert(
    'Become a RideGo rider',
    `Riders use the separate RideGo Rider app to receive jobs, navigate and track earnings.\n\nTo apply, email us at ${RIDER_APPLY_EMAIL}.`,
    [
      { text: 'Close', style: 'cancel' },
      {
        text: 'Email us',
        onPress: () =>
          Linking.openURL(`mailto:${RIDER_APPLY_EMAIL}?subject=${encodeURIComponent('RideGo rider application')}`).catch(() =>
            Alert.alert('No email app found', `Please email us at ${RIDER_APPLY_EMAIL}.`),
          ),
      },
    ],
  );
}
