import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useAppFlow } from '@/stores/app-flow';

export default function IndexRedirect() {
  const router = useRouter();
  const { isBootstrapping, hasCompletedOnboarding } = useAppFlow();

  useEffect(() => {
    if (isBootstrapping) {
      return;
    }

    if (!hasCompletedOnboarding) {
      router.replace('/onboarding' as never);
      return;
    }

    router.replace('/(tabs)' as never);
  }, [hasCompletedOnboarding, isBootstrapping, router]);

  return null;
}
