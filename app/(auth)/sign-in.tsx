import { useSignIn } from '@clerk/clerk-expo';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { YStack, XStack, Input, Button, Text, H2, Card, Paragraph, Spinner } from 'tamagui';


export default function Page() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSignInPress = async () => {
    if (!isLoaded) return;

    setLoading(true);

    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      });

      if (signInAttempt.status === 'complete') {
        await setActive({
          session: signInAttempt.createdSessionId,
        });
        router.replace('/');
      } else {
        console.error(JSON.stringify(signInAttempt, null, 2));
        Alert.alert('Error', 'Unable to sign in. Please try again.');
      }
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      Alert.alert(
        'Sign In Failed',
        err?.errors?.[0]?.message || 'Invalid email or password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };


  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* @ts-expect-error - Tamagui v4 type issues */}
      <YStack flex={1} backgroundColor="$background" justifyContent="center" padding="$4">
        {/* @ts-expect-error - Tamagui v4 type issues */}
        <YStack maxWidth={400} width="100%" alignSelf="center" space="$4">
          {/* @ts-expect-error - Tamagui v4 type issues */}
          <YStack space="$2" marginBottom="$2">
            <H2 fontWeight="bold">
              Welcome Back
            </H2>
            <Paragraph opacity={0.7} size="$4">
              Sign in to your account to continue
            </Paragraph>
          </YStack>

          <Card elevate padding="$4" backgroundColor="$backgroundHover">
            <YStack space="$4">
              <YStack space="$2">
                <Text fontSize="$3" fontWeight="600">
                  Email
                </Text>
                <Input
                  autoCapitalize="none"
                  value={emailAddress}
                  placeholder="Enter your email"
                  onChangeText={setEmailAddress}
                  size="$4"
                  keyboardType="email-address"
                  autoComplete="email"
                />
              </YStack>

              <YStack space="$2">
                <Text fontSize="$3" fontWeight="600">
                  Password
                </Text>
                <Input
                  value={password}
                  placeholder="Enter your password"
                  secureTextEntry={true}
                  onChangeText={setPassword}
                  size="$4"
                  autoComplete="password"
                />
              </YStack>

              <Button
                onPress={onSignInPress}
                size="$4"
                themeInverse
                pressStyle={{ opacity: 0.8 }}
                disabled={loading || !emailAddress || !password}
                opacity={loading || !emailAddress || !password ? 0.5 : 1}
                icon={loading ? () => <Spinner /> : undefined}
              >
                <Text fontWeight="bold" fontSize="$5">
                  {loading ? 'Signing in...' : 'Sign In'}
                </Text>
              </Button>
            </YStack>
          </Card>

          {/* @ts-expect-error - Tamagui v4 type issues */}
          <XStack justifyContent="center" alignItems="center" space="$2">
            <Text opacity={0.7} fontSize="$3">
              Don't have an account?
            </Text>
            <Link href="/sign-up" asChild>
              <Button chromeless pressStyle={{ opacity: 0.7 }}>
                <Text fontWeight="600" fontSize="$3" color="$blue10">
                  Sign Up
                </Text>
              </Button>
            </Link>
          </XStack>
        </YStack>
      </YStack>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
