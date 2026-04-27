import type { Metadata } from 'next';
import { SocialClient } from '@/components/social/SocialClient';

export const metadata: Metadata = { title: 'Социальное — NutriPlan' };

export default function SocialPage() {
  return <SocialClient />;
}
