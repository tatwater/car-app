import { useSignUp } from '@clerk/clerk-expo';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { YStack, XStack, Input, Button, Text, H2, Card, Paragraph, Spinner } from 'tamagui';


export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const onSignUpPress = async () => {
    if (!isLoaded) return;

    setLoading(true);

    try {
      await signUp.create({
        emailAddress,
        password,
      });
      await signUp.prepareEmailAddressVerification({
        strategy: 'email_code',
      });
      setPendingVerification(true);
      Alert.alert('Check Your Email', 'We sent you a verification code.');
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      Alert.alert(
        'Sign Up Failed',
        err?.errors?.[0]?.message || 'Unable to create account. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const onVerifyPress = async () => {
    if (!isLoaded) return;

    setLoading(true);

    try {
      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (signUpAttempt.status === 'complete') {
        await setActive({
          session: signUpAttempt.createdSessionId,
        });
        router.replace('/');
      } else {
        console.error(JSON.stringify(signUpAttempt, null, 2));
        Alert.alert('Error', 'Unable to verify. Please try again.');
      }
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      Alert.alert(
        'Verification Failed',
        err?.errors?.[0]?.message || 'Invalid code. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };


  if (pendingVerification) {
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
                Verify Your Email
              </H2>
              <Paragraph opacity={0.7} size="$4">
                Enter the verification code we sent to {emailAddress}
              </Paragraph>
            </YStack>

            <Card elevate padding="$4" backgroundColor="$backgroundHover">
              <YStack space="$4">
                <YStack space="$2">
                  <Text fontSize="$3" fontWeight="600">
                    Verification Code
                  </Text>
                  <Input
                    onChangeText={setCode}
                    placeholder="Enter 6-digit code"
                    value={code}
                    size="$4"
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </YStack>

                <Button
                  onPress={onVerifyPress}
                  size="$4"
                  themeInverse
                  pressStyle={{ opacity: 0.8 }}
                  disabled={loading || !code}
                  opacity={loading || !code ? 0.5 : 1}
                  icon={loading ? () => <Spinner /> : undefined}
                >
                  <Text fontWeight="bold" fontSize="$5">
                    {loading ? 'Verifying...' : 'Verify Email'}
                  </Text>
                </Button>
              </YStack>
            </Card>

            {/* @ts-expect-error - Tamagui v4 type issues */}
            <XStack justifyContent="center" alignItems="center" space="$2">
              <Text opacity={0.7} fontSize="$3">
                Didn't receive a code?
              </Text>
              <Button
                chromeless
                pressStyle={{ opacity: 0.7 }}
                onPress={onSignUpPress}
                disabled={loading}
              >
                <Text fontWeight="600" fontSize="$3" color="$blue10">
                  Resend
                </Text>
              </Button>
            </XStack>
          </YStack>
        </YStack>
      </KeyboardAvoidingView>
    );
  }

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
              Create Account
            </H2>
            <Paragraph opacity={0.7} size="$4">
              Sign up to get started with your car tracking
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
                  onChangeText={setEmailAddress}
                  placeholder="Enter your email"
                  value={emailAddress}
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
                  onChangeText={setPassword}
                  placeholder="Create a password"
                  secureTextEntry={true}
                  value={password}
                  size="$4"
                  autoComplete="password-new"
                />
                <Text opacity={0.6} fontSize="$2">
                  Must be at least 8 characters
                </Text>
              </YStack>

              <Button
                onPress={onSignUpPress}
                size="$4"
                themeInverse
                pressStyle={{ opacity: 0.8 }}
                disabled={loading || !emailAddress || !password}
                opacity={loading || !emailAddress || !password ? 0.5 : 1}
                icon={loading ? () => <Spinner /> : undefined}
              >
                <Text fontWeight="bold" fontSize="$5">
                  {loading ? 'Creating Account...' : 'Sign Up'}
                </Text>
              </Button>
            </YStack>
          </Card>

          {/* @ts-expect-error - Tamagui v4 type issues */}
          <XStack justifyContent="center" alignItems="center" space="$2">
            <Text opacity={0.7} fontSize="$3">
              Already have an account?
            </Text>
            <Link href="/sign-in" asChild>
              <Button chromeless pressStyle={{ opacity: 0.7 }}>
                <Text fontWeight="600" fontSize="$3" color="$blue10">
                  Sign In
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
